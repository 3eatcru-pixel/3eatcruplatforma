import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { GoogleDriveService, GoogleDriveFile } from '../../core/google-drive/google-drive.service';

@Component({
  selector: 'app-google-drive-picker-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div class="bg-[#170b04] border border-[#4d2813] rounded-3xl max-w-2xl w-full flex flex-col max-h-[85vh] shadow-2xl text-stone-200 overflow-hidden font-mono">
        
        <!-- Header -->
        <div class="p-4 border-b border-[#3d200f] flex items-center justify-between bg-[#1f1008] shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <mat-icon class="text-xl">cloud_sync</mat-icon>
            </div>
            <div>
              <h3 class="font-serif font-black text-white text-base">{{ title() }}</h3>
              <p class="text-[11px] text-stone-400">Selecione uma imagem salva no Google Drive da sua loja</p>
            </div>
          </div>

          <button
            type="button"
            (click)="closeRequest.emit()"
            class="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors">
            <mat-icon class="text-xl">close</mat-icon>
          </button>
        </div>

        <!-- Connection Bar -->
        <div class="px-4 py-2.5 bg-[#120803] border-b border-[#3d200f] flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div class="flex items-center gap-2">
            <span class="inline-block w-2.5 h-2.5 rounded-full" [class.bg-emerald-500]="drive.isConnected()" [class.bg-amber-500]="!drive.isConnected()"></span>
            <span class="text-stone-300">
              {{ drive.isConnected() ? 'Google Drive Conectado' : 'Modo Demonstração / Desconectado' }}
            </span>
          </div>

          <div class="flex items-center gap-2">
            @if (!drive.isConnected()) {
              <button
                type="button"
                (click)="drive.connectGoogleDrive()"
                [disabled]="drive.isConnecting()"
                class="bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold px-3 py-1 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer">
                <mat-icon class="text-sm">login</mat-icon>
                <span>{{ drive.isConnecting() ? 'Conectando...' : 'Conectar Drive' }}</span>
              </button>
            }

            <label class="bg-[#2b160b] hover:bg-[#3d200f] text-amber-300 border border-[#482814] px-3 py-1 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-all">
              <mat-icon class="text-sm">upload_file</mat-icon>
              <span>Fazer Upload</span>
              <input type="file" accept="image/*" class="hidden" (change)="onUpload($event)">
            </label>
          </div>
        </div>

        <!-- File Grid -->
        <div class="flex-1 overflow-y-auto p-4 space-y-3">
          @if (drive.isLoadingFiles()) {
            <div class="py-12 flex flex-col items-center justify-center text-stone-400 gap-2">
              <mat-icon class="animate-spin text-2xl text-amber-500">sync</mat-icon>
              <span class="text-xs">Buscando imagens no Google Drive...</span>
            </div>
          } @else if (drive.imageFiles().length === 0) {
            <div class="py-12 text-center text-stone-400 space-y-2">
              <mat-icon class="text-4xl text-stone-600">image_not_supported</mat-icon>
              <p class="text-xs">Nenhuma foto encontrada na pasta do Drive.</p>
              <p class="text-[10px] text-stone-500">Faça upload de fotos de produtos ou banners usando o botão acima.</p>
            </div>
          } @else {
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              @for (file of drive.imageFiles(); track file.id) {
                <button
                  type="button"
                  (click)="selectedFile.set(file)"
                  (dblclick)="confirmSelection(file)"
                  (keydown.enter)="confirmSelection(file)"
                  class="group relative border rounded-2xl p-2 cursor-pointer transition-all flex flex-col text-left outline-none focus:ring-2 focus:ring-amber-500"
                  [class.border-amber-500]="selectedFile()?.id === file.id"
                  [class.bg-[#24130a]]="selectedFile()?.id === file.id"
                  [class.border-[#3d200f]]="selectedFile()?.id !== file.id"
                  [class.bg-[#120803]]="selectedFile()?.id !== file.id"
                  [class.hover:border-amber-700]="selectedFile()?.id !== file.id">
                  
                  <div class="relative w-full aspect-square rounded-xl overflow-hidden bg-black/40 mb-2 flex items-center justify-center">
                    <img
                      [src]="file.thumbnailLink || file.webContentLink"
                      [alt]="file.name"
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      referrerpolicy="no-referrer">
                    
                    @if (selectedFile()?.id === file.id) {
                      <div class="absolute top-1.5 right-1.5 bg-amber-500 text-stone-950 rounded-full p-0.5 shadow-md">
                        <mat-icon class="text-sm block">check</mat-icon>
                      </div>
                    }
                  </div>

                  <span class="text-[11px] font-bold text-stone-200 truncate" [title]="file.name">{{ file.name }}</span>
                  <span class="text-[9px] text-stone-500">{{ file.size || 'Arquivo na Nuvem' }}</span>
                </button>
              }
            </div>
          }
        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-[#3d200f] bg-[#1a0c05] flex items-center justify-between gap-3 shrink-0 text-xs">
          <div class="text-[11px] text-stone-400 truncate">
            @if (selectedFile()) {
              <span>Selecionado: <strong class="text-amber-300">{{ selectedFile()?.name }}</strong></span>
            } @else {
              <span>Clique em uma foto para selecionar</span>
            }
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              (click)="closeRequest.emit()"
              class="px-4 py-2 rounded-xl border border-[#482814] text-stone-300 hover:bg-[#2b160b] transition-all">
              Cancelar
            </button>
            <button
              type="button"
              [disabled]="!selectedFile()"
              (click)="selectedFile() && confirmSelection(selectedFile()!)"
              class="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              Aplicar Imagem
            </button>
          </div>
        </div>

      </div>
    </div>
  `
})
export class GoogleDrivePickerModalComponent {
  public readonly drive = inject(GoogleDriveService);

  public readonly title = input<string>('Selecionar Imagem do Google Drive');
  public readonly closeRequest = output<void>();
  public readonly imageSelected = output<string>();

  public readonly selectedFile = signal<GoogleDriveFile | null>(null);

  public confirmSelection(file: GoogleDriveFile): void {
    const url = file.webContentLink || file.thumbnailLink || '';
    if (url) {
      this.imageSelected.emit(url);
    }
  }

  public async onUpload(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      const uploaded = await this.drive.uploadFile(file);
      this.selectedFile.set(uploaded);
    }
  }
}
