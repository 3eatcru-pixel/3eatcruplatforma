import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { EcosystemService } from '../../services/ecosystem.service';
import { OrdersService } from '../../services/orders.service';

interface StoreCustomerSummary {
  id: string;
  name: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  lastVisit: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-crm',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#140b06] text-stone-200 font-mono overflow-hidden p-4 space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3 bg-[#1c0d06] p-3 rounded-2xl border border-[#381c0c] shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center"><mat-icon class="text-xl">loyalty</mat-icon></div>
          <div>
            <h2 class="text-sm font-serif font-black text-white">Clientes da unidade</h2>
            <p class="text-[10px] text-stone-400">Resumo agregado dos pedidos pagos recentes; pontos e campanhas não estão habilitados.</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <input aria-label="Buscar cliente" placeholder="Buscar nome ou telefone" [ngModel]="searchText()" (ngModelChange)="searchText.set($event)" class="rounded-lg bg-[#100803] border border-[#593017] px-3 py-2 text-xs text-white" />
          <button type="button" (click)="refresh()" [disabled]="isLoading() || !canViewCrm()" aria-label="Atualizar clientes" class="px-2.5 py-2 border border-[#593017] text-stone-300 rounded-xl disabled:opacity-50"><mat-icon class="!text-sm !h-4 !w-4">refresh</mat-icon></button>
        </div>
      </div>

      @if (!canViewCrm()) {
        <div class="flex-1 flex items-center justify-center p-8 text-center text-amber-300">A consulta de clientes está restrita ao proprietário ou operador da unidade.</div>
      } @else if (isLoading()) {
        <div class="flex-1 flex items-center justify-center text-stone-400">Carregando clientes…</div>
      } @else if (loadError()) {
        <div class="flex-1 flex flex-col items-center justify-center gap-2 text-center text-rose-300"><p>{{ loadError() }}</p><button type="button" (click)="refresh()" class="font-bold underline">Tentar novamente</button></div>
      } @else if (customers().length === 0) {
        <div class="flex-1 flex items-center justify-center p-8 text-center text-stone-500">Nenhum cliente identificado nos pedidos pagos recentes desta unidade.</div>
      } @else {
        <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar border border-[#381c0c] rounded-2xl bg-[#180b04]">
          <table class="w-full text-left text-xs font-mono">
            <thead class="bg-[#200e05] text-stone-400 border-b border-[#381c0c] sticky top-0"><tr><th class="p-3">Cliente</th><th class="p-3">Telefone</th><th class="p-3">Pedidos pagos</th><th class="p-3">Total pago</th><th class="p-3">Última compra</th></tr></thead>
            <tbody class="divide-y divide-[#2a1307]">
              @for (customer of customers(); track customer.id) {
                <tr class="hover:bg-[#200e05]/60"><td class="p-3 font-bold text-white">{{ customer.name }}</td><td class="p-3 text-stone-300">{{ customer.phone || 'Não informado' }}</td><td class="p-3 text-amber-300">{{ customer.totalOrders }}</td><td class="p-3 font-bold text-white">R$ {{ customer.totalSpent.toFixed(2) }}</td><td class="p-3 text-stone-400">{{ customer.lastVisit | date:'dd/MM/yyyy HH:mm' }}</td></tr>
              }
            </tbody>
          </table>
        </div>
        <p class="text-[10px] text-stone-500">Dados derivados dos {{ pageLimit }} pedidos mais recentes disponíveis. A tela não altera saldos, pontos de fidelidade ou campanhas.</p>
      }
    </div>
  `
})
export class EAppCrmWindow {
  readonly ecosystem = inject(EcosystemService);
  private readonly ordersService = inject(OrdersService);
  readonly pageLimit = 200;
  readonly isLoading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly searchText = signal('');
  private fetchGeneration = 0;

  readonly canViewCrm = computed(() => {
    const role = this.ecosystem.currentSession()?.role;
    return role === 'tenant_owner' || role === 'operator';
  });
  private readonly paidOrders = computed(() => {
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    if (!tenantId) return [];
    return this.ordersService.orders().filter((order) =>
      order.tenantId === tenantId && order.status === 'completed' && (
        order.paymentStatus === 'approved' ||
        (this.ecosystem.isSimulationMode() && (order.isSimulated || order.mode === 'simulation'))
      )
    );
  });
  readonly customers = computed(() => {
    const groups = new Map<string, StoreCustomerSummary>();
    for (const order of this.paidOrders()) {
      const name = String(order.customerName || '').trim();
      const phone = String(order.customerPhone || '').trim();
      if (!name && !phone && !order.customerId) continue;
      const normalizedPhone = phone.replace(/\D/g, '');
      const key = order.customerId || normalizedPhone || name.toLocaleLowerCase('pt-BR');
      const current = groups.get(key);
      if (current) {
        current.totalOrders += 1;
        current.totalSpent += order.total;
        if (order.createdAt > current.lastVisit) current.lastVisit = order.createdAt;
      } else {
        groups.set(key, {
          id: key,
          name: name || 'Cliente identificado',
          phone,
          totalOrders: 1,
          totalSpent: order.total,
          lastVisit: order.createdAt
        });
      }
    }

    const query = this.searchText().trim().toLocaleLowerCase('pt-BR');
    return [...groups.values()]
      .filter((customer) => !query || customer.name.toLocaleLowerCase('pt-BR').includes(query) || customer.phone.includes(query))
      .sort((a, b) => b.totalSpent - a.totalSpent);
  });

  constructor() {
    effect(() => {
      const tenantId = this.ecosystem.resolveOperationalTenantId();
      const allowed = this.canViewCrm();
      const generation = ++this.fetchGeneration;
      if (!allowed || !tenantId) {
        this.isLoading.set(false);
        this.loadError.set(tenantId ? null : 'Selecione uma unidade para consultar os clientes.');
        return;
      }
      void this.loadOrders(tenantId, generation);
    });
  }

  async refresh() {
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    if (!tenantId || !this.canViewCrm()) return;
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
