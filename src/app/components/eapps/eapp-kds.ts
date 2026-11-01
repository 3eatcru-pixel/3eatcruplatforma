import { ChangeDetectionStrategy, Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EcosystemService } from '../../services/ecosystem.service';
import { OrderTransaction } from '../../models/ecosystem.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-kds',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#0b0806] text-stone-200 font-mono select-none overflow-hidden p-4 space-y-4">
      
      <!-- HEADER KDS -->
      <div class="flex flex-wrap items-center justify-between gap-3 bg-[#180d06] p-3 rounded-2xl border border-[#381c0c] shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
            <mat-icon class="text-xl">soup_kitchen</mat-icon>
          </div>
          <div>
            <h2 class="text-sm font-serif font-black text-white">KDS • Tela da Cozinha</h2>
            <p class="text-[10px] text-stone-400">Pedidos da unidade em tempo real; somente proprietário e operador alteram o preparo.</p>
          </div>
        </div>

        <!-- FILTROS DE ESTADO -->
        <div class="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            (click)="selectedStatus.set('all')"
            [class]="selectedStatus() === 'all' ? 'bg-amber-600 text-stone-950 font-black' : 'bg-[#241107] text-stone-400'"
            class="px-2.5 py-1 rounded-xl cursor-pointer">
            Todos ({{ activeOrders().length }})
          </button>
          <button
            type="button"
            (click)="selectedStatus.set('pending')"
            [class]="selectedStatus() === 'pending' ? 'bg-amber-600 text-stone-950 font-black' : 'bg-[#241107] text-stone-400'"
            class="px-2.5 py-1 rounded-xl cursor-pointer">
            Pendente
          </button>
          <button
            type="button"
            (click)="selectedStatus.set('preparing')"
            [class]="selectedStatus() === 'preparing' ? 'bg-amber-600 text-stone-950 font-black' : 'bg-[#241107] text-stone-400'"
            class="px-2.5 py-1 rounded-xl cursor-pointer">
            Preparo
          </button>
          <button
            type="button"
            (click)="selectedStatus.set('ready')"
            [class]="selectedStatus() === 'ready' ? 'bg-amber-600 text-stone-950 font-black' : 'bg-[#241107] text-stone-400'"
            class="px-2.5 py-1 rounded-xl cursor-pointer">
            Pronto
          </button>
          <button
            type="button"
            (click)="refreshOrders()"
            [disabled]="isLoading()"
            aria-label="Atualizar pedidos"
            class="px-2.5 py-1 rounded-xl border border-[#593017] text-stone-300 disabled:opacity-50">
            <mat-icon class="!text-sm !h-4 !w-4">refresh</mat-icon>
          </button>
        </div>
      </div>

      <!-- TÍQUETES KDS -->
      <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        @if (isLoading()) {
          <div class="h-full flex items-center justify-center text-sm text-stone-400">Carregando pedidos da unidade…</div>
        } @else if (loadError()) {
          <div class="h-full flex flex-col items-center justify-center gap-3 text-center text-rose-300">
            <p>{{ loadError() }}</p>
            <button type="button" (click)="refreshOrders()" class="font-bold underline">Tentar novamente</button>
          </div>
        } @else if (filteredOrders().length === 0) {
          <div class="h-full flex flex-col items-center justify-center text-center p-8 space-y-2 text-stone-600">
            <mat-icon class="text-5xl text-stone-700">check_circle_outline</mat-icon>
            <p class="text-sm font-bold text-stone-400">Nenhum pedido ativo</p>
            <p class="text-xs text-stone-600">A fila desta unidade está vazia para o filtro selecionado.</p>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            @for (order of filteredOrders(); track order.id) {
              <div
                [class]="ticketBorderClass(order.status)"
                class="bg-[#180c05] border-2 rounded-2xl p-3 flex flex-col justify-between shadow-xl space-y-3">
                
                <!-- TICKET HEADER -->
                <div class="flex items-start justify-between border-b border-[#381c0c] pb-2">
                  <div>
                    <div class="flex items-center gap-1.5">
                      <span class="text-xs font-black text-white">#{{ order.id.slice(-6) }}</span>
                      <span class="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-[#281307] text-amber-300">
                        {{ order.channel || 'Balcão' }}
                      </span>
                    </div>
                    <span class="text-[10px] text-stone-400 block mt-0.5">
                      {{ order.customerName || 'Cliente Balcão' }}
                    </span>
                  </div>

                  <span
                    [class]="ticketBadgeClass(order.status)"
                    class="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border">
                    {{ order.status }}
                  </span>
                </div>

                <!-- LISTA DE ITENS DO PEDIDO -->
                <div class="space-y-1.5 flex-1 min-h-0 overflow-y-auto max-h-40 custom-scrollbar text-xs">
                  @for (item of order.items; track item.product.id) {
                    <div class="flex items-start justify-between gap-2 p-1 rounded bg-[#200e05]">
                      <div class="font-bold text-stone-200">
                        <span class="text-amber-400 mr-1">{{ item.quantity }}x</span>
                        <span>{{ item.product.name }}</span>
                        @if (item.notes) {
                          <div class="text-[10px] text-rose-400 italic font-normal">
                            Obs: {{ item.notes }}
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>

                <!-- CONTROLE DE ETAPAS -->
                <div class="border-t border-[#381c0c] pt-2 flex items-center justify-between gap-2">
                  <span class="text-[10px] text-stone-500 font-mono">
                    {{ formatOrderTime(order.createdAt) }}
                  </span>

                  <div class="flex items-center gap-1">
                    @if (!canManageOrders()) {
                      <span class="text-[10px] text-stone-500">Consulta; status alterado por gerente/operador</span>
                    } @else if (order.status === 'pending') {
                      <button
                        type="button"
                        (click)="advanceStatus(order, 'preparing')"
                        [disabled]="isUpdating(order.id)"
                        class="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                        {{ isUpdating(order.id) ? 'Salvando…' : 'Iniciar Preparo' }}
                      </button>
                    } @else if (order.status === 'preparing') {
                      <button
                        type="button"
                        (click)="advanceStatus(order, 'ready')"
                        [disabled]="isUpdating(order.id)"
                        class="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                        {{ isUpdating(order.id) ? 'Salvando…' : 'Marcar Pronto' }}
                      </button>
                    } @else if (order.status === 'ready') {
                      <span class="px-2 py-1 text-[10px] text-emerald-300 font-bold">Pronto para atendimento</span>
                    }
                  </div>
                </div>

              </div>
            }
          </div>
        }
      </div>

    </div>
  `
})
export class EAppKdsWindow {
  readonly ecosystem = inject(EcosystemService);

  readonly selectedStatus = signal<'all' | 'pending' | 'preparing' | 'ready'>('all');
  readonly isLoading = signal<boolean>(false);
  readonly loadError = signal<string | null>(null);
  private readonly updatingOrderIds = signal<ReadonlySet<string>>(new Set());
  private fetchGeneration = 0;

  constructor() {
    effect(() => {
      void this.loadOrders(this.ecosystem.resolveOperationalTenantId());
    });
  }

  readonly activeOrders = computed(() => {
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    if (!tenantId) return [];
    return this.ecosystem.orders().filter((order) =>
      order.tenantId === tenantId &&
      (order.status === 'pending' || order.status === 'preparing' || order.status === 'ready')
    );
  });

  readonly canManageOrders = computed(() => {
    const role = this.ecosystem.currentSession()?.role;
    return role === 'tenant_owner' || role === 'operator';
  });

  readonly filteredOrders = computed(() => {
    const s = this.selectedStatus();
    if (s === 'all') return this.activeOrders();
    return this.activeOrders().filter(o => o.status === s);
  });

  isUpdating(orderId: string): boolean {
    return this.updatingOrderIds().has(orderId);
  }

  async refreshOrders() {
    await this.loadOrders(this.ecosystem.resolveOperationalTenantId());
  }

  private async loadOrders(tenantId: string) {
    const generation = ++this.fetchGeneration;
    this.loadError.set(null);
    if (!tenantId) {
      this.isLoading.set(false);
      this.loadError.set('Selecione uma unidade para carregar os pedidos.');
      return;
    }

    this.isLoading.set(true);
    try {
      await this.ecosystem.ordersService.fetchOrders(tenantId);
    } catch {
      if (generation === this.fetchGeneration) {
        this.loadError.set('Não foi possível carregar os pedidos desta unidade.');
      }
    } finally {
      if (generation === this.fetchGeneration) this.isLoading.set(false);
    }
  }

  formatOrderTime(createdAt: string): string {
    const date = new Date(createdAt);
    return Number.isNaN(date.getTime())
      ? '--:--'
      : date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  async advanceStatus(order: OrderTransaction, nextStatus: 'preparing' | 'ready') {
    if (!this.canManageOrders() || order.tenantId !== this.ecosystem.resolveOperationalTenantId()) {
      this.ecosystem.notify('Somente proprietário ou operador da unidade pode alterar o preparo.', 'warning');
      return;
    }
    if (this.isUpdating(order.id)) return;
    this.updatingOrderIds.update((ids) => new Set(ids).add(order.id));
    try {
      await this.ecosystem.updateOrderStatus(order.id, nextStatus);
      this.ecosystem.notify(
        this.ecosystem.isSimulationMode()
          ? `Pedido ${order.orderNumber || order.id} atualizado para ${nextStatus === 'preparing' ? 'em preparo' : 'pronto'} somente na simulação.`
          : `Pedido ${order.orderNumber || order.id} atualizado para ${nextStatus === 'preparing' ? 'em preparo' : 'pronto'}.`,
        this.ecosystem.isSimulationMode() ? 'info' : 'success'
      );
    } catch {
      this.ecosystem.notify('Não foi possível atualizar o pedido. Confira o acesso e tente novamente.', 'error');
    } finally {
      this.updatingOrderIds.update((ids) => {
        const next = new Set(ids);
        next.delete(order.id);
        return next;
      });
    }
  }

  ticketBorderClass(status: string) {
    switch (status) {
      case 'pending': return 'border-amber-600/70';
      case 'preparing': return 'border-indigo-600/70';
      case 'ready': return 'border-emerald-600/70';
      default: return 'border-[#381c0c]';
    }
  }

  ticketBadgeClass(status: string) {
    switch (status) {
      case 'pending': return 'bg-amber-950 text-amber-300 border-amber-600/50';
      case 'preparing': return 'bg-indigo-950 text-indigo-300 border-indigo-600/50';
      case 'ready': return 'bg-emerald-950 text-emerald-300 border-emerald-600/50';
      default: return 'bg-stone-800 text-stone-300 border-stone-600';
    }
  }
}
