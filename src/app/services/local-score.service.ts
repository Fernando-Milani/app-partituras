import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Song } from '../models/song.model';

interface StoredScore {
  id: string;
  title: string;
  composer?: string;
  file: Blob;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class LocalScoreService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly databaseName = 'IBVGMusicLibrary';
  private readonly storeName = 'scores';

  private openDatabase(): Promise<IDBDatabase> {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.reject(
        new Error('O armazenamento local só está disponível no navegador.')
      );
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.databaseName, 1);

      request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(this.storeName)) {
          database.createObjectStore(this.storeName, {
            keyPath: 'id'
          });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getSongs(): Promise<Song[]> {
    const database = await this.openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(this.storeName, 'readonly');
      const request = transaction.objectStore(this.storeName).getAll();

      request.onsuccess = () => {
        const records = request.result as StoredScore[];

        resolve(records.map(record => ({
          id: record.id,
          title: record.title,
          composer: record.composer,
          file: record.id,
          source: 'local'
        })));
      };

      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => database.close();
    });
  }

  async saveSong(title: string, file: Blob): Promise<Song> {
    const database = await this.openDatabase();

    const record: StoredScore = {
      id: crypto.randomUUID(),
      title: title.trim(),
      file,
      createdAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(this.storeName, 'readwrite');
      transaction.objectStore(this.storeName).add(record);

      transaction.oncomplete = () => {
        database.close();

        resolve({
          id: record.id,
          title: record.title,
          file: record.id,
          source: 'local'
        });
      };

      transaction.onerror = () => {
        database.close();
        reject(transaction.error);
      };

      transaction.onabort = () => {
        database.close();
        reject(transaction.error);
      };
    });
  }

  async getSongFile(id: string): Promise<ArrayBuffer> {
    const database = await this.openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(this.storeName, 'readonly');
      const request = transaction.objectStore(this.storeName).get(id);

      request.onsuccess = async () => {
        const record = request.result as StoredScore | undefined;

        if (!record) {
          database.close();
          reject(new Error('Partitura não encontrada na biblioteca local.'));
          return;
        }

        try {
          resolve(await record.file.arrayBuffer());
        } catch (error) {
          reject(error);
        }
      };

      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => database.close();
    });
  }
}