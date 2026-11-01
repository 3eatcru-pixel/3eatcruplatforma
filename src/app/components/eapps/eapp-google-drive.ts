import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

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
            <h2 class="text-sm font-serif font-black text-white">Google Drive • Protótipo local</h2>
            <p class="text-[10px] text-stone-400">Arquivos de exemplo; esta janela não consulta o Drive nem realiza backup.</p>
          </div>
        </div>

        <button
          type="button"
          disabled
          title="Backup não integrado"
          class="px-4 py-2 bg-stone-700 text-stone-300 font-black text-xs uppercase rounded-xl cursor-not-allowed shadow flex items-center gap-1.5 opacity-60">
          <mat-icon class="text-sm">cloud_off</mat-icon>
          <span>Backup indisponível</span>
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
              <th class="p-3">Origem</th>
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
                  Demonstração
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
  readonly driveFiles = [
    { name: 'DEMO_XML_Fiscal.zip', type: 'Exemplo de arquivo fiscal', size: '2.4 MB' },
    { name: 'DEMO_Relatorio_Mensal.pdf', type: 'Exemplo de relatório', size: '480 KB' },
    { name: 'DEMO_Inventario.xlsx', type: 'Exemplo de planilha', size: '1.1 MB' },
    { name: 'DEMO_Fila_Offline.json', type: 'Exemplo de arquivo local', size: '820 KB' }
  ];
}
