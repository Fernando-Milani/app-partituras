
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Song } from '../models/song.model';
import { LocalScoreService } from './local-score.service';

@Injectable({
  providedIn: 'root'
})
export class SongService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly localScoreService = inject(LocalScoreService);
  private readonly basePath = 'songs/';

  async getSongs(): Promise<Song[]> {
    if (!isPlatformBrowser(this.platformId)) {
      return [];
    }

    const response = await fetch(`${this.basePath}songs.json`);

    if (!response.ok) {
      throw new Error('Não foi possível carregar a biblioteca.');
    }

    const assetSongs = await response.json() as Song[];
    const localSongs = await this.localScoreService.getSongs();

    return [
      ...assetSongs.map(song => ({ ...song, source: 'asset' as const })),
      ...localSongs
    ];
  }

  async getSongFile(song: Song): Promise<ArrayBuffer> {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error(
        'Os arquivos de música devem ser carregados no navegador.'
      );
    }

    if (song.source === 'local') {
      return this.localScoreService.getSongFile(song.id);
    }

    const response = await fetch(`${this.basePath}${song.file}`);

    if (!response.ok) {
      throw new Error(`Não foi possível carregar ${song.title}.`);
    }

    return response.arrayBuffer();
  }
}
