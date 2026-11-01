import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EcosystemService } from '../../services/ecosystem.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-hq-crm',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="space-y-4 animate-in fade-in duration-500">
       <div class="bg-[#faf7f0] border border-[#ded4c2] rounded-2xl p-5 shadow-xl text-stone-950">
          <div class="flex justify-between items-center mb-4">
             <h3 class="font-serif font-black text-sm uppercase text-amber-900">Diretório Unificado de Consumidores (CRM)</h3>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs font-sans">
              <thead>
                <tr class="text-[10px] font-mono font-bold uppercase text-stone-400 border-b border-[#e8dfce]">
                  <th class="p-3">NOME DO CONSUMIDOR</th>
                  <th class="p-3">CADASTRO</th>
                  <th class="p-3">VALOR GASTO (GMV)</th>
                  <th class="p-3">FREQUÊNCIA</th>
                  <th class="p-3 text-right">AUDITORIA</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#e8dfce]/50">
                @for (cons of ecosystem.consumerAccounts(); track cons.id) {
                  <tr class="hover:bg-[#f2e8d5]/40 transition-colors">
                    <td class="p-3">
                       <div class="font-bold text-stone-900">{{ cons.name }}</div>
                       <div class="text-[10px] text-stone-500 font-mono">{{ cons.email }}</div>
                    </td>
                    <td class="p-3 text-stone-500 font-mono">{{ cons.registeredAt }}</td>
                    <td class="p-3 font-bold text-emerald-800">R$ {{ cons.totalSpent.toFixed(2) }}</td>
                    <td class="p-3 text-stone-600">{{ cons.totalOrders }} pedidos</td>
                    <td class="p-3 text-right">
                       <button (click)="ecosystem.notify('Perfil auditado com sucesso.', 'info')" class="text-amber-800 font-bold hover:underline cursor-pointer">Auditar</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
       </div>
    </div>
  `
})
export class HqCrmComponent {
  readonly ecosystem = inject(EcosystemService);
}
