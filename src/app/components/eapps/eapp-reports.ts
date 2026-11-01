import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EcosystemService } from '../../services/ecosystem.service';
import { OrdersService } from '../../services/orders.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-reports',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#140b06] text-stone-200 font-mono overflow-hidden p-4 space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3 bg-[#1c0d06] p-3 rounded-2xl border border-[#381c0c] shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center"><mat-icon class="text-xl">analytics</mat-icon></div>
          <div>
            <h2 class="text-sm font-serif font-black text-white">Relatórios comerciais da unidade</h2>
            <p class="text-[10px] text-stone-400">Resumo dos {{ pageLimit }} pedidos mais recentes; não substitui DRE ou conciliação.</p>
          </div>
        </div>
        <button type="button" (click)="refresh()" [disabled]="isLoading() || !canViewReports()" aria-label="Atualizar relatórios" class="px-2.5 py-2 border border-[#593017] text-stone-300 rounded-xl disabled:opacity-50">
          <mat-icon class="!text-sm !h-4 !w-4">refresh</mat-icon>
        </button>
      </div>

      @if (!canViewReports()) {
        <div class="flex-1 flex items-center justify-center p-8 text-center text-amber-300">Relatórios estão restritos ao proprietário ou operador da unidade.</div>
      } @else if (isLoading()) {
        <div class="flex-1 flex items-center justify-center text-stone-400">Carregando relatórios…</div>
      } @else if (loadError()) {
        <div class="flex-1 flex flex-col items-center justify-center gap-2 text-center text-rose-300">
          <p>{{ loadError() }}</p><button type="button" (click)="refresh()" class="font-bold underline">Tentar novamente</button>
        </div>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
          <div class="bg-[#1b0d06] border border-[#381c0c] rounded-2xl p-4 text-center">
            <span class="text-[10px] text-stone-500 uppercase block">Vendas liquidadas carregadas</span>
            <strong class="text-xl text-amber-400 font-black">R$ {{ totalSales().toFixed(2) }}</strong>
          </div>
          <div class="bg-[#1b0d06] border border-[#381c0c] rounded-2xl p-4 text-center">
            <span class="text-[10px] text-stone-500 uppercase block">Pedidos liquidados</span>
            <strong class="text-xl text-white font-black">{{ paidOrders().length }}</strong>
          </div>
          <div class="bg-[#1b0d06] border border-[#381c0c] rounded-2xl p-4 text-center">
            <span class="text-[10px] text-stone-500 uppercase block">Ticket médio liquidado</span>
            <strong class="text-xl text-emerald-400 font-black">R$ {{ averageTicket().toFixed(2) }}</strong>
          </div>
        </div>

        <div class="flex-1 min-h-0 bg-[#180b04] border border-[#381c0c] rounded-2xl p-4 overflow-y-auto custom-scrollbar space-y-3">
          <h3 class="text-xs font-bold text-white uppercase flex items-center gap-2"><mat-icon class="text-amber-500 text-sm">pie_chart</mat-icon>Pedidos liquidados por canal</h3>
          @if (channelBreakdown().length === 0) {
            <p class="text-xs text-stone-500">Ainda não há pedidos liquidados entre os registros carregados.</p>
          } @else {
            @for (channel of channelBreakdown(); track channel.name) {
              <div class="bg-[#200e05] p-3 rounded-xl border border-[#381c0c] flex flex-wrap justify-between gap-2 items-center">
                <strong class="text-white text-xs">{{ channel.name }}</strong>
                <span class="text-stone-300 text-xs">{{ channel.count }} pedidos · R$ {{ channel.sales.toFixed(2) }}</span>
              </div>
            }
          }
          <p class="border-t border-[#381c0c] pt-3 text-[10px] text-stone-500">O servidor limita a consulta a {{ pageLimit }} pedidos recentes. Este resumo não calcula margem, impostos, comissão ou conciliação bancária.</p>
        </div>
      }
    </div>
  `
})
export class EAppReportsWindow {
  readonly ecosystem = inject(EcosystemService);
  private readonly ordersService = inject(OrdersService);
  readonly pageLimit = 200;
  readonly isLoading = signal(false);
  readonly loadError = signal<string | null>(null);
  private fetchGeneration = 0;

  readonly canViewReports = computed(() => {
    const role = this.ecosystem.currentSession()?.role;
    return role === 'tenant_owner' || role === 'operator';
  });
  private readonly tenantOrders = computed(() => {
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    if (!tenantId) return [];
    return this.ordersService.orders().filter((order) => order.tenantId === tenantId);
  });
  readonly paidOrders = computed(() => this.tenantOrders().filter((order) =>
    order.status === 'completed' && (
      order.paymentStatus === 'approved' ||
      (this.ecosystem.isSimulationMode() && (order.isSimulated || order.mode === 'simulation'))
    )
  ));
  readonly totalSales = computed(() => this.paidOrders().reduce((sum, order) => sum + order.total, 0));
  readonly averageTicket = computed(() => this.paidOrders().length
    ? this.totalSales() / this.paidOrders().length
    : 0
  );
  readonly channelBreakdown = computed(() => {
    const totals = new Map<string, { count: number; sales: number }>();
    for (const order of this.paidOrders()) {
      const name = order.channel || 'Sem canal';
      const value = totals.get(name) || { count: 0, sales: 0 };
      value.count += 1;
      value.sales += order.total;
      totals.set(name, value);
    }
    return [...totals.entries()]
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.sales - a.sales);
  });

  constructor() {
    effect(() => {
      const tenantId = this.ecosystem.resolveOperationalTenantId();
      const allowed = this.canViewReports();
      const generation = ++this.fetchGeneration;
      if (!allowed || !tenantId) {
        this.isLoading.set(false);
        this.loadError.set(tenantId ? null : 'Selecione uma unidade para consultar os relatórios.');
        return;
      }
      void this.loadOrders(tenantId, generation);
    });
  }

  async refresh() {
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    if (!tenantId || !this.canViewReports()) return;
    await this.loadOrders(tenantId, ++this.fetchGeneration);
  }

  private async loadOrders(tenantId: string, generation: number) {
    this.isLoading.set(true);
    this.loadError.set(null);
    try {
      await this.ordersService.fetchOrders(tenantId, this.pageLimit);
    } catch {
      if (generation === this.fetchGeneration) this.loadError.set('Não foi possível carregar os pedidos desta unidade.');
    } finally {
      if (generation === this.fetchGeneration) this.isLoading.set(false);
    }
  }
}
