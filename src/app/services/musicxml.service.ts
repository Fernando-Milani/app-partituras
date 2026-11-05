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
          scale: 50,
            // Escala de renderização da partitura.
            // Controla o tamanho geral dos elementos musicais:
            // notas, pautas, claves, textos, compassos etc.
            // Valores maiores deixam a partitura maior.

            //pageWidth: 1800,
            pageWidth: 1500,
            // Largura da página de renderização, em unidades
            // utilizadas pela biblioteca (geralmente pixels ou unidades SVG).

            pageHeight: 2400,
            // Altura da página de renderização.
            // Define o espaço vertical disponível para a partitura.

            adjustPageWidth: false,

            adjustPageHeight: true,
            // Permite ajustar automaticamente a altura da página
            // conforme o conteúdo da partitura.
            // Evita espaços vazios excessivos ou cortes verticais.

            breaks: 'auto',
            // Define como as quebras de linha/sistema são organizadas.
            // 'auto' permite que a biblioteca escolha automaticamente
            // onde uma linha da partitura termina e a próxima começa.

            tieEndpointThickness: 0.08,
            // Espessura das extremidades das ligaduras de prolongação.
            // Controla a espessura nas pontas do arco.

            tieMidpointThickness: 0.35,
            // Espessura da região central das ligaduras de prolongação.
            // Controla o volume do arco em seu ponto mais espesso.

            slurEndpointThickness: 0.08,
            // Espessura das extremidades das ligaduras de expressão.
            // Controla a espessura nas pontas do arco.

            slurMidpointThickness: 0.35
            // Espessura da região central das ligaduras de expressão.
            // Controla o volume do arco em seu ponto mais espesso.


            //slurHeightFactor, // Altura da ligadura de expressão. Valores maiores deixam o arco mais achatado.
            //slurMinHeight, // Altura mínima da ligadura de expressão.
            //slurMaxHeight, // Altura máxima da ligadura de expressão.
            //slurCurveFactor, // Arredondamento da ligadura de expressão. Valores maiores deixam a curva mais arredondada.
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
