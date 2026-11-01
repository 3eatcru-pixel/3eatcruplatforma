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
          <p class="text-[10px] text-stone-600 mb-3">Exibe até 100 perfis, sem paginação. GMV, frequência de pedidos e auditoria individual não são calculados por esta rota.</p>
          @if (ecosystem.consumerAccountsStatus() === 'loading' || ecosystem.consumerAccountsStatus() === 'idle') {
            <p class="text-xs text-stone-600 py-4">Carregando diretório do servidor...</p>
          } @else if (ecosystem.consumerAccountsStatus() === 'error') {
            <p role="alert" class="text-xs text-rose-800 py-4">Não foi possível carregar o diretório de consumidores.</p>
          } @else if (ecosystem.consumerAccounts().length === 0) {
            <p class="text-xs text-stone-600 py-4">Nenhum perfil retornado pelo servidor.</p>
          } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs font-sans">
              <thead>
                <tr class="text-[10px] font-mono font-bold uppercase text-stone-400 border-b border-[#e8dfce]">
                  <th class="p-3">NOME DO CONSUMIDOR</th>
                  <th class="p-3">CADASTRO</th>
                  <th class="p-3">GMV CALCULADO</th>
                  <th class="p-3">PEDIDOS CALCULADOS</th>
                  <th class="p-3 text-right">AUDITORIA INDIVIDUAL</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#e8dfce]/50">
                @for (cons of ecosystem.consumerAccounts(); track cons.id) {
                  <tr class="hover:bg-[#f2e8d5]/40 transition-colors">
                    <td class="p-3">
                       <div class="font-bold text-stone-900">{{ cons.name }}</div>
                       <div class="text-[10px] text-stone-500 font-mono">{{ cons.email }}</div>
                    </td>
                    <td class="p-3 text-stone-500 font-mono">{{ cons.registeredAt || 'Não informado' }}</td>
                    <td class="p-3 font-bold text-stone-600">{{ formatAmount(cons.totalSpent) }}</td>
                    <td class="p-3 text-stone-600">{{ formatCount(cons.totalOrders) }}</td>
                    <td class="p-3 text-right text-stone-500">Não disponível</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          }
       </div>
    </div>
  `
})
export class HqCrmComponent {
  readonly ecosystem = inject(EcosystemService);

  formatAmount(value: unknown): string {
    return typeof value === 'number' && Number.isFinite(value) ? `R$ ${value.toFixed(2)}` : 'Não calculado';
  }

  formatCount(value: unknown): string {
    return typeof value === 'number' && Number.isFinite(value) ? String(value) : 'Não calculado';
  }
}
