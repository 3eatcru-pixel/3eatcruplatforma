import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EcosystemService } from '../../services/ecosystem.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-order-history',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#140b06] text-stone-200 font-mono select-none overflow-hidden p-4 space-y-4">
      
      <!-- HEADER HISTÓRICO -->
      <div class="flex items-center justify-between gap-3 bg-[#1c0d06] p-3 rounded-2xl border border-[#381c0c] shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
            <mat-icon class="text-xl">history</mat-icon>
          </div>
          <div>
            <h2 class="text-sm font-serif font-black text-white">Histórico • Protótipo fora do desktop</h2>
            <p class="text-[10px] text-stone-400">Mostra pedidos carregados da unidade ativa; não consulta o histórico completo.</p>
          </div>
        </div>
      </div>

      <!-- TABELA DE PEDIDOS -->
      <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar border border-[#381c0c] rounded-2xl bg-[#180b04]">
        <table class="w-full text-left text-xs font-mono">
          <thead class="bg-[#200e05] text-stone-400 border-b border-[#381c0c] sticky top-0">
            <tr>
              <th class="p-3">Pedido</th>
              <th class="p-3">Data / Hora</th>
              <th class="p-3">Canal</th>
              <th class="p-3">Cliente</th>
              <th class="p-3">Forma Pagto</th>
              <th class="p-3 text-right">Total (R$)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#2a1307]">
            @if (orders().length === 0) {
              <tr>
                <td colspan="6" class="p-8 text-center text-stone-500">Nenhum pedido da unidade está carregado nesta sessão.</td>
              </tr>
            } @else {
            @for (ord of orders(); track ord.id) {
              <tr class="hover:bg-[#200e05]/60 transition-colors">
                <td class="p-3 font-bold text-amber-400">
                  #{{ ord.id.slice(-6) }}
                </td>
                <td class="p-3 text-[10px] text-stone-400">
                  {{ ord.createdAt.slice(0, 10) }} {{ ord.createdAt.slice(11, 16) }}
                </td>
                <td class="p-3">
                  <span class="px-2 py-0.5 rounded-lg bg-[#261207] text-[10px] uppercase border border-[#381c0c] text-stone-300">
                    {{ ord.channel || 'POS' }}
                  </span>
                </td>
                <td class="p-3 text-white font-bold">
                  {{ ord.customerName || 'Cliente Balcão' }}
                </td>
                <td class="p-3 text-stone-300 uppercase text-[11px]">
                  {{ ord.paymentMethod || 'Não informado' }}
                </td>
                <td class="p-3 text-right font-black text-white">
                  R$ {{ ord.total.toFixed(2) }}
                </td>
              </tr>
            }
            }
          </tbody>
        </table>
      </div>

    </div>
  `
})
export class EAppOrderHistoryWindow {
  readonly ecosystem = inject(EcosystemService);

  readonly orders = computed(() => {
    const tenantId = this.ecosystem.currentTenantId();
    if (!tenantId) return [];
    return this.ecosystem.orders().filter((order) => order.tenantId === tenantId);
  });
}
