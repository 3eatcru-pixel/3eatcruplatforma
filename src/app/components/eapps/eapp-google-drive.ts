import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { GoogleDriveService } from '../../core/google-drive/google-drive.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-google-drive',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#140b06] text-stone-200 font-mono select-none overflow-hidden p-4 space-y-4">
      
      <!-- HEADER GOOGLE DRIVE STORE CLOUD -->
      <div class="flex items-center justify-between gap-3 bg-[#1c0d06] p-3 rounded-2xl border border-[#381c0c] shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
            <mat-icon class="text-xl">cloud_queue</mat-icon>
          </div>
          <div>
            <h2 class="text-sm font-serif font-black text-white">Google Drive • Backup na Nuvem</h2>
            <p class="text-[10px] text-stone-400">Armazenamento seguro de XMLs fiscais, relatórios DRE e contratos.</p>
          </div>
        </div>

        <button
          type="button"
          (click)="syncBackup()"
          [disabled]="isSyncing()"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase rounded-xl cursor-pointer shadow flex items-center gap-1.5 disabled:opacity-50">
          <mat-icon class="text-sm" [class.animate-spin]="isSyncing()">sync</mat-icon>
          <span>{{ isSyncing() ? 'Sincronizando...' : 'Fazer Backup Agora' }}</span>
        </button>
      </div>

      <!-- ARQUIVOS SINCRONIZADOS -->
      <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar border border-[#381c0c] rounded-2xl bg-[#180b04]">
        <table class="w-full text-left text-xs font-mono">
          <thead class="bg-[#200e05] text-stone-400 border-b border-[#381c0c] sticky top-0">
            <tr>
              <th class="p-3">Arquivo / Documento</th>
              <th class="p-3">Tipo</th>
              <th class="p-3">Tamanho</th>
              <th class="p-3">Última Sincronização</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#2a1307]">
            @for (file of driveFiles; track file.name) {
              <tr class="hover:bg-[#200e05]/60 transition-colors">
                <td class="p-3 font-bold text-white flex items-center gap-2">
                  <mat-icon class="text-amber-500 text-sm">insert_drive_file</mat-icon>
                  <span>{{ file.name }}</span>
                </td>
                <td class="p-3 text-stone-400">
                  {{ file.type }}
                </td>
                <td class="p-3 text-stone-300">
                  {{ file.size }}
                </td>
                <td class="p-3 text-stone-400 text-[11px]">
                  {{ file.updated }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

    </div>
  `
})
export class EAppGoogleDriveWindow {
  readonly driveService = inject(GoogleDriveService);
  readonly isSyncing = signal<boolean>(false);

  readonly driveFiles = [
    { name: 'XML_NFe_Consolidado_Outubro_2026.zip', type: 'Arquivo Fiscal XML', size: '2.4 MB', updated: 'Hoje às 04:00' },
    { name: 'DRE_Balancete_Mensal_Outubro.pdf', type: 'Relatório Contábil', size: '480 KB', updated: 'Ontem às 23:30' },
    { name: 'Inventario_Estoque_Auditoria_V7.xlsx', type: 'Planilha de Auditoria', size: '1.1 MB', updated: 'Ontem às 21:15' },
    { name: 'Backup_IndexedDB_Outbox_Local.json', type: 'Contingência Offline', size: '820 KB', updated: 'Hoje às 06:00' }
  ];

  syncBackup() {
    this.isSyncing.set(true);
    setTimeout(() => {
      this.isSyncing.set(false);
    }, 1200);
  }
}
