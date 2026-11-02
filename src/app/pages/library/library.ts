
import {
  Component,
  OnInit,
  Output,
  EventEmitter,
  ChangeDetectorRef
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { SongService } from '../../services/song.service';
import { Song } from '../../models/song.model';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './library.html',
  styleUrl: './library.css'
})
export class LibraryComponent implements OnInit {

  @Output() songSelected = new EventEmitter<Song>();

  songs: Song[] = [];
  filteredSongs: Song[] = [];

  search = '';
  loading = true;
  error = '';

  constructor(
    private songService: SongService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    try {
      this.songs = await this.songService.getSongs();
      this.filteredSongs = this.songs;
    } catch (error) {
      this.error = 'Não foi possível carregar as músicas.';
      console.error(error);
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  filterSongs() {
    const term = this.search.toLowerCase().trim();

    this.filteredSongs = this.songs.filter(song =>
      song.title.toLowerCase().includes(term) ||
      song.composer?.toLowerCase().includes(term)
    );

    this.cdr.markForCheck();
  }

  openSong(song: Song) {
    this.songSelected.emit(song);
  }
}
