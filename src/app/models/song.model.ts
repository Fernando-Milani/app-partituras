export interface Song {
  id: string;
  title: string;
  composer?: string;
  file: string;
  source?: 'asset' | 'local';
}