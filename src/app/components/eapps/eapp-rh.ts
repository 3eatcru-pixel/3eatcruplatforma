import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { HrService } from '../../services/hr.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-rh',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#140b06] text-stone-200 font-mono select-none overflow-hidden p-4 space-y-4">
      
      <!-- HEADER RH -->
      <div class="flex items-center justify-between gap-3 bg-[#1c0d06] p-3 rounded-2xl border border-[#381c0c] shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-500 flex items-center justify-center">
            <mat-icon class="text-xl">badge</mat-icon>
          </div>
          <div>
            <h2 class="text-sm font-serif font-black text-white">RH & Gestão de Pessoal</h2>
            <p class="text-[10px] text-stone-400">Quadro de colaboradores, turnos e escala de trabalho.</p>
          </div>
        </div>

        <button
          type="button"
          (click)="addMockEmployee()"
          class="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black text-xs uppercase rounded-xl cursor-pointer shadow flex items-center gap-1">
          <mat-icon class="text-sm">add</mat-icon>
          <span>Novo Colaborador</span>
        </button>
      </div>

      <!-- LISTA DE COLABORADORES -->
      <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar border border-[#381c0c] rounded-2xl bg-[#180b04]">
        <table class="w-full text-left text-xs font-mono">
          <thead class="bg-[#200e05] text-stone-400 border-b border-[#381c0c] sticky top-0">
            <tr>
              <th class="p-3">Nome</th>
              <th class="p-3">Cargo / Função</th>
              <th class="p-3">Turno</th>
              <th class="p-3">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#2a1307]">
            @for (emp of hr.employees(); track emp.id) {
              <tr class="hover:bg-[#200e05]/60 transition-colors">
                <td class="p-3 font-bold text-white">
                  {{ emp.name }}
                </td>
                <td class="p-3 text-stone-300">
                  {{ emp.role }}
                </td>
                <td class="p-3 text-stone-400 text-[11px]">
                  {{ emp.shift || 'Integral' }}
                </td>
                <td class="p-3">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-800">
                    {{ emp.status || 'Ativo' }}
                  </span>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

    </div>
  `
})
export class EAppRhWindow {
  readonly hr = inject(HrService);

  addMockEmployee() {
    this.hr.addEmployee({
      name: 'Colaborador #' + (this.hr.employees().length + 1),
      role: 'atendente',
      shift: 'noite',
      status: 'active'
    });
  }
}
