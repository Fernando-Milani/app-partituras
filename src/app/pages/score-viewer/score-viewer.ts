import {
  Component,
  Input,
  OnInit,
  Output,
  EventEmitter,
  ChangeDetectorRef
} from '@angular/core';

import { Song } from '../../models/song.model';
import { SongService } from '../../services/song.service';
import { MusicXmlService } from '../../services/musicxml.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-score-viewer',
  standalone: true,
  templateUrl: './score-viewer.html',
  styleUrl: './score-viewer.css'
})
export class ScoreViewerComponent implements OnInit {

  @Input({ required: true }) song!: Song;

  @Output() back = new EventEmitter<void>();

  pages: SafeHtml[] = [];

  loading = true;
  error = '';

  constructor(
    private songService: SongService,
    private musicXmlService: MusicXmlService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.loadScore();
  }

  async loadScore() {
    try {
      this.loading = true;

      const file = await this.songService.getSongFile(this.song);

      const renderedPages =
        await this.musicXmlService.renderMusicXml(file);

      this.pages = renderedPages.map(svg =>
        this.sanitizer.bypassSecurityTrustHtml(svg)
      );

    } catch (error) {
      console.error(error);
      this.error = error instanceof Error
        ? error.message
        : 'Erro ao abrir a partitura.';
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }
}