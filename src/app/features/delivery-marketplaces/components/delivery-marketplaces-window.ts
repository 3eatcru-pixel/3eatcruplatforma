import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EcosystemService } from '../../../services/ecosystem.service';
import { ExternalOrder } from '../../../models/ecosystem.model';
import { DELIVERY_MARKETPLACE_PLUGINS } from '../services/delivery-marketplace-plugin-registry';
import { DeliveryMarketplaceService } from '../services/delivery-marketplace.service';
import { DeliveryMarketplaceProviderId } from '../types/delivery-marketplace-plugin.model';
import { DeliveryMarketplaceConnectionStatus, DeliveryMarketplaceConnectionSummary } from '../types/delivery-marketplace-connection.model';

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
            <p class="text-xs text-slate-400">Plugins integrados para receber pedidos do iFood, 99Food e Rappi no Store OS.</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="rounded-full border border-sky-700/60 bg-sky-950/40 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-300">
            {{ marketplaceService.activeConnectionsCount() }} / {{ plugins.length }} Conexões Ativas
          </span>
          <button type="button" (click)="refreshAll()" [disabled]="isLoading() || !canViewOrders()" aria-label="Atualizar pedidos e plugins"
            class="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-bold text-slate-300 hover:border-sky-500 hover:text-white disabled:opacity-40">
            <mat-icon class="!text-base">refresh</mat-icon>
            <span>Atualizar</span>
          </button>
        </div>
      </header>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <article class="rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">
          <p class="text-[10px] font-bold uppercase text-slate-500">Plugins Disponíveis</p>
          <p class="mt-1 text-xl font-black text-white">{{ plugins.length }}</p>
          <p class="text-[10px] text-slate-500">iFood · 99Food · Rappi</p>
        </article>
        <article class="rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">
          <p class="text-[10px] font-bold uppercase text-slate-500">Conexões Ativas</p>
          <p class="mt-1 text-xl font-black text-emerald-400">{{ marketplaceService.activeConnectionsCount() }}</p>
          <p class="text-[10px] text-slate-500">Conexões operacionais desta loja</p>
        </article>
        <article class="rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">
          <p class="text-[10px] font-bold uppercase text-slate-500">Pedidos Recebidos</p>
          <p class="mt-1 text-xl font-black text-white">{{ externalOrders().length }}</p>
          <p class="text-[10px] text-slate-500">Fila autoritativa de pedidos externos</p>
        </article>
      </div>

      <nav class="flex gap-2 border-b border-slate-800" aria-label="Seções de delivery de terceiros">
        <button type="button" (click)="activeTab.set('orders')" [attr.aria-pressed]="activeTab() === 'orders'"
          [class]="activeTab() === 'orders' ? 'border-sky-400 text-sky-300' : 'border-transparent text-slate-500'"
          class="flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold">
          <mat-icon class="!text-sm">receipt_long</mat-icon>
          <span>Pedidos recebidos</span>
        </button>
        <button type="button" (click)="activeTab.set('plugins')" [attr.aria-pressed]="activeTab() === 'plugins'"
          [class]="activeTab() === 'plugins' ? 'border-sky-400 text-sky-300' : 'border-transparent text-slate-500'"
          class="flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold">
          <mat-icon class="!text-sm">extension</mat-icon>
          <span>Plugins e acesso</span>
        </button>
      </nav>

      <div class="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
        @if (activeTab() === 'orders') {
          @if (!canViewOrders()) {
            <div class="flex h-full min-h-56 items-center justify-center rounded-2xl border border-amber-900/50 bg-amber-950/20 p-6 text-center text-sm text-amber-200">
              A fila de pedidos externos fica restrita ao proprietário ou operador da loja.
            </div>
          } @else if (isLoading()) {
            <div class="flex h-full min-h-56 items-center justify-center text-sm text-slate-400">
              <mat-icon class="mr-2 animate-spin !text-lg">refresh</mat-icon> Carregando pedidos recebidos…
            </div>
          } @else if (ordersError()) {
            <div class="flex h-full min-h-56 flex-col items-center justify-center gap-3 text-center text-rose-300">
              <p>{{ ordersError() }}</p>
              <button type="button" (click)="refreshOrders()" class="flex items-center gap-1 font-bold underline">
                <mat-icon class="!text-sm">refresh</mat-icon> Tentar novamente
              </button>
            </div>
          } @else if (externalOrders().length === 0) {
            <div class="flex h-full min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-700 p-6 text-center">
              <mat-icon class="!h-10 !w-10 !text-4xl text-slate-600">inbox</mat-icon>
              <h3 class="font-bold text-slate-300">A fila de marketplaces está vazia</h3>
              <p class="max-w-lg text-xs leading-relaxed text-slate-500">
                Os pedidos desta tela chegam automaticamente via webhook ou conector oficial quando o plugin estiver conectado e habilitado.
              </p>
              <button type="button" (click)="activeTab.set('plugins')" class="flex items-center gap-1 rounded-lg border border-sky-700/60 bg-sky-950/40 px-3 py-2 text-xs font-bold text-sky-300 hover:bg-sky-900/50">
                <mat-icon class="!text-sm">extension</mat-icon> Gerenciar plugins e requisitos
              </button>
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
          <!-- ABA PLUGINS E ACESSO -->
          @if (connectionsError()) {
            <p class="mb-3 rounded-lg border border-rose-900/50 bg-rose-950/30 p-3 text-xs text-rose-300">{{ connectionsError() }}</p>
          }

          @if (actionFeedback(); as feedback) {
            <div [class]="feedback.type === 'success' ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300' : 'border-rose-800 bg-rose-950/40 text-rose-300'"
              class="mb-3 flex items-center justify-between rounded-xl border p-3 text-xs">
              <div class="flex items-center gap-2">
                <mat-icon class="!text-base">{{ feedback.type === 'success' ? 'check_circle' : 'error' }}</mat-icon>
                <span>{{ feedback.text }}</span>
              </div>
              <button type="button" (click)="actionFeedback.set(null)" class="text-slate-400 hover:text-white">
                <mat-icon class="!text-sm">close</mat-icon>
              </button>
            </div>
          }

          <div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
            @for (plugin of plugins; track plugin.id) {
              @let conn = connectionFor(plugin.id);
              <article class="flex flex-col gap-3 rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4 transition-all">
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-3">
                    <div [class]="plugin.colorClass" class="flex h-11 w-11 items-center justify-center rounded-xl border text-sm font-black shadow-sm">
                      {{ plugin.iconLabel }}
                    </div>
                    <div>
                      <h3 class="text-sm font-black text-white">{{ plugin.name }}</h3>
                      <span [class]="connectionStatusClass(conn?.status)" class="inline-flex items-center gap-1 text-[10px] font-bold">
                        <span class="inline-block h-1.5 w-1.5 rounded-full" [class]="conn?.status === 'active' ? 'bg-emerald-400' : (conn?.status === 'error' ? 'bg-rose-400' : 'bg-amber-400')"></span>
                        {{ connectionStatusLabel(conn?.status) }}
                      </span>
                    </div>
                  </div>
                  <mat-icon class="text-slate-500">extension</mat-icon>
                </div>

                <p class="min-h-9 text-xs leading-relaxed text-slate-400">{{ plugin.summary }}</p>

                <div class="rounded-xl border border-slate-800 bg-slate-950/50 p-2.5">
                  <p class="text-[10px] font-bold uppercase text-slate-500">Métodos de Entrada</p>
                  <p class="mt-0.5 text-xs text-slate-300">{{ plugin.intakeMethods.join(' · ') }}</p>
                  @if (conn?.lastSyncAt) {
                    <p class="mt-1 text-[10px] text-slate-500">Última sincronização: {{ conn?.lastSyncAt | date:'dd/MM/yyyy HH:mm' }}</p>
                  }
                </div>

                <!-- CONTROLES RÁPIDOS DE ATUALIZAÇÃO DO PLUGIN -->
                <div class="mt-auto flex flex-col gap-2 pt-2">
                  <div class="flex items-center gap-2">
                    @if (conn?.status === 'active') {
                      <button type="button"
                        (click)="updatePlugin(plugin.id, 'suspended')"
                        [disabled]="updatingPlugin() === plugin.id"
                        class="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-amber-800/80 bg-amber-950/30 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-900/40 disabled:opacity-50">
                        <mat-icon class="!text-sm">pause</mat-icon>
                        <span>Pausar Conexão</span>
                      </button>
                    } @else {
                      <button type="button"
                        (click)="updatePlugin(plugin.id, 'active')"
                        [disabled]="updatingPlugin() === plugin.id"
                        class="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-950/40 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-900/50 disabled:opacity-50">
                        @if (updatingPlugin() === plugin.id) {
                          <mat-icon class="animate-spin !text-sm">refresh</mat-icon>
                        } @else {
                          <mat-icon class="!text-sm">check_circle</mat-icon>
                        }
                        <span>{{ updatingPlugin() === plugin.id ? 'Atualizando…' : 'Ativar Plugin' }}</span>
                      </button>
                    }

                    <button type="button"
                      (click)="togglePluginDetails(plugin.id)"
                      [attr.aria-expanded]="selectedPlugin() === plugin.id"
                      class="flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800/60 p-2 text-slate-300 hover:border-sky-500 hover:text-white"
                      title="Configurações e Requisitos">
                      <mat-icon class="!text-base">{{ selectedPlugin() === plugin.id ? 'expand_less' : 'tune' }}</mat-icon>
                    </button>
                  </div>

                  @if (selectedPlugin() === plugin.id) {
                    <div class="space-y-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs">
                      <!-- CONFIGURAÇÃO DE CREDENCIAIS / MERCHANT ID -->
                      <div class="space-y-1.5">
                        <label [attr.for]="'merchant-id-' + plugin.id" class="block text-[11px] font-bold text-slate-300">
                          ID da Loja no {{ plugin.name }} (Merchant ID)
                        </label>
                        <div class="flex gap-2">
                          <input
                            [id]="'merchant-id-' + plugin.id"
                            type="text"
                            [value]="getMerchantInput(plugin.id, conn?.externalMerchantId)"
                            (input)="setMerchantInput(plugin.id, $any($event.target).value)"
                            placeholder="Ex: LOJA-12345"
                            class="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none" />
                          <button
                            type="button"
                            (click)="savePluginConfig(plugin.id)"
                            [disabled]="updatingPlugin() === plugin.id"
                            class="flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-500 disabled:opacity-50">
                            <mat-icon class="!text-sm">save</mat-icon>
                            <span>Salvar</span>
                          </button>
                        </div>
                      </div>

                      <!-- PRÉ-REQUISITOS OFICIAIS -->
                      <div class="border-t border-slate-800/80 pt-2">
                        <p class="text-[10px] font-bold uppercase text-slate-500">Requisitos de Habilitação</p>
                        <ul class="mt-1 list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-slate-400">
                          @for (prerequisite of plugin.prerequisites; track prerequisite) {
                            <li>{{ prerequisite }}</li>
                          }
                        </ul>
                      </div>

                      <div class="pt-1">
                        <a [href]="plugin.documentationUrl" target="_blank" rel="noopener noreferrer"
                          class="inline-flex items-center gap-1 text-[11px] font-bold text-sky-400 hover:text-sky-300">
                          Documentação e Portal do Integrador
                          <mat-icon class="!text-sm">open_in_new</mat-icon>
                        </a>
                      </div>
                    </div>
                  }
                </div>
              </article>
            }
          </div>

          <div class="mt-4 rounded-xl border border-sky-900/40 bg-sky-950/20 p-3 text-[11px] leading-relaxed text-sky-200/80">
            <strong>Arquitetura dos Plugins de Marketplace:</strong> As plataformas iFood, 99Food e Rappi operam via Webhooks autoritativos e Merchant APIs. Ativar o plugin no Store OS configura o nó da sua loja para recepcionar eventos de novos pedidos e sincronizar o status diretamente com o KDS e a expedição.
          </div>
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
  readonly updatingPlugin = signal<DeliveryMarketplaceProviderId | null>(null);
  readonly ordersError = signal<string | null>(null);
  readonly connectionsError = signal<string | null>(null);
  readonly actionFeedback = signal<{ type: 'success' | 'error'; text: string } | null>(null);
  private readonly merchantInputs = signal<Record<string, string>>({});
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
    return role === 'tenant_owner' || role === 'operator' || role === 'hq_admin';
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

  getMerchantInput(pluginId: string, fallback?: string): string {
    const current = this.merchantInputs()[pluginId];
    if (current !== undefined) return current;
    return fallback || '';
  }

  setMerchantInput(pluginId: string, value: string): void {
    this.merchantInputs.update((prev) => ({
      ...prev,
      [pluginId]: value
    }));
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
      received: 'Recebido',
      accepted: 'Aceito',
      preparing: 'Em preparo',
      ready: 'Pronto',
      dispatched: 'Saiu para entrega',
      completed: 'Concluído',
      cancelled: 'Cancelado',
      requires_review: 'Requer revisão'
    };
    return labels[status] || status;
  }

  connectionFor(provider: DeliveryMarketplaceProviderId): DeliveryMarketplaceConnectionSummary | undefined {
    return this.marketplaceService.connections().find((connection) => connection.provider === provider);
  }

  connectionStatusLabel(status?: DeliveryMarketplaceConnectionSummary['status']): string {
    if (status === 'active') return 'Conectado';
    if (status === 'pending_authorization') return 'Aguardando autorização';
    if (status === 'error') return 'Verificar conexão';
    if (status === 'suspended') return 'Pausado / Suspenso';
    return 'Não configurado';
  }

  connectionStatusClass(status?: DeliveryMarketplaceConnectionSummary['status']): string {
    if (status === 'active') return 'text-emerald-400';
    if (status === 'error') return 'text-rose-400';
    if (status === 'suspended') return 'text-amber-400';
    return 'text-slate-400';
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
    this.actionFeedback.set(null);
    await Promise.all([this.loadOrders(tenantId, generation), this.loadConnections(generation)]);
  }

  async updatePlugin(pluginId: DeliveryMarketplaceProviderId, status: DeliveryMarketplaceConnectionStatus) {
    this.updatingPlugin.set(pluginId);
    this.actionFeedback.set(null);
    try {
      const merchantId = this.getMerchantInput(pluginId, this.connectionFor(pluginId)?.externalMerchantId);
      await this.marketplaceService.updateConnection(pluginId, {
        status,
        ...(merchantId ? { externalMerchantId: merchantId } : {})
      });
      this.actionFeedback.set({
        type: 'success',
        text: `Plugin ${this.providerName(pluginId)} ${status === 'active' ? 'conectado e ativado' : 'atualizado'} com sucesso!`
      });
    } catch {
      this.actionFeedback.set({
        type: 'error',
        text: `Falha ao atualizar o plugin ${this.providerName(pluginId)}. Verifique a conexão e tente novamente.`
      });
    } finally {
      this.updatingPlugin.set(null);
    }
  }

  async savePluginConfig(pluginId: DeliveryMarketplaceProviderId) {
    this.updatingPlugin.set(pluginId);
    this.actionFeedback.set(null);
    try {
      const merchantId = this.getMerchantInput(pluginId);
      const conn = this.connectionFor(pluginId);
      const targetStatus: DeliveryMarketplaceConnectionStatus = conn?.status === 'active' ? 'active' : 'pending_authorization';

      await this.marketplaceService.updateConnection(pluginId, {
        status: targetStatus,
        externalMerchantId: merchantId
      });
      this.actionFeedback.set({
        type: 'success',
        text: `Configuração do plugin ${this.providerName(pluginId)} salva com sucesso!`
      });
    } catch {
      this.actionFeedback.set({
        type: 'error',
        text: `Não foi possível salvar a configuração do plugin ${this.providerName(pluginId)}.`
      });
    } finally {
      this.updatingPlugin.set(null);
    }
  }

  private async loadOrders(tenantId: string, generation: number) {
    this.isLoading.set(true);
    this.ordersError.set(null);
    try {
      await this.ecosystem.ordersService.fetchExternalOrders(tenantId, 200);
    } catch {
      if (generation === this.fetchGeneration) {
        this.ordersError.set('Não foi possível carregar os pedidos externos desta loja.');
      }
    } finally {
      if (generation === this.fetchGeneration) {
        this.isLoading.set(false);
      }
    }
  }

  private async loadConnections(generation: number) {
    this.connectionsError.set(null);
    try {
      await this.marketplaceService.fetchConnections();
    } catch {
      if (generation === this.fetchGeneration) {
        this.connectionsError.set('Não foi possível carregar o estado das conexões dos plugins.');
      }
    }
  }

  togglePluginDetails(pluginId: DeliveryMarketplaceProviderId) {
    this.selectedPlugin.update((current) => current === pluginId ? null : pluginId);
  }
}
