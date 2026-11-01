import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EcosystemService } from '../../services/ecosystem.service';
import { OrdersService } from '../../services/orders.service';
import { OrderTransaction } from '../../models/ecosystem.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-order-history',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#140b06] text-stone-200 font-mono overflow-hidden p-4 space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3 bg-[#1c0d06] p-3 rounded-2xl border border-[#381c0c] shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center"><mat-icon class="text-xl">history</mat-icon></div>
          <div>
            <h2 class="text-sm font-serif font-black text-white">Histórico de pedidos da unidade</h2>
            <p class="text-[10px] text-stone-400">Exibe os {{ pageLimit }} pedidos mais recentes disponíveis no servidor.</p>
          </div>
        </div>
        <button type="button" (click)="refresh()" [disabled]="isLoading() || !canViewHistory()" aria-label="Atualizar histórico" class="px-2.5 py-2 border border-[#593017] text-stone-300 rounded-xl disabled:opacity-50">
          <mat-icon class="!text-sm !h-4 !w-4">refresh</mat-icon>
        </button>
      </div>

      <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar border border-[#381c0c] rounded-2xl bg-[#180b04]">
        @if (!canViewHistory()) {
          <div class="h-full flex items-center justify-center p-8 text-center text-amber-300">O histórico está restrito ao proprietário ou operador da unidade.</div>
        } @else if (isLoading()) {
          <div class="h-full flex items-center justify-center p-8 text-stone-400">Carregando pedidos…</div>
        } @else if (loadError()) {
          <div class="h-full flex flex-col items-center justify-center gap-2 p-8 text-center text-rose-300">
            <p>{{ loadError() }}</p><button type="button" (click)="refresh()" class="font-bold underline">Tentar novamente</button>
          </div>
        } @else if (orders().length === 0) {
          <div class="h-full flex items-center justify-center p-8 text-center text-stone-500">Nenhum pedido encontrado para esta unidade.</div>
        } @else {
          <table class="w-full text-left text-xs font-mono">
            <thead class="bg-[#200e05] text-stone-400 border-b border-[#381c0c] sticky top-0">
              <tr><th class="p-3">Pedido</th><th class="p-3">Data / Hora</th><th class="p-3">Canal</th><th class="p-3">Cliente</th><th class="p-3">Situação</th><th class="p-3">Pagamento</th><th class="p-3 text-right">Total</th></tr>
            </thead>
            <tbody class="divide-y divide-[#2a1307]">
              @for (order of orders(); track order.id) {
                <tr class="hover:bg-[#200e05]/60">
                  <td class="p-3 font-bold text-amber-400">#{{ order.orderNumber || order.id.slice(-6) }}</td>
                  <td class="p-3 text-[10px] text-stone-400">{{ order.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                  <td class="p-3"><span class="px-2 py-0.5 rounded-lg bg-[#261207] text-[10px] uppercase border border-[#381c0c]">{{ order.channel || 'POS' }}</span></td>
                  <td class="p-3 text-white">{{ order.customerName || 'Cliente Balcão' }}</td>
                  <td class="p-3 text-stone-300">{{ statusLabel(order.status) }}</td>
                  <td class="p-3 text-stone-400">{{ paymentLabel(order.paymentStatus) }} · {{ order.paymentMethod }}</td>
                  <td class="p-3 text-right font-black text-white">R$ {{ order.total.toFixed(2) }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>
  `
})
export class EAppOrderHistoryWindow {
  readonly ecosystem = inject(EcosystemService);
  private readonly ordersService = inject(OrdersService);
  readonly pageLimit = 200;
  readonly isLoading = signal(false);
  readonly loadError = signal<string | null>(null);
  private fetchGeneration = 0;

  readonly canViewHistory = computed(() => {
    const role = this.ecosystem.currentSession()?.role;
    return role === 'tenant_owner' || role === 'operator';
  });
  readonly orders = computed(() => {
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    if (!tenantId) return [];
    return this.ordersService.orders()
      .filter((order) => order.tenantId === tenantId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, this.pageLimit);
  });

  constructor() {
    effect(() => {
      const tenantId = this.ecosystem.resolveOperationalTenantId();
      const allowed = this.canViewHistory();
      const generation = ++this.fetchGeneration;
      if (!allowed || !tenantId) {
        this.isLoading.set(false);
        this.loadError.set(tenantId ? null : 'Selecione uma unidade para consultar os pedidos.');
        return;
      }
      void this.loadOrders(tenantId, generation);
    });
  }

  async refresh() {
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    if (!tenantId || !this.canViewHistory()) return;
    await this.loadOrders(tenantId, ++this.fetchGeneration);
  }

  statusLabel(status: OrderTransaction['status']) {
    const labels: Record<OrderTransaction['status'], string> = {
      pending: 'Pendente', preparing: 'Preparando', ready: 'Pronto', dispatched: 'Despachado',
      completed: 'Concluído', cancelled: 'Cancelado', delivered: 'Entregue'
    };
    return labels[status] || status;
  }

  paymentLabel(status: OrderTransaction['paymentStatus']) {
    const labels: Record<NonNullable<OrderTransaction['paymentStatus']>, string> = {
      pending: 'Pendente', pending_pix: 'PIX pendente', approved: 'Aprovado',
      declined: 'Recusado', refunded: 'Estornado'
    };
    return status ? labels[status] : 'Sem confirmação';
  }

  private async loadOrders(tenantId: string, generation: number) {
    this.isLoading.set(true);
    this.loadError.set(null);
    try {
      await this.ordersService.fetchOrders(tenantId, this.pageLimit);
    } catch {
      if (generation === this.fetchGeneration) this.loadError.set('Não foi possível carregar o histórico desta unidade.');
    } finally {
      if (generation === this.fetchGeneration) this.isLoading.set(false);
    }
  }
}
