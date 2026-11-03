import { Injectable } from '@angular/core';
import createVerovioModule from 'verovio/wasm';
import { VerovioToolkit } from 'verovio/esm';

@Injectable({
  providedIn: 'root'
})
export class MusicXmlService {
  private toolkit: VerovioToolkit | null = null;
  private initialization: Promise<void> | null = null;

  private async initialize(): Promise<void> {
    if (this.toolkit) return;

    if (!this.initialization) {
      this.initialization = (async () => {
        console.log('[Verovio] Inicializando...');

        const module = await createVerovioModule();

        this.toolkit = new VerovioToolkit(module);


        this.toolkit.setOptions({ // Opções de exibição das partituras
          scale: 45,
          pageWidth: 1800,
          pageHeight: 2400,
          adjustPageHeight: true,
          breaks: 'auto',
          tieEndpointThickness: 0.08,
          tieMidpointThickness: 0.35
        });

        console.log('[Verovio] Inicializado com sucesso.');
      })();
    }

    try {
      await this.initialization;
    } catch (error) {
      this.initialization = null;
      throw error;
    }
  }

  async renderMusicXml(buffer: ArrayBuffer): Promise<string[]> {
    console.log('[MXL] Arquivo recebido:', buffer.byteLength, 'bytes');

    if (buffer.byteLength === 0) {
      throw new Error('O arquivo MXL está vazio.');
    }

    await this.initialize();

    if (!this.toolkit) {
      throw new Error('Verovio não foi inicializado.');
    }

    console.log('[MXL] Carregando arquivo compactado...');

    const loaded = this.toolkit.loadZipDataBuffer(buffer);

    if (!loaded) {
      throw new Error(
        'Verovio não conseguiu interpretar o arquivo MXL. Verifique se ele é um MusicXML compactado válido.'
      );
    }

    const pageCount = this.toolkit.getPageCount();

    console.log('[MXL] Páginas encontradas:', pageCount);

    if (pageCount === 0) {
      throw new Error('Nenhuma página foi encontrada na partitura.');
    }

    const pages: string[] = [];

    for (let page = 1; page <= pageCount; page++) {
      const svg = this.toolkit.renderToSVG(page);

      if (!svg) {
        throw new Error(`Não foi possível renderizar a página ${page}.`);
      }

      pages.push(svg);
      console.log(`[MXL] Página ${page} renderizada.`);
    }

    return pages;
  }
}
