import io
import os
import shutil
import subprocess
import tempfile
import zipfile

from pathlib import Path
from xml.etree import ElementTree

import fitz

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from starlette.concurrency import run_in_threadpool


app = FastAPI(title="IBVG OMR API")

# Desenvolvimento local. Depois adicionaremos o endereço publicado.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200",
        "http://127.0.0.1:4200",
    ],
    allow_credentials=False,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

MAX_FILE_SIZE = 20 * 1024 * 1024
MAX_PDF_PAGES = 30
PROCESS_TIMEOUT = 300

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
}


def get_homr_executable():
    executable = shutil.which("homr")

    if executable:
        return executable

    executable_name = "homr.exe" if os.name == "nt" else "homr"
    candidate = Path(os.sys.executable).parent / executable_name

    if candidate.exists():
        return str(candidate)

    raise RuntimeError(
        "HOMR não encontrado. Verifique se o ambiente virtual está ativo."
    )


def create_mxl(musicxml_path: Path) -> bytes:
    # Verifica se o resultado é um XML válido.
    try:
        ElementTree.parse(musicxml_path)
    except ElementTree.ParseError as error:
        raise RuntimeError("O HOMR gerou um MusicXML inválido.") from error

    container_xml = b"""<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0"
    xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
    <rootfiles>
        <rootfile full-path="score.musicxml"
            media-type="application/vnd.recordare.musicxml+xml"/>
    </rootfiles>
</container>
"""

    output = io.BytesIO()

    with zipfile.ZipFile(output, "w") as mxl:
        # O arquivo container.xml deve ser o primeiro e ficar sem compressão.
        mxl.writestr(
            "META-INF/container.xml",
            container_xml,
            compress_type=zipfile.ZIP_STORED,
        )

        mxl.write(
            musicxml_path,
            arcname="score.musicxml",
            compress_type=zipfile.ZIP_DEFLATED,
        )

    return output.getvalue()


def process_score(file_bytes: bytes, filename: str, content_type: str):
    with tempfile.TemporaryDirectory(prefix="ibvg_omr_") as temp:
        workdir = Path(temp)

        extension = Path(filename).suffix.lower()

        if content_type == "application/pdf" or extension == ".pdf":
            pdf_path = workdir / "input.pdf"
            pdf_path.write_bytes(file_bytes)

            try:
                document = fitz.open(pdf_path)
            except Exception as error:
                raise ValueError("Não foi possível abrir o PDF.") from error

            if document.page_count == 0:
                raise ValueError("O PDF não possui páginas.")

            if document.page_count > MAX_PDF_PAGES:
                raise ValueError(
                    f"O PDF pode ter no máximo {MAX_PDF_PAGES} páginas."
                )

            image_paths = []

            for index, page in enumerate(document):
                pixmap = page.get_pixmap(
                    matrix=fitz.Matrix(2, 2),
                    alpha=False,
                )

                image_path = workdir / f"page_{index + 1:03}.png"
                pixmap.save(image_path)
                image_paths.append(image_path)

            document.close()

        elif content_type in ALLOWED_IMAGE_TYPES:
            image_path = workdir / f"input{extension or '.png'}"
            image_path.write_bytes(file_bytes)
            image_paths = [image_path]

        else:
            raise ValueError("Formato não suportado. Envie JPG, PNG ou PDF.")

        command = [
            get_homr_executable(),
            *[str(path) for path in image_paths],
        ]

        try:
            result = subprocess.run(
                command,
                cwd=workdir,
                capture_output=True,
                text=True,
                timeout=PROCESS_TIMEOUT,
                check=False,
            )
        except subprocess.TimeoutExpired as error:
            raise TimeoutError(
                "A conversão demorou demais. Tente uma imagem menor."
            ) from error

        if result.returncode != 0:
            details = (result.stderr or result.stdout or "").strip()
            print("Erro HOMR:", details[-4000:])

            raise RuntimeError(
                "O HOMR não conseguiu reconhecer esta partitura."
            )

        musicxml_files = list(workdir.glob("*.musicxml"))

        if not musicxml_files:
            raise RuntimeError(
                "O HOMR terminou, mas não gerou um arquivo MusicXML."
            )

        # Em uma execução, esperamos um único resultado.
        musicxml_path = musicxml_files[0]

        return create_mxl(musicxml_path)


@app.get("/api/omr/health")
async def health():
    return {"status": "online", "service": "IBVG OMR"}


@app.post("/api/omr/convert")
async def convert(file: UploadFile = File(...)):
    filename = file.filename or "partitura"
    content_type = (file.content_type or "").lower()

    file_bytes = await file.read(MAX_FILE_SIZE + 1)

    if not file_bytes:
        raise HTTPException(status_code=400, detail="O arquivo está vazio.")

    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="O arquivo deve ter no máximo 20 MB.",
        )

    try:
        mxl_bytes = await run_in_threadpool(
            process_score,
            file_bytes,
            filename,
            content_type,
        )

    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))

    except TimeoutError as error:
        raise HTTPException(status_code=408, detail=str(error))

    except RuntimeError as error:
        raise HTTPException(status_code=422, detail=str(error))

    return StreamingResponse(
        io.BytesIO(mxl_bytes),
        media_type="application/vnd.recordare.musicxml",
        headers={
            "Content-Disposition": 'attachment; filename="partitura.mxl"'
        },
    )