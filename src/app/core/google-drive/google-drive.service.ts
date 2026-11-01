import { Injectable, inject, signal, computed } from '@angular/core';
import { FirebaseService } from '../firebase/firebase.service';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webContentLink?: string;
  webViewLink?: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  iconLink?: string;
}

export const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly'
];

@Injectable({
  providedIn: 'root'
})
export class GoogleDriveService {
  private readonly firebase = inject(FirebaseService);

  // In-memory token storage (Security Rule: never persist in localStorage/sessionStorage)
  private cachedAccessToken: string | null = null;

  public readonly isConnecting = signal<boolean>(false);
  public readonly isConnected = signal<boolean>(false);
  public readonly currentFolderId = signal<string>('root');
  public readonly files = signal<GoogleDriveFile[]>([]);
  public readonly isLoadingFiles = signal<boolean>(false);
  public readonly error = signal<string | null>(null);

  // Simulação / Fallback assets for instant demo and offline mode
  private readonly demoStoreFiles: GoogleDriveFile[] = [
    {
      id: 'gdrive-demo-logo-1',
      name: 'Logo_Hamburgueria_Gourmet_HD.png',
      mimeType: 'image/png',
      thumbnailLink: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=300&h=300&fit=crop',
      webContentLink: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&fit=crop',
      webViewLink: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&fit=crop',
      size: '2.4 MB',
      createdTime: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'gdrive-demo-banner-1',
      name: 'Banner_Vitrine_Promocao_FimDeSemana.jpg',
      mimeType: 'image/jpeg',
      thumbnailLink: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300&h=150&fit=crop',
      webContentLink: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&fit=crop',
      webViewLink: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&fit=crop',
      size: '4.8 MB',
      createdTime: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      id: 'gdrive-demo-product-1',
      name: 'Cardapio_Burger_Artesanal_Duplo.jpg',
      mimeType: 'image/jpeg',
      thumbnailLink: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=300&fit=crop',
      webContentLink: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&fit=crop',
      webViewLink: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&fit=crop',
      size: '1.9 MB',
      createdTime: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
    {
      id: 'gdrive-demo-product-2',
      name: 'Batata_Rustica_Cheddar_Bacon.jpg',
      mimeType: 'image/jpeg',
      thumbnailLink: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=300&h=300&fit=crop',
      webContentLink: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&fit=crop',
      webViewLink: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&fit=crop',
      size: '3.1 MB',
      createdTime: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: 'gdrive-demo-report-1',
      name: 'Backup_Fechamento_Caixa_NFe_2026-10.pdf',
      mimeType: 'application/pdf',
      webViewLink: '#',
      size: '840 KB',
      createdTime: new Date(Date.now() - 86400000 * 4).toISOString(),
    },
    {
      id: 'gdrive-demo-report-2',
      name: 'Relatorio_Auditoria_Estoque_ABC.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      webViewLink: '#',
      size: '1.1 MB',
      createdTime: new Date(Date.now() - 86400000 * 7).toISOString(),
    }
  ];

  public readonly imageFiles = computed(() => {
    return this.files().filter(f => f.mimeType.startsWith('image/'));
  });

  public readonly documentFiles = computed(() => {
    return this.files().filter(f => !f.mimeType.startsWith('image/'));
  });

  constructor() {
    // Populate initial files from demo repository
    this.files.set(this.demoStoreFiles);
  }

  public getAccessToken(): string | null {
    return this.cachedAccessToken;
  }

  public async connectGoogleDrive(): Promise<boolean> {
    this.isConnecting.set(true);
    this.error.set(null);
    this.isConnected.set(false);
    this.cachedAccessToken = null;

    try {
      if (!this.firebase.auth) {
        throw new Error('Firebase Authentication is unavailable.');
      }

      const provider = new GoogleAuthProvider();
      for (const scope of DRIVE_SCOPES) {
        provider.addScope(scope);
      }

      const result = await signInWithPopup(this.firebase.auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);

      if (!credential?.accessToken) {
        throw new Error('Google Drive did not return an access token.');
      }

      this.cachedAccessToken = credential.accessToken;
      await this.fetchFiles();
      if (this.error()) throw new Error('Google Drive files could not be loaded.');
      this.isConnected.set(true);
      return true;
    } catch {
      this.cachedAccessToken = null;
      this.isConnected.set(false);
      this.error.set('Não foi possível conectar ao Google Drive. Arquivos de demonstração continuam disponíveis.');
      this.files.set(this.demoStoreFiles);
      return false;
    } finally {
      this.isConnecting.set(false);
    }
  }

  public disconnectGoogleDrive(): void {
    this.cachedAccessToken = null;
    this.isConnected.set(false);
    this.error.set(null);
    this.files.set(this.demoStoreFiles);
  }

  public async fetchFiles(folderId = 'root', queryText?: string): Promise<GoogleDriveFile[]> {
    this.isLoadingFiles.set(true);
    this.error.set(null);

    try {
      if (!this.cachedAccessToken) {
        // Use local store files with query filter
        let result = [...this.demoStoreFiles];
        if (queryText) {
          const q = queryText.toLowerCase();
          result = result.filter(f => f.name.toLowerCase().includes(q));
        }
        this.files.set(result);
        return result;
      }

      let q = `'${folderId}' in parents and trashed = false`;
      if (queryText) {
        q += ` and name contains '${queryText}'`;
      }

      const url = `https://www.googleapis.com/drive/v3/files?pageSize=50&fields=files(id,name,mimeType,thumbnailLink,webContentLink,webViewLink,size,createdTime,modifiedTime,iconLink)&q=${encodeURIComponent(q)}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.cachedAccessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Drive API responded with ${response.status}`);
      }

      const data = await response.json();
      const driveList: GoogleDriveFile[] = (data.files || []).map((item: Record<string, unknown>) => ({
        id: String(item['id'] || ''),
        name: String(item['name'] || ''),
        mimeType: String(item['mimeType'] || ''),
        thumbnailLink: typeof item['thumbnailLink'] === 'string' ? item['thumbnailLink'] : undefined,
        webContentLink: typeof item['webContentLink'] === 'string' ? item['webContentLink'] : undefined,
        webViewLink: typeof item['webViewLink'] === 'string' ? item['webViewLink'] : undefined,
        size: item['size'] ? this.formatFileSize(Number(item['size'])) : undefined,
        createdTime: typeof item['createdTime'] === 'string' ? item['createdTime'] : undefined,
        modifiedTime: typeof item['modifiedTime'] === 'string' ? item['modifiedTime'] : undefined,
        iconLink: typeof item['iconLink'] === 'string' ? item['iconLink'] : undefined
      }));

      this.files.set(driveList);
      return driveList;
    } catch {
      this.error.set('Não foi possível carregar os arquivos do Google Drive.');
      if (this.cachedAccessToken) {
        this.cachedAccessToken = null;
        this.isConnected.set(false);
      }
      this.files.set(this.demoStoreFiles);
      return this.demoStoreFiles;
    } finally {
      this.isLoadingFiles.set(false);
    }
  }

  public async uploadFile(file: File, folderId = 'root'): Promise<GoogleDriveFile> {
    this.isLoadingFiles.set(true);
    this.error.set(null);

    try {
      if (!this.cachedAccessToken) {
        // Create local object URL / simulate upload
        const fakeId = `gdrive-local-${Date.now()}`;
        const localUrl = URL.createObjectURL(file);
        const newFile: GoogleDriveFile = {
          id: fakeId,
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          thumbnailLink: file.type.startsWith('image/') ? localUrl : undefined,
          webContentLink: localUrl,
          webViewLink: localUrl,
          size: this.formatFileSize(file.size),
          createdTime: new Date().toISOString()
        };

        this.files.update(current => [newFile, ...current]);
        return newFile;
      }

      const metadata = {
        name: file.name,
        parents: [folderId]
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', file);

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,thumbnailLink,webContentLink,webViewLink,size,createdTime', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.cachedAccessToken}`
        },
        body: form
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      const result = await response.json();
      const uploadedFile: GoogleDriveFile = {
        id: result.id,
        name: result.name,
        mimeType: result.mimeType,
        thumbnailLink: result.thumbnailLink,
        webContentLink: result.webContentLink,
        webViewLink: result.webViewLink,
        size: result.size ? this.formatFileSize(Number(result.size)) : this.formatFileSize(file.size),
        createdTime: result.createdTime || new Date().toISOString()
      };

      this.files.update(current => [uploadedFile, ...current]);
      return uploadedFile;
    } catch (err) {
      this.error.set('Não foi possível enviar o arquivo ao Google Drive.');
      throw err;
    } finally {
      this.isLoadingFiles.set(false);
    }
  }

  public async backupReportToDrive(reportTitle: string, data: unknown): Promise<GoogleDriveFile> {
    const filename = `Backup_${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
    const jsonBlob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const file = new File([jsonBlob], filename, { type: 'application/json' });
    return this.uploadFile(file);
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
}
