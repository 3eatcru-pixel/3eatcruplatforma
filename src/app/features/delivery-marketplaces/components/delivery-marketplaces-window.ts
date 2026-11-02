import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EcosystemService } from '../../../services/ecosystem.service';
import { ExternalOrder } from '../../../models/ecosystem.model';
import { DELIVERY_MARKETPLACE_PLUGINS } from '../services/delivery-marketplace-plugin-registry';
import { DeliveryMarketplaceService } from '../services/delivery-marketplace.service';
import { DeliveryMarketplaceProviderId } from '../types/delivery-marketplace-plugin.model';
import { DeliveryMarketplaceConnectionSummary } from '../types/delivery-marketplace-connection.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-delivery-marketplaces-window',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <section class="flex h-full flex-col gap-4 overflow-hidden bg-[#0d1118] p-4 font-sans text-slate-200">
      <header class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700/70 bg-slate-900/80 p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300">
            <mat-icon>delivery_dining</mat-icon>
          </div>
          <div>
            <h2 class="text-base font-black text-white">Pedidos de Marketplaces</h2>
            <p class="text-xs text-slate-400">Plugins separados para receber pedidos do iFood, 99Food e Rappi no Store OS.</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="rounded-full border border-amber-700/60 bg-amber-950/40 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-300">
            Conectores aguardando habilitação
          </span>
          <button type="button" (click)="refreshAll()" [disabled]="isLoading() || !canViewOrders()" aria-label="Atualizar pedidos externos"
            class="rounded-lg border border-slate-700 px-2 py-2 text-slate-300 disabled:opacity-40">
            <mat-icon class="!text-base">refresh</mat-icon>
          </button>
        </div>
      </header>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <article class="rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">
          <p class="text-[10px] font-bold uppercase text-slate-500">Plugins</p>
          <p class="mt-1 text-xl font-black text-white">{{ plugins.length }}</p>
          <p class="text-[10px] text-slate-500">iFood · 99Food · Rappi</p>
        </article>
        <article class="rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">
          <p class="text-[10px] font-bold uppercase text-slate-500">Conexões ativas</p>
          <p class="mt-1 text-xl font-black text-white">{{ marketplaceService.activeConnectionsCount() }}</p>
          <p class="text-[10px] text-slate-500">Conexões oficiais ativas desta loja</p>
        </article>
        <article class="rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">
          <p class="text-[10px] font-bold uppercase text-slate-500">Pedidos recebidos</p>
          <p class="mt-1 text-xl font-black text-white">{{ externalOrders().length }}</p>
          <p class="text-[10px] text-slate-500">A fila não usa pedidos fictícios</p>
        </article>
      </div>

      <nav class="flex gap-2 border-b border-slate-800" aria-label="Seções de delivery de terceiros">
        <button type="button" (click)="activeTab.set('orders')" [attr.aria-pressed]="activeTab() === 'orders'"
          [class]="activeTab() === 'orders' ? 'border-sky-400 text-sky-300' : 'border-transparent text-slate-500'"
          class="border-b-2 px-3 py-2 text-xs font-bold">Pedidos recebidos</button>
        <button type="button" (click)="activeTab.set('plugins')" [attr.aria-pressed]="activeTab() === 'plugins'"
          [class]="activeTab() === 'plugins' ? 'border-sky-400 text-sky-300' : 'border-transparent text-slate-500'"
          class="border-b-2 px-3 py-2 text-xs font-bold">Plugins e acesso</button>
      </nav>

      <div class="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
        @if (activeTab() === 'orders') {
          @if (!canViewOrders()) {
            <div class="flex h-full min-h-56 items-center justify-center rounded-2xl border border-amber-900/50 bg-amber-950/20 p-6 text-center text-sm text-amber-200">A fila de pedidos externos fica restrita ao proprietário ou operador da loja.</div>
          } @else if (isLoading()) {
            <div class="flex h-full min-h-56 items-center justify-center text-sm text-slate-400">Carregando pedidos recebidos…</div>
          } @else if (ordersError()) {
            <div class="flex h-full min-h-56 flex-col items-center justify-center gap-3 text-center text-rose-300">
              <p>{{ ordersError() }}</p><button type="button" (click)="refreshOrders()" class="font-bold underline">Tentar novamente</button>
            </div>
          } @else if (externalOrders().length === 0) {
            <div class="flex h-full min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-700 p-6 text-center">
              <mat-icon class="!h-10 !w-10 !text-4xl text-slate-600">inbox</mat-icon>
              <h3 class="font-bold text-slate-300">A fila de marketplaces está vazia</h3>
              <p class="max-w-lg text-xs leading-relaxed text-slate-500">Os pedidos desta tela virão dos conectores oficiais quando cada plugin estiver habilitado. O painel atual não simula recebimento nem confirma pedidos nas plataformas.</p>
              <button type="button" (click)="activeTab.set('plugins')" class="rounded-lg border border-sky-700/60 bg-sky-950/40 px-3 py-2 text-xs font-bold text-sky-300">Ver plugins e requisitos</button>
            </div>
          } @else {
            <div class="space-y-2">
              @for (order of externalOrders(); track order.id) {
                <article class="rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p class="text-xs font-black text-white">{{ providerName(order.source) }} · {{ order.externalId }}</p>
                      <p class="mt-1 text-[11px] text-slate-400">{{ order.customerName }} · {{ itemSummary(order) }}</p>
                    </div>
                    <div class="text-right">
                      <p class="text-sm font-black text-white">R$ {{ order.total.toFixed(2) }}</p>
                      <p class="text-[10px] text-slate-500">{{ statusLabel(order.status) }} · recebido {{ order.receivedAt | date:'dd/MM HH:mm' }}</p>
                    </div>
                  </div>
                </article>
              }
            </div>
          }
        } @else {
          @if (connectionsError()) {
            <p class="mb-3 rounded-lg border border-rose-900/50 bg-rose-950/30 p-3 text-xs text-rose-300">{{ connectionsError() }}</p>
          }
          <div class="grid grid-cols-1 gap-3 xl:grid-cols-3">
            @for (plugin of plugins; track plugin.id) {
              <article class="flex flex-col gap-3 rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4">
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-3">
                    <div [class]="plugin.colorClass" class="flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-black">{{ plugin.iconLabel }}</div>
                    <div>
                      <h3 class="text-sm font-black text-white">{{ plugin.name }}</h3>
                      <span [class]="connectionStatusClass(connectionFor(plugin.id)?.status)" class="text-[10px]">{{ connectionStatusLabel(connectionFor(plugin.id)?.status) }}</span>
                    </div>
                  </div>
                  <mat-icon class="text-slate-500">extension</mat-icon>
                </div>
                <p class="min-h-9 text-xs leading-relaxed text-slate-400">{{ plugin.summary }}</p>
                <div>
                  <p class="text-[10px] font-bold uppercase text-slate-500">Recebimento documentado</p>
                  <p class="mt-1 text-xs text-slate-300">{{ plugin.intakeMethods.join(' · ') }}</p>
                </div>
                <button type="button" (click)="togglePluginDetails(plugin.id)" [attr.aria-expanded]="selectedPlugin() === plugin.id"
                  class="mt-auto flex items-center justify-between rounded-lg border border-slate-700 px-3 py-2 text-left text-xs font-bold text-slate-300 hover:border-sky-600 hover:text-white">
                  <span>{{ selectedPlugin() === plugin.id ? 'Ocultar requisitos' : 'Ver requisitos de habilitação' }}</span>
                  <mat-icon class="!text-base">{{ selectedPlugin() === plugin.id ? 'expand_less' : 'expand_more' }}</mat-icon>
                </button>
                @if (selectedPlugin() === plugin.id) {
                  <div class="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <ul class="list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-slate-400">
                      @for (prerequisite of plugin.prerequisites; track prerequisite) {
                        <li>{{ prerequisite }}</li>
                      }
                    </ul>
                    <a [href]="plugin.documentationUrl" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-[11px] font-bold text-sky-300 hover:text-sky-200">
                      Documentação oficial <mat-icon class="!text-sm">open_in_new</mat-icon>
                    </a>
                  </div>
                }
              </article>
            }
          </div>
          <p class="mt-4 rounded-xl border border-amber-900/50 bg-amber-950/20 p-3 text-[11px] leading-relaxed text-amber-200/80">
            As plataformas exigem cadastro e liberação de integrador. Este módulo não guarda segredo no navegador, não recebe eventos externos ainda e não informa conexão ativa até a integração ser desenvolvida e homologada.
          </p>
        }
      </div>
    </section>
  `
})
export class DeliveryMarketplacesWindowComponent {
  readonly ecosystem = inject(EcosystemService);
  readonly marketplaceService = inject(DeliveryMarketplaceService);
  readonly plugins = DELIVERY_MARKETPLACE_PLUGINS;
  readonly activeTab = signal<'orders' | 'plugins'>('orders');
  readonly selectedPlugin = signal<DeliveryMarketplaceProviderId | null>(null);
  readonly isLoading = signal(false);
  readonly ordersError = signal<string | null>(null);
  readonly connectionsError = signal<string | null>(null);
  private fetchGeneration = 0;
  readonly externalOrders = computed<ExternalOrder[]>(() => {
    const tenantId = this.ecosystem.currentTenantId();
    if (!tenantId) return [];
    return this.ecosystem.externalOrders()
      .filter((order) => order.tenantId === tenantId)
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
  });

  readonly canViewOrders = computed(() => {
    const role = this.ecosystem.currentSession()?.role;
    return role === 'tenant_owner' || role === 'operator';
  });

  constructor() {
    effect(() => {
      const tenantId = this.ecosystem.currentTenantId();
      const canView = this.canViewOrders();
      const generation = ++this.fetchGeneration;
      if (!tenantId || !canView) {
        this.isLoading.set(false);
        this.ordersError.set(null);
        this.connectionsError.set(null);
        this.marketplaceService.clearConnections();
        return;
      }
      void this.loadOrders(tenantId, generation);
      void this.loadConnections(generation);
    });
  }

  providerName(provider: ExternalOrder['source']): string {
    if (provider === 'ifood') return 'iFood';
    if (provider === '99food') return '99Food';
    if (provider === 'rappi') return 'Rappi';
    if (provider === 'ubereats') return 'Uber Eats';
    return 'WhatsApp';
  }

  itemSummary(order: ExternalOrder): string {
    return order.items.map((item) => `${item.quantity}x ${item.name}`).join(' · ');
  }

  statusLabel(status: ExternalOrder['status']): string {
    const labels: Record<ExternalOrder['status'], string> = {
      received: 'Recebido', accepted: 'Aceito', preparing: 'Em preparo', ready: 'Pronto',
      dispatched: 'Saiu para entrega', completed: 'Concluído', cancelled: 'Cancelado',
      requires_review: 'Requer revisão'
    };
    return labels[status];
  }

  connectionFor(provider: DeliveryMarketplaceProviderId): DeliveryMarketplaceConnectionSummary | undefined {
    return this.marketplaceService.connections().find((connection) => connection.provider === provider);
  }

  connectionStatusLabel(status?: DeliveryMarketplaceConnectionSummary['status']): string {
    if (status === 'active') return 'Conectado';
    if (status === 'pending_authorization') return 'Aguardando autorização';
    if (status === 'error') return 'Verificar conexão';
    if (status === 'suspended') return 'Suspenso';
    return 'Não conectado';
  }

  connectionStatusClass(status?: DeliveryMarketplaceConnectionSummary['status']): string {
    if (status === 'active') return 'text-emerald-300';
    if (status === 'error' || status === 'suspended') return 'text-rose-300';
    return 'text-amber-300';
  }

  async refreshOrders() {
    const tenantId = this.ecosystem.currentTenantId();
    if (!tenantId || !this.canViewOrders()) return;
    await this.loadOrders(tenantId, ++this.fetchGeneration);
  }

  async refreshAll() {
    const tenantId = this.ecosystem.currentTenantId();
    if (!tenantId || !this.canViewOrders()) return;
    const generation = ++this.fetchGeneration;
    await Promise.all([this.loadOrders(tenantId, generation), this.loadConnections(generation)]);
  }

  private async loadOrders(tenantId: string, generation: number) {
    this.isLoading.set(true);
    this.ordersError.set(null);
    try {
      await this.ecosystem.ordersService.fetchExternalOrders(tenantId, 200);
    } catch {
      if (generation === this.fetchGeneration) this.ordersError.set('Não foi possível carregar os pedidos externos desta loja.');
    } finally {
      if (generation === this.fetchGeneration) this.isLoading.set(false);
    }
  }

  private async loadConnections(generation: number) {
    this.connectionsError.set(null);
    try {
      await this.marketplaceService.fetchConnections();
    } catch {
      if (generation === this.fetchGeneration) this.connectionsError.set('Não foi possível carregar o estado das conexões.');
    }
  }

  togglePluginDetails(pluginId: DeliveryMarketplaceProviderId) {
    this.selectedPlugin.update((current) => current === pluginId ? null : pluginId);
  }
}
