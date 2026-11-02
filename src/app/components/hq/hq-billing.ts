import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EcosystemService } from '../../services/ecosystem.service';
import { HqApiService } from '../../services/hq-api.service';
import type { BillingProvider, HqBillingDashboard, PlatformBillingInvoiceRecord, PlatformSubscriptionRecord } from '../../../shared/models/billing.model';
import type { CompanyTenant } from '../../models/ecosystem.model';

@Component({
  selector: 'app-hq-billing',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-5 text-stone-200">
      <header class="rounded-2xl border border-amber-700/50 bg-[#170b04] p-5 shadow-xl">
        <div class="flex items-start gap-3">
          <mat-icon class="text-amber-400">account_balance</mat-icon>
          <div>
            <h2 class="text-lg font-black text-white">Pagamentos da plataforma</h2>
            <p class="mt-1 max-w-3xl text-xs leading-relaxed text-stone-400">A assinatura mensal do Store OS é receita do HQ e pode ser cobrada por Mercado Pago ou Stripe. Pagamentos dos pedidos continuam indo diretamente para a conta da loja.</p>
          </div>
        </div>
      </header>

      @if (ecosystem.isSimulationMode()) {
        <p class="rounded-xl border border-amber-700 bg-amber-950/40 p-4 text-xs text-amber-200">Modo de simulação: nenhum checkout ou dado financeiro real será criado.</p>
      } @else {
        @if (loadError()) {
          <p role="alert" class="rounded-xl border border-rose-700 bg-rose-950/40 p-3 text-xs text-rose-200">{{ loadError() }}</p>
        }

        @if (dashboard(); as data) {
          <div class="grid gap-3 md:grid-cols-2">
            @for (provider of data.providers; track provider.provider) {
              <article class="rounded-2xl border p-4" [class]="provider.configured ? 'rounded-2xl border border-emerald-800 bg-emerald-950/25 p-4' : 'rounded-2xl border border-stone-700 bg-stone-900/60 p-4'">
                <div class="flex items-center justify-between gap-3">
                  <h3 class="font-bold text-white">{{ providerLabel(provider.provider) }}</h3>
                  <span class="rounded-full px-2 py-1 text-[10px] font-bold uppercase" [class]="provider.configured ? 'rounded-full bg-emerald-900 px-2 py-1 text-[10px] font-bold uppercase text-emerald-300' : 'rounded-full bg-stone-800 px-2 py-1 text-[10px] font-bold uppercase text-stone-400'">
                    {{ provider.configured ? 'Pronto para checkout' : 'Não configurado' }}
                  </span>
                </div>
                @if (!provider.configured) {
                  <p class="mt-2 text-[11px] text-stone-400">Faltam no servidor: {{ provider.missing.join(', ') }}.</p>
                } @else {
                  <p class="mt-2 text-[11px] text-stone-400">Checkout e confirmação de pagamento usam a conta da plataforma.</p>
                }
              </article>
            }
          </div>

          <article class="rounded-2xl border border-amber-700/50 bg-amber-950/20 p-4">
            <div class="flex items-center gap-2 text-amber-300">
              <mat-icon class="text-base">delivery_dining</mat-icon>
              <strong class="text-xs uppercase">Comissão do delivery da plataforma · {{ data.deliveryCommission.percent }}%</strong>
              <span class="rounded-full border border-amber-700 px-2 py-0.5 text-[9px] font-bold uppercase">{{ data.deliveryCommission.status === 'coming_soon' ? 'Em breve' : 'Ativa' }}</span>
            </div>
            <p class="mt-2 text-[11px] text-stone-400">{{ data.deliveryCommission.note }} A comissão permanece bloqueada até a rede e a inteligência operacional estarem prontas; entregadores próprios da loja não geram essa cobrança.</p>
          </article>

          <div class="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-stone-700 bg-stone-900/70 p-4">
            <div>
              <h3 class="text-sm font-bold text-white">Assinaturas e links de pagamento</h3>
              <p class="mt-1 text-[10px] text-stone-400">O valor é lido do plano atual da loja no servidor. Um checkout pendente é reutilizado para evitar assinaturas duplicadas.</p>
            </div>
            <label class="text-[10px] text-stone-400">Provedor
              <select [value]="selectedProvider()" (change)="selectedProvider.set($any($event.target).value)" class="ml-2 rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-xs text-white">
                <option value="mercadopago">Mercado Pago</option>
                <option value="stripe">Stripe</option>
              </select>
            </label>
          </div>

          @if (checkoutUrl()) {
            <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-700 bg-emerald-950/40 p-4">
              <div>
                <strong class="text-xs text-emerald-300">Link de pagamento pronto{{ checkoutTenantName() ? ' para ' + checkoutTenantName() : '' }}</strong>
                <p class="mt-1 break-all text-[10px] text-stone-300">{{ checkoutUrl() }}</p>
              </div>
              <div class="flex gap-2">
                <a [href]="checkoutUrl()" target="_blank" rel="noopener noreferrer" class="rounded-lg bg-emerald-700 px-3 py-2 text-[10px] font-bold text-white">Abrir checkout</a>
                <button type="button" (click)="copyCheckoutUrl()" class="rounded-lg border border-emerald-700 px-3 py-2 text-[10px] font-bold text-emerald-200">Copiar link</button>
              </div>
            </div>
          }

          @if (isLoading()) {
            <p class="rounded-xl border border-stone-700 bg-stone-900 p-4 text-xs text-stone-400">Carregando assinaturas…</p>
          } @else {
            <div class="overflow-x-auto rounded-2xl border border-stone-700 bg-stone-950/60">
              <table class="w-full min-w-[850px] text-left text-xs">
                <thead class="border-b border-stone-700 bg-stone-900 text-[10px] uppercase text-stone-400">
                  <tr><th class="p-3">Loja</th><th class="p-3">Plano</th><th class="p-3">Mensalidade</th><th class="p-3">Provedor</th><th class="p-3">Cobrança</th><th class="p-3 text-right">Ações</th></tr>
                </thead>
                <tbody class="divide-y divide-stone-800">
                  @for (tenant of ecosystem.tenants(); track tenant.id) {
                    @let subscription = subscriptionFor(data, tenant.id);
                    <tr>
                      <td class="p-3"><strong class="text-white">{{ tenant.name }}</strong><div class="mt-1 text-[10px] text-stone-500">{{ tenant.contactEmail || 'Sem e-mail de cobrança' }}</div></td>
                      <td class="p-3">{{ subscription?.planName || tenant.plan }}</td>
                      <td class="p-3">{{ subscription ? (subscription.amountMonthly | currency:'BRL':'symbol':'1.2-2') : '—' }}</td>
                      <td class="p-3">{{ subscription ? providerLabel(subscription.provider) : '—' }}</td>
                      <td class="p-3"><span [class]="statusClass(subscription?.status)">{{ statusLabel(subscription?.status) }}</span><div class="mt-1 text-[10px] text-stone-500">{{ subscription?.providerStatus || '' }}</div></td>
                      <td class="p-3 text-right">
                        @if (!subscription || subscription.status === 'cancelled' || subscription.status === 'failed') {
                          <button type="button" (click)="createCheckout(tenant)" [disabled]="busyTenantId() === tenant.id || !isProviderReady(data, selectedProvider())" class="rounded-lg bg-amber-600 px-3 py-2 text-[10px] font-bold text-stone-950 disabled:cursor-not-allowed disabled:opacity-40">{{ busyTenantId() === tenant.id ? 'Gerando…' : 'Gerar checkout' }}</button>
                        } @else if (subscription.checkoutUrl && subscription.status === 'pending_payment') {
                          <a [href]="subscription.checkoutUrl" target="_blank" rel="noopener noreferrer" class="mr-2 inline-block rounded-lg border border-amber-700 px-3 py-2 text-[10px] font-bold text-amber-200">Abrir link</a>
                          <button type="button" (click)="cancelSubscription(tenant.id)" [disabled]="busyTenantId() === tenant.id" class="rounded-lg border border-rose-800 px-3 py-2 text-[10px] font-bold text-rose-300 disabled:opacity-40">Cancelar</button>
                        } @else {
                          <button type="button" (click)="cancelSubscription(tenant.id)" [disabled]="busyTenantId() === tenant.id" class="rounded-lg border border-rose-800 px-3 py-2 text-[10px] font-bold text-rose-300 disabled:opacity-40">{{ busyTenantId() === tenant.id ? 'Cancelando…' : 'Cancelar assinatura' }}</button>
                        }
                      </td>
                    </tr>
                  } @empty {
                    <tr><td colspan="6" class="p-8 text-center text-stone-500">Nenhuma loja carregada no HQ.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          }

          <section class="space-y-3">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h3 class="text-sm font-bold text-white">Faturas conciliadas por webhook</h3>
                <p class="mt-1 text-[10px] text-stone-400">A lista mostra faturas; os registros técnicos de eventos ficam no servidor.</p>
              </div>
              <button type="button" (click)="loadDashboard()" [disabled]="isLoading()" class="rounded-lg border border-stone-700 px-3 py-2 text-[10px] font-bold text-stone-300 disabled:opacity-40">Atualizar</button>
            </div>
            <div class="overflow-x-auto rounded-2xl border border-stone-700 bg-stone-950/60">
              <table class="w-full min-w-[700px] text-left text-xs">
                <thead class="border-b border-stone-700 bg-stone-900 text-[10px] uppercase text-stone-400"><tr><th class="p-3">Loja</th><th class="p-3">Provedor</th><th class="p-3">Valor</th><th class="p-3">Estado da fatura</th><th class="p-3">Data</th></tr></thead>
                <tbody class="divide-y divide-stone-800">
                  @for (invoice of data.invoices; track invoice.id) {
                    <tr>
                      <td class="p-3"><strong class="text-white">{{ invoiceTenantName(invoice) }}</strong><div class="mt-1 text-[9px] text-stone-500">{{ invoice.tenantId }}</div></td>
                      <td class="p-3">{{ providerLabel(invoice.provider) }}</td>
                      <td class="p-3">{{ invoice.amount | currency:invoice.currency:'symbol':'1.2-2' }}</td>
                      <td class="p-3"><span [class]="invoiceStatusClass(invoice.status)">{{ invoiceStatusLabel(invoice.status) }}</span></td>
                      <td class="p-3">{{ invoice.paidAt || invoice.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                    </tr>
                  } @empty {
                    <tr><td colspan="5" class="p-7 text-center text-stone-500">Nenhuma fatura recebida por webhook até agora.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        } @else if (!isLoading()) {
          <p class="rounded-xl border border-stone-700 bg-stone-900 p-4 text-xs text-stone-400">Nenhum dado de cobrança foi carregado.</p>
        }
      }
    </section>
  `
})
export class HqBillingComponent implements OnInit {
  readonly ecosystem = inject(EcosystemService);
  private readonly hqApi = inject(HqApiService);
  readonly dashboard = signal<HqBillingDashboard | null>(null);
  readonly isLoading = signal(false);
  readonly loadError = signal('');
  readonly busyTenantId = signal<string | null>(null);
  readonly selectedProvider = signal<BillingProvider>('mercadopago');
  readonly checkoutUrl = signal('');
  readonly checkoutTenantName = signal('');

  ngOnInit(): void {
    void this.loadDashboard();
  }

  async loadDashboard(): Promise<void> {
    if (this.ecosystem.isSimulationMode()) return;
    if (this.isLoading()) return;
    this.isLoading.set(true);
    this.loadError.set('');
    try {
      const result = await this.hqApi.getBillingDashboard();
      this.dashboard.set(result);
      if (!result.providers.find((provider) => provider.provider === this.selectedProvider() && provider.configured)) {
        const firstReady = result.providers.find((provider) => provider.configured);
        if (firstReady) this.selectedProvider.set(firstReady.provider);
      }
    } catch {
      this.dashboard.set(null);
      this.loadError.set('Não foi possível carregar o gerenciamento de pagamentos do HQ.');
    } finally {
      this.isLoading.set(false);
    }
  }

  subscriptionFor(data: HqBillingDashboard, tenantId: string): PlatformSubscriptionRecord | undefined {
    return data.subscriptions.find((subscription) => subscription.tenantId === tenantId);
  }

  isProviderReady(data: HqBillingDashboard, provider: BillingProvider): boolean {
    return Boolean(data.providers.find((item) => item.provider === provider)?.configured);
  }

  providerLabel(provider: BillingProvider): string {
    return provider === 'stripe' ? 'Stripe' : 'Mercado Pago';
  }

  invoiceTenantName(invoice: PlatformBillingInvoiceRecord): string {
    return this.ecosystem.tenants().find((tenant) => tenant.id === invoice.tenantId)?.name || invoice.tenantId;
  }

  invoiceStatusLabel(status: PlatformBillingInvoiceRecord['status']): string {
    switch (status) {
      case 'paid': return 'Paga';
      case 'pending': return 'Pendente';
      case 'failed': return 'Falhou';
      case 'refunded': return 'Estornada';
    }
  }

  invoiceStatusClass(status: PlatformBillingInvoiceRecord['status']): string {
    if (status === 'paid') return 'rounded-full bg-emerald-950 px-2 py-1 text-[10px] font-bold text-emerald-300';
    if (status === 'failed') return 'rounded-full bg-rose-950 px-2 py-1 text-[10px] font-bold text-rose-300';
    if (status === 'refunded') return 'rounded-full bg-stone-800 px-2 py-1 text-[10px] font-bold text-stone-300';
    return 'rounded-full bg-amber-950 px-2 py-1 text-[10px] font-bold text-amber-200';
  }

  statusLabel(status?: string): string {
    switch (status) {
      case 'checkout_creating': return 'Gerando checkout';
      case 'pending_payment': return 'Aguardando pagamento';
      case 'active': return 'Ativa';
      case 'past_due': return 'Pagamento pendente';
      case 'paused': return 'Pausada no provedor';
      case 'cancelled': return 'Cancelada';
      case 'failed': return 'Checkout falhou';
      default: return 'Sem assinatura';
    }
  }

  statusClass(status?: string): string {
    if (status === 'active') return 'rounded-full bg-emerald-950 px-2 py-1 text-[10px] font-bold text-emerald-300';
    if (status === 'past_due' || status === 'failed') return 'rounded-full bg-rose-950 px-2 py-1 text-[10px] font-bold text-rose-300';
    if (status === 'cancelled') return 'rounded-full bg-stone-800 px-2 py-1 text-[10px] font-bold text-stone-400';
    return 'rounded-full bg-amber-950 px-2 py-1 text-[10px] font-bold text-amber-200';
  }

  async createCheckout(tenant: CompanyTenant): Promise<void> {
    if (this.busyTenantId()) return;
    this.busyTenantId.set(tenant.id);
    this.loadError.set('');
    this.checkoutUrl.set('');
    try {
      const result = await this.hqApi.createSubscriptionCheckout(tenant.id, this.selectedProvider());
      this.checkoutUrl.set(result.subscription.checkoutUrl || '');
      this.checkoutTenantName.set(tenant.name);
      await this.loadDashboard();
    } catch {
      this.loadError.set('Não foi possível gerar o checkout. Verifique o e-mail da loja, o preço do plano e as credenciais/webhook do provedor.');
    } finally {
      this.busyTenantId.set(null);
    }
  }

  async cancelSubscription(tenantId: string): Promise<void> {
    if (this.busyTenantId()) return;
    const tenantName = this.ecosystem.tenants().find((tenant) => tenant.id === tenantId)?.name || tenantId;
    if (!window.confirm(`Cancelar a assinatura de ${tenantName} no provedor de pagamento?`)) return;
    this.busyTenantId.set(tenantId);
    this.loadError.set('');
    try {
      await this.hqApi.cancelSubscription(tenantId);
      await this.loadDashboard();
    } catch {
      this.loadError.set('O provedor não confirmou o cancelamento; a assinatura continua como estava.');
    } finally {
      this.busyTenantId.set(null);
    }
  }

  async copyCheckoutUrl(): Promise<void> {
    const url = this.checkoutUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      this.loadError.set('Não foi possível copiar o link. Selecione e copie o endereço exibido.');
    }
  }
}
