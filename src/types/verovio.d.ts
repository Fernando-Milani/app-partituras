declare module 'verovio/wasm' {
  const createVerovioModule: () => Promise<any>;
  export default createVerovioModule;
}

declare module 'verovio/esm' {
  export class VerovioToolkit {
    constructor(module: any);
    setOptions(options: any): void;
    loadZipDataBuffer(buffer: ArrayBuffer): boolean;
    getPageCount(): number;
    renderToSVG(page: number): string;
  }
}