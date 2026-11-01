import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CrmService } from '../../services/crm.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-crm',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#140b06] text-stone-200 font-mono select-none overflow-hidden p-4 space-y-4">
      
      <!-- HEADER CRM & FIDELIDADE -->
      <div class="flex items-center justify-between gap-3 bg-[#1c0d06] p-3 rounded-2xl border border-[#381c0c] shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
            <mat-icon class="text-xl">loyalty</mat-icon>
          </div>
          <div>
            <h2 class="text-sm font-serif font-black text-white">Fidelidade & CRM de Clientes</h2>
            <p class="text-[10px] text-stone-400">Pontuação, cashback e relacionamento com clientes da loja.</p>
          </div>
        </div>

        <button
          type="button"
          (click)="addMockCustomer()"
          class="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black text-xs uppercase rounded-xl cursor-pointer shadow flex items-center gap-1">
          <mat-icon class="text-sm">person_add</mat-icon>
          <span>Novo Cliente</span>
        </button>
      </div>

      <!-- LISTA DE CLIENTES -->
      <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar border border-[#381c0c] rounded-2xl bg-[#180b04]">
        <table class="w-full text-left text-xs font-mono">
          <thead class="bg-[#200e05] text-stone-400 border-b border-[#381c0c] sticky top-0">
            <tr>
              <th class="p-3">Nome / CPF</th>
              <th class="p-3">Telefone</th>
              <th class="p-3">Pontos Fidelidade</th>
              <th class="p-3">Total Gasto</th>
              <th class="p-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#2a1307]">
            @for (c of crm.customers(); track c.id) {
              <tr class="hover:bg-[#200e05]/60 transition-colors">
                <td class="p-3">
                  <div class="font-bold text-white">{{ c.name }}</div>
                  <div class="text-[10px] text-stone-500">CPF: {{ c.cpf || 'Não informado' }}</div>
                </td>
                <td class="p-3 text-stone-300">
                  {{ c.phone }}
                </td>
                <td class="p-3">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                    {{ c.loyaltyPoints || 0 }} pts
                  </span>
                </td>
                <td class="p-3 font-bold text-white">
                  R$ {{ (c.totalSpent || 0).toFixed(2) }}
                </td>
                <td class="p-3 text-right">
                  <button
                    type="button"
                    (click)="addPoints(c.id, 50)"
                    class="px-2 py-1 bg-[#261207] hover:bg-[#381c0c] text-emerald-400 rounded-lg text-[10px] font-bold border border-[#482814] cursor-pointer">
                    +50 pts
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

    </div>
  `
})
export class EAppCrmWindow {
  readonly crm = inject(CrmService);

  addMockCustomer() {
    this.crm.customers.update(cur => [
      ...cur,
      {
        id: 'cust-' + Date.now(),
        name: 'Cliente Fidelidade #' + (cur.length + 1),
        email: 'cliente@exemplo.com',
        phone: '(11) 9' + Math.floor(Math.random() * 90000000 + 10000000),
        cpf: '123.456.789-00',
        loyaltyPoints: 100,
        totalSpent: 250.00
      }
    ]);
  }

  addPoints(id: string, delta: number) {
    this.crm.customers.update(cur => cur.map(c => c.id === id ? { ...c, loyaltyPoints: (c.loyaltyPoints || 0) + delta } : c));
  }
}
