
import { Component } from '@angular/core';

import { Song } from './models/song.model';
import { LibraryComponent } from './pages/library/library';
import { ScoreViewerComponent } from './pages/score-viewer/score-viewer';
import { ScanComponent } from './pages/scan/scan';

type Tab = 'library' | 'favorites' | 'scan' | 'settings';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    LibraryComponent,
    ScoreViewerComponent,
    ScanComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})



export class App {

  selectedSong: Song | null = null;
  activeTab: Tab = 'library';

  openSong(song: Song) {
    this.selectedSong = song;
  }

  backToLibrary() {
    this.selectedSong = null;
  }

  selectTab(tab: Tab) {
    this.activeTab = tab;
  }
}
