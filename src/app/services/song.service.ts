
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Song } from '../models/song.model';

@Injectable({
  providedIn: 'root'
})
export class SongService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly basePath = 'songs/';

  async getSongs(): Promise<Song[]> {
    if (!isPlatformBrowser(this.platformId)) {
      return [];
    }

    const response = await fetch(`${this.basePath}songs.json`);

    if (!response.ok) {
      throw new Error('Não foi possível carregar a biblioteca.');
    }

    return await response.json() as Song[];
  }

  async getSongFile(song: Song): Promise<ArrayBuffer> {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('Os arquivos de música devem ser carregados no navegador.');
    }

    const response = await fetch(`${this.basePath}${song.file}`);

    if (!response.ok) {
      throw new Error(`Não foi possível carregar ${song.title}.`);
    }

    return await response.arrayBuffer();
  }
}
