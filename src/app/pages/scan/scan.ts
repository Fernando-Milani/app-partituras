import {
  Component,
  ChangeDetectorRef,
  OnDestroy,
  Output,
  EventEmitter
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OmrService } from '../../services/omr.service';
import { LocalScoreService } from '../../services/local-score.service';

@Component({
  selector: 'app-scan',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './scan.html',
  styleUrl: './scan.css'
})
export class ScanComponent implements OnDestroy {
  @Output() songSaved = new EventEmitter<void>();

  selectedFile: File | null = null;
  previewUrl: string | null = null;
  convertedFile: Blob | null = null;

  title = '';
  loading = false;
  saving = false;
  error = '';
  success = '';

  constructor(
    private omrService: OmrService,
    private localScoreService: LocalScoreService,
    private cdr: ChangeDetectorRef
  ) {}

  openCamera(input: HTMLInputElement): void {
    input.click();
  }

  openFiles(input: HTMLInputElement): void {
    input.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    if (!isImage && !isPdf) {
      this.error = 'Selecione uma imagem ou um arquivo PDF.';
      input.value = '';
      return;
    }

    this.clearPreview();

    this.selectedFile = file;
    this.convertedFile = null;
    this.title = '';
    this.error = '';
    this.success = '';

    if (isImage) {
      this.previewUrl = URL.createObjectURL(file);
    }

    input.value = '';
  }

  async convert(): Promise<void> {
    if (!this.selectedFile || this.loading) return;

    this.loading = true;
    this.error = '';
    this.success = '';
    this.convertedFile = null;

    try {
      this.convertedFile = await this.omrService.convert(
        this.selectedFile
      );

      this.success = 'Partitura convertida! Agora escolha um nome.';
    } catch (error) {
      this.error = error instanceof Error
        ? error.message
        : 'Não foi possível converter a partitura.';
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  async save(): Promise<void> {
    const name = this.title.trim();

    if (!this.convertedFile || !name || this.saving) return;

    this.saving = true;
    this.error = '';

    try {
      await this.localScoreService.saveSong(name, this.convertedFile);

      this.success = 'Partitura adicionada à biblioteca!';
      this.songSaved.emit();

      this.selectedFile = null;
      this.convertedFile = null;
      this.title = '';
      this.clearPreview();
    } catch (error) {
      this.error = error instanceof Error
        ? error.message
        : 'Não foi possível salvar a partitura.';
    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }

  removeFile(): void {
    this.selectedFile = null;
    this.convertedFile = null;
    this.title = '';
    this.error = '';
    this.success = '';
    this.clearPreview();
  }

  private clearPreview(): void {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = null;
    }
  }

  ngOnDestroy(): void {
    this.clearPreview();
  }
}