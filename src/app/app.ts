import { Component } from '@angular/core';

import { Song } from './models/song.model';
import { LibraryComponent } from './pages/library/library';
import { ScoreViewerComponent } from './pages/score-viewer/score-viewer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    LibraryComponent,
    ScoreViewerComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {

  selectedSong: Song | null = null;

  openSong(song: Song) {
    this.selectedSong = song;
  }

  backToLibrary() {
    this.selectedSong = null;
  }
}