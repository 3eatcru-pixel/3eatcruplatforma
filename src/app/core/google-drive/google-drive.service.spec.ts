import { TestBed } from '@angular/core/testing';
import { GoogleDriveService } from './google-drive.service';
import { FirebaseService } from '../firebase/firebase.service';

describe('GoogleDriveService', () => {
  let service: GoogleDriveService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        GoogleDriveService,
        {
          provide: FirebaseService,
          useValue: {
            auth: null,
            isInitialized: () => false,
            currentUser: () => null
          }
        }
      ]
    });
    service = TestBed.inject(GoogleDriveService);
  });

  it('should be created and have initial files', () => {
    expect(service).toBeTruthy();
    expect(service.files().length).toBeGreaterThan(0);
  });

  it('should correctly filter image files and document files', () => {
    const images = service.imageFiles();
    const docs = service.documentFiles();

    expect(images.length).toBeGreaterThan(0);
    expect(docs.length).toBeGreaterThan(0);
    expect(images.every(img => img.mimeType.startsWith('image/'))).toBe(true);
    expect(docs.every(doc => !doc.mimeType.startsWith('image/'))).toBe(true);
  });

  it('should start with cached access token as null for security', () => {
    expect(service.getAccessToken()).toBeNull();
    expect(service.isConnected()).toBe(false);
  });

  it('should allow disconnecting and resetting files state', () => {
    service.disconnectGoogleDrive();
    expect(service.isConnected()).toBe(false);
    expect(service.getAccessToken()).toBeNull();
  });

  it('should upload a file and update the files signal', async () => {
    const initialCount = service.files().length;
    const blob = new Blob(['test content'], { type: 'text/plain' });
    const file = new File([blob], 'test_backup.txt', { type: 'text/plain' });

    const uploaded = await service.uploadFile(file);
    expect(uploaded.name).toBe('test_backup.txt');
    expect(service.files().length).toBe(initialCount + 1);
  });

  it('should generate a backup file and add to Drive', async () => {
    const initialCount = service.files().length;
    const reportData = { revenue: 5000, ordersCount: 42 };

    const backup = await service.backupReportToDrive('Vendas_Outubro', reportData);
    expect(backup.name).toContain('Backup_Vendas_Outubro_');
    expect(service.files().length).toBe(initialCount + 1);
  });
});
