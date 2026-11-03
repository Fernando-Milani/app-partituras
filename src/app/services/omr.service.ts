import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class OmrService {
  // Endereço provisório. Substituiremos pelo endereço real do servidor.
  private readonly endpoint = '/api/omr/convert';

  async convert(file: File): Promise<Blob> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(this.endpoint, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const message = await response.text();

      throw new Error(
        message || `Falha na conversão OMR (${response.status}).`
      );
    }

    const result = await response.blob();

    if (result.size === 0) {
      throw new Error('O serviço OMR retornou um arquivo vazio.');
    }

    // MXL é um arquivo ZIP. Verificamos sua assinatura.
    const header = new Uint8Array(await result.slice(0, 2).arrayBuffer());

    if (header[0] !== 0x50 || header[1] !== 0x4B) {
      throw new Error(
        'O resultado recebido não parece ser um arquivo MXL válido.'
      );
    }

    return result;
  }
}