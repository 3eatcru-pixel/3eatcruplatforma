import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EcosystemService } from '../../services/ecosystem.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-reports',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#140b06] text-stone-200 font-mono select-none overflow-hidden p-4 space-y-4">
      
      <!-- HEADER RELATÓRIOS -->
      <div class="flex items-center justify-between gap-3 bg-[#1c0d06] p-3 rounded-2xl border border-[#381c0c] shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
            <mat-icon class="text-xl">analytics</mat-icon>
          </div>
          <div>
            <h2 class="text-sm font-serif font-black text-white">Relatórios • Protótipo não integrado</h2>
            <p class="text-[10px] text-stone-400">Resumo demonstrativo dos pedidos pagos carregados da unidade atual.</p>
          </div>
        </div>
      </div>

      <!-- CARDS DE METRICAS KPI -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
        <div class="bg-[#1b0d06] border border-[#381c0c] rounded-2xl p-4 text-center">
          <span class="text-[10px] text-stone-500 uppercase block">Vendas pagas carregadas</span>
          <strong class="text-xl text-amber-400 font-black">
            R$ {{ totalSales().toFixed(2) }}
          </strong>
        </div>

        <div class="bg-[#1b0d06] border border-[#381c0c] rounded-2xl p-4 text-center">
          <span class="text-[10px] text-stone-500 uppercase block">Pedidos pagos carregados</span>
          <strong class="text-xl text-white font-black">
            {{ orders().length }}
          </strong>
        </div>

        <div class="bg-[#1b0d06] border border-[#381c0c] rounded-2xl p-4 text-center">
          <span class="text-[10px] text-stone-500 uppercase block">Ticket Médio</span>
          <strong class="text-xl text-emerald-400 font-black">
            R$ {{ averageTicket().toFixed(2) }}
          </strong>
        </div>
      </div>

      <!-- DISTRIBUIÇÃO POR CANAL -->
      <div class="flex-1 min-h-0 bg-[#180b04] border border-[#381c0c] rounded-2xl p-4 overflow-y-auto custom-scrollbar space-y-3">
        <h3 class="text-xs font-bold text-white uppercase flex items-center gap-2">
          <mat-icon class="text-amber-500 text-sm">pie_chart</mat-icon>
          Disponibilidade de Análise por Canal
        </h3>

        <div class="space-y-2 text-xs">
          <div class="bg-[#200e05] p-3 rounded-xl border border-[#381c0c] flex justify-between items-center">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-amber-500"></span>
              <strong class="text-white">PDV Frente de Caixa (Balcão)</strong>
            </div>
            <span class="text-stone-300 font-bold">Sem análise de canal</span>
          </div>

          <div class="bg-[#200e05] p-3 rounded-xl border border-[#381c0c] flex justify-between items-center">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
              <strong class="text-white">Marketplace Regional & Vitrine Online</strong>
            </div>
            <span class="text-stone-300 font-bold">Sem integração de canal</span>
          </div>

          <div class="bg-[#200e05] p-3 rounded-xl border border-[#381c0c] flex justify-between items-center">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-indigo-500"></span>
              <strong class="text-white">Salão & QR Code na Mesa</strong>
            </div>
            <span class="text-stone-300 font-bold">Sem integração de canal</span>
          </div>
        </div>
      </div>

    </div>
  `
})
export class EAppReportsWindow {
  readonly ecosystem = inject(EcosystemService);

  readonly orders = computed(() => {
    const tenantId = this.ecosystem.currentTenantId();
    if (!tenantId) return [];
    return this.ecosystem.orders().filter((order) =>
      order.tenantId === tenantId &&
      order.status === 'completed' &&
      (order.paymentStatus === 'approved' || order.isSimulated || order.mode === 'simulation')
    );
  });

  readonly totalSales = computed(() =>
    this.orders().reduce((s, o) => s + (o.total || 0), 0)
  );

  readonly averageTicket = computed(() => {
    const len = this.orders().length;
    return len > 0 ? this.totalSales() / len : 0;
  });
}
