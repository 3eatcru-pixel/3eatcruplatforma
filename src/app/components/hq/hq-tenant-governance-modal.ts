import { ChangeDetectionStrategy, Component, input, output, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { EcosystemService } from '../../services/ecosystem.service';
import type { HqTenantMetricsResponse } from '../../services/hq.service';
import { CompanyTenant, POSDevice } from '../../models/ecosystem.model';

@Component({
  selector: 'app-hq-tenant-governance-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (tenant(); as t) {
      <div class="fixed inset-0 z-[130] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <div class="bg-[#faf7f0] border-2 border-[#d6c7b0] rounded-3xl max-w-3xl w-full p-6 text-stone-950 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6">
          
          <!-- MODAL HEADER -->
          <div class="flex justify-between items-start pb-4 border-b border-[#e8dfce]">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-amber-900 text-amber-100 flex items-center justify-center font-bold shadow-md">
                <mat-icon class="text-2xl">admin_panel_settings</mat-icon>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-[9px] font-mono bg-amber-900 text-amber-100 px-2 py-0.5 rounded font-bold uppercase">
                    Governança da Plataforma
                  </span>
                  <span class="text-[9px] font-mono text-stone-500 font-bold uppercase">
                    ID: {{ t.id }}
                  </span>
                </div>
                <h2 class="text-xl font-serif font-black text-stone-950 mt-1">{{ t.name }}</h2>
              </div>
            </div>

            <button
              type="button"
              (click)="dismiss.emit()"
              class="text-stone-400 hover:text-stone-800 p-2 rounded-xl hover:bg-stone-200 transition-colors cursor-pointer">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <!-- KEY BUSINESS METRICS OF THIS TENANT -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div class="bg-white p-3.5 rounded-2xl border border-[#e8dfce] shadow-sm">
              <span class="text-[9px] font-mono font-bold text-stone-500 uppercase block">Pedidos elegíveis (histórico)</span>
              @if (tenantMetricsStatus() === 'loading') {
                <div class="text-lg font-serif font-black text-stone-500 mt-0.5">Carregando...</div>
                <span class="text-[9px] text-stone-500 font-medium">Consultando os pedidos desta loja.</span>
              } @else if (tenantMetricsStatus() === 'loaded') {
                <div class="text-lg font-serif font-black text-stone-900 mt-0.5">{{ tenantMetrics()?.eligibleOrderCount ?? 0 }}</div>
                <span class="text-[9px] text-stone-600 font-medium">Volume registrado: {{ formatCurrency(tenantMetrics()?.eligibleOrderVolume ?? 0) }}</span>
              } @else {
                <div class="text-lg font-serif font-black text-stone-600 mt-0.5">Indisponível</div>
                <span class="text-[9px] text-stone-500 font-medium">{{ tenantMetricsStatus() === 'error' ? 'Não foi possível carregar o resumo.' : 'Resumo disponível no modo real.' }}</span>
              }
              <span class="text-[9px] text-stone-500 font-medium block mt-1">Pedidos reais elegíveis; inclui todo o histórico.</span>
            </div>

            <div class="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 shadow-sm">
              <span class="text-[9px] font-mono font-bold text-amber-800 uppercase block">Comissão da plataforma</span>
              <div class="text-lg font-serif font-black text-amber-900 mt-0.5">{{ platformCommissionStatus() === 'coming_soon' ? 'Em breve' : 'Rede ativa' }}</div>
              <span class="text-[9px] text-amber-700 font-bold">{{ platformCommissionStatus() === 'coming_soon' ? 'Não aplicada aos pedidos ou motoristas desta loja.' : 'Só considera entregas elegíveis feitas pela rede da plataforma.' }}</span>
            </div>

            <div class="bg-white p-3.5 rounded-2xl border border-[#e8dfce] shadow-sm">
              <span class="text-[9px] font-mono font-bold text-stone-500 uppercase block">Registros no inventário</span>
              <div class="text-lg font-serif font-black text-stone-900 mt-0.5">
                {{ storeDevices().length }} / {{ currentDeviceLimit() }}
              </div>
              <span class="text-[9px] text-stone-500 font-medium">Conexão física não verificada</span>
            </div>

            <div class="bg-white p-3.5 rounded-2xl border border-[#e8dfce] shadow-sm">
              <span class="text-[9px] font-mono font-bold text-stone-500 uppercase block">Status da Conta</span>
              <div class="mt-1 flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full" [class]="currentStatus() === 'active' ? 'bg-emerald-500' : 'bg-rose-500'"></span>
                <span class="text-xs font-black uppercase text-stone-800">{{ currentStatus() }}</span>
              </div>
              <span class="text-[9px] text-stone-500 font-medium">Plano {{ currentPlan() }}</span>
            </div>
          </div>

          <!-- TENANT REGISTRATION & FISCAL DATA -->
          <div class="bg-white p-4 rounded-2xl border border-[#e8dfce] space-y-2 text-xs">
            <h3 class="font-serif font-black text-xs uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
              <mat-icon class="text-sm">verified</mat-icon> Ficha Cadastral &amp; Fiscal
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-stone-700 font-medium">
              <div><strong class="text-stone-900">Razão Social:</strong> {{ t.legalName }}</div>
              <div><strong class="text-stone-900">CNPJ:</strong> {{ t.cnpj }}</div>
              <div><strong class="text-stone-900">Contato:</strong> {{ t.contactEmail }} • {{ t.phone }}</div>
              <div><strong class="text-stone-900">Localização:</strong> {{ t.address.street }}, {{ t.address.number }} - {{ t.address.city }}/{{ t.address.state }}</div>
            </div>
          </div>

          <section class="bg-white p-4 rounded-2xl border border-[#e8dfce] space-y-3 text-xs" aria-labelledby="tenantOwnerHeading">
            <div>
              <h3 id="tenantOwnerHeading" class="font-serif font-black text-xs uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <mat-icon class="text-sm">person_check</mat-icon> Responsável da Loja
              </h3>
              @if (ownerLinkedUid() || t.ownerUid) {
                <p class="mt-1 text-stone-700">Conta vinculada: <code class="font-mono text-[10px]">{{ ownerLinkedUid() || t.ownerUid }}</code></p>
                @if (ownerEmail()) {
                  <p class="text-stone-600">E-mail: {{ ownerEmail() }}{{ ownerEmailVerified() === false ? ' • não confirmado' : '' }}</p>
                } @else if (ownerLookupMessage()) {
                  <p class="text-amber-800">{{ ownerLookupMessage() }}</p>
                } @else if (isLoadingOwner()) {
                  <p class="text-stone-500">Consultando conta...</p>
                }
              } @else {
                <p class="mt-1 text-stone-600">Nenhuma conta responsável está vinculada a este tenant.</p>
              }
            </div>
            <div class="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-end">
              <div>
                <label for="tenantOwnerEmail" class="block font-bold text-stone-800 mb-1">E-mail da conta já cadastrada</label>
                <input
                  id="tenantOwnerEmail"
                  type="email"
                  autocomplete="email"
                  [value]="ownerEmail()"
                  (input)="ownerEmail.set($any($event.target).value)"
                  placeholder="responsavel@empresa.com.br"
                  class="w-full bg-white border border-[#d6c7b0] rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:border-amber-600">
              </div>
              <button
                type="button"
                (click)="linkOwner(t.id)"
                [disabled]="isLinkingOwner() || !ownerEmail().trim()"
                class="bg-amber-900 hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-4 py-2 rounded-xl flex items-center justify-center gap-1.5">
                <mat-icon class="text-sm">link</mat-icon>
                <span>{{ isLinkingOwner() ? 'Vinculando...' : 'Vincular responsável' }}</span>
              </button>
            </div>
            <p class="text-[10px] text-stone-500">A conta precisa existir e ter o e-mail confirmado. O vínculo não cria usuário nem substitui outro responsável; a pessoa deverá entrar novamente para receber as permissões atualizadas.</p>
            @if (ownerLinkError()) {
              <p role="alert" class="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-900">{{ ownerLinkError() }}</p>
            }
            @if (ownerLinkSuccess()) {
              <p role="status" class="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">{{ ownerLinkSuccess() }}</p>
            }
          </section>

          <!-- SAAS PLATFORM GOVERNANCE CONTROLS -->
          <div class="bg-[#f2e8d5] p-5 rounded-2xl border border-[#e0d2bb] space-y-4">
            <h3 class="font-serif font-black text-xs uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
              <mat-icon class="text-sm">tune</mat-icon> Parâmetros Operacionais da Plataforma
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label for="govPlan" class="block font-bold text-stone-800 mb-1 uppercase text-[10px]">Plano cadastrado</label>
                <select
                  id="govPlan"
                  [value]="currentPlan()"
                  (change)="currentPlan.set($any($event.target).value)"
                  class="w-full bg-white border border-[#d6c7b0] rounded-xl px-3 py-2 text-stone-900 font-bold focus:outline-none focus:border-amber-600">
                  <option value="Starter">Starter</option>
                  <option value="Professional">Professional</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
                <p class="mt-1 text-[9px] text-stone-600">O plano cadastrado não altera a cota automaticamente.</p>
              </div>

              <div>
                <label for="govDeviceLimit" class="block font-bold text-stone-800 mb-1 uppercase text-[10px]">Cota de registros</label>
                <input
                  id="govDeviceLimit"
                  type="number"
                  min="1"
                  max="999"
                  [value]="currentDeviceLimit()"
                  (input)="currentDeviceLimit.set(+$any($event.target).value)"
                  class="w-full bg-white border border-[#d6c7b0] rounded-xl px-3 py-2 text-stone-900 font-bold focus:outline-none focus:border-amber-600">
                <p class="mt-1 text-[9px] text-stone-600">O servidor bloqueia novos registros ao atingir a cota. O número representa registros no inventário, não conexões físicas.</p>
              </div>

              <div>
                <label for="govRadius" class="block font-bold text-stone-800 mb-1 uppercase text-[10px]">Raio Máx. Entrega (km)</label>
                <input
                  id="govRadius"
                  type="number"
                  min="1"
                  max="50"
                  [value]="currentDeliveryRadius()"
                  (input)="currentDeliveryRadius.set(+$any($event.target).value)"
                  class="w-full bg-white border border-[#d6c7b0] rounded-xl px-3 py-2 text-stone-900 font-bold focus:outline-none focus:border-amber-600">
              </div>

              <div>
                <label for="govStatus" class="block font-bold text-stone-800 mb-1 uppercase text-[10px]">Status da Loja na Plataforma</label>
                <select
                  id="govStatus"
                  [value]="currentStatus()"
                  (change)="currentStatus.set($any($event.target).value)"
                  class="w-full bg-white border border-[#d6c7b0] rounded-xl px-3 py-2 text-stone-900 font-bold focus:outline-none focus:border-amber-600">
                  <option value="active">Ativa</option>
                  <option value="suspended">Suspensa</option>
                  <option value="trial">Período de Demonstração (Trial)</option>
                </select>
              </div>

              <div>
                <label for="govStoreOpen" class="block font-bold text-stone-800 mb-1 uppercase text-[10px]">Aberta para receber pedidos</label>
                <select
                  id="govStoreOpen"
                  [value]="currentStoreOpen() ? 'true' : 'false'"
                  (change)="currentStoreOpen.set($any($event.target).value === 'true')"
                  class="w-full bg-white border border-[#d6c7b0] rounded-xl px-3 py-2 text-stone-900 font-bold focus:outline-none focus:border-amber-600">
                  <option value="true">Aberta</option>
                  <option value="false">Fechada</option>
                </select>
              </div>
            </div>
          </div>

          <!-- PAIRED MDM DEVICES FOR THIS TENANT -->
          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <h3 class="font-serif font-black text-xs uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <mat-icon class="text-sm">devices</mat-icon> Registros no inventário ({{ storeDevices().length }})
              </h3>
            </div>

            @if (storeDevices().length > 0) {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                @for (dev of storeDevices(); track dev.id) {
                  <div class="bg-white p-3 rounded-xl border border-[#e8dfce] flex justify-between items-center text-xs">
                    <div>
                      <div class="font-bold text-stone-900 flex items-center gap-1">
                        <mat-icon class="text-xs text-amber-800">desktop_windows</mat-icon>
                        <span>{{ dev.deviceName }}</span>
                      </div>
                      <div class="text-[9px] font-mono text-stone-500">{{ dev.serialNumber }} • {{ dev.location }}</div>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <button
                        type="button"
                        (click)="ecosystem.restartDevice(dev.id)"
                        class="p-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700"
                        title="Registrar solicitação; não reinicia o equipamento">
                        <mat-icon class="text-xs">refresh</mat-icon>
                      </button>
                      <button
                        type="button"
                        (click)="ecosystem.lockDevice(dev.id)"
                        class="p-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700"
                        title="Alterar status no inventário; não bloqueia o equipamento">
                        <mat-icon class="text-xs">lock</mat-icon>
                      </button>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div class="p-4 bg-white rounded-xl border border-[#e8dfce] text-center text-xs text-stone-500 font-serif italic">
                Nenhum dispositivo registrado para esta unidade.
              </div>
            }
          </div>

          <!-- ACTIONS FOOTER -->
          <div class="pt-4 border-t border-[#e8dfce] flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              (click)="openPublicStorefront(t.id)"
              class="bg-white hover:bg-stone-100 text-stone-900 border border-[#d6c7b0] px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm">
              <mat-icon class="text-sm text-emerald-600">storefront</mat-icon>
              <span>Ver Vitrine do Consumidor (Pública)</span>
            </button>

            <div class="flex items-center gap-2">
              <button
                type="button"
                (click)="dismiss.emit()"
                class="px-4 py-2.5 rounded-xl text-xs font-bold text-stone-600 hover:text-stone-900 cursor-pointer">
                Cancelar
              </button>
              <button
                type="button"
                (click)="saveGovernance()"
                [disabled]="isSaving()"
                class="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-black px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg cursor-pointer active:scale-95 transition-all">
                <mat-icon class="text-sm">save</mat-icon>
                <span>{{ isSaving() ? 'Salvando...' : 'Salvar Parâmetros da Loja' }}</span>
              </button>
            </div>
            @if (saveError()) {
              <p role="alert" class="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-900">{{ saveError() }}</p>
            }
          </div>

        </div>
      </div>
    }
  `
})
export class HqTenantGovernanceModalComponent {
  readonly ecosystem = inject(EcosystemService);
  private readonly router = inject(Router);
  readonly platformCommissionStatus = computed(() => this.ecosystem.hqOverview()?.platformDeliveryCommissionStatus ?? 'coming_soon');

  tenant = input<CompanyTenant | null>(null);
  dismiss = output<void>();

  readonly currentPlan = signal<'Starter' | 'Professional' | 'Enterprise'>('Professional');
  readonly currentDeviceLimit = signal<number>(5);
  readonly currentDeliveryRadius = signal<number>(10);
  readonly currentStatus = signal<'active' | 'suspended' | 'trial'>('active');
  readonly currentStoreOpen = signal<boolean>(false);
  readonly isSaving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly ownerEmail = signal('');
  readonly ownerEmailVerified = signal<boolean | null>(null);
  readonly ownerLinkedUid = signal<string | null>(null);
  readonly isLoadingOwner = signal(false);
  readonly ownerLookupMessage = signal<string | null>(null);
  readonly isLinkingOwner = signal(false);
  readonly ownerLinkError = signal<string | null>(null);
  readonly ownerLinkSuccess = signal<string | null>(null);
  readonly tenantMetrics = signal<HqTenantMetricsResponse | null>(null);
  readonly tenantMetricsStatus = signal<'idle' | 'loading' | 'loaded' | 'error' | 'unavailable'>('idle');

  constructor() {
    let observedTenantId: string | null = null;
    effect(() => {
      const t = this.tenant();
      if ((t?.id ?? null) !== observedTenantId) {
        observedTenantId = t?.id ?? null;
        this.tenantMetrics.set(null);
        this.tenantMetricsStatus.set(t ? 'loading' : 'idle');
        this.ownerEmail.set('');
        this.ownerEmailVerified.set(null);
        this.ownerLinkedUid.set(null);
        this.isLoadingOwner.set(false);
        this.ownerLookupMessage.set(null);
        this.ownerLinkError.set(null);
        this.ownerLinkSuccess.set(null);
        if (t) void this.loadTenantMetrics(t.id);
        if (t?.ownerUid) void this.loadOwner(t.id);
      }
      if (t) {
        this.currentPlan.set(t.plan);
        this.currentDeviceLimit.set(t.devicesLimit ?? 5);
        this.currentDeliveryRadius.set(t.deliveryRadiusKm ?? 10);
        this.currentStatus.set(t.status || 'active');
        this.currentStoreOpen.set(t.isOpen ?? (t.status === 'active'));
      }
    });
  }

  readonly storeDevices = computed<POSDevice[]>(() => {
    const t = this.tenant();
    if (!t) return [];
    return this.ecosystem.devices().filter((d: POSDevice) => d.tenantId === t.id);
  });

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  private async loadTenantMetrics(tenantId: string) {
    try {
      const metrics = await this.ecosystem.hqService.getTenantMetrics(tenantId);
      if (this.tenant()?.id !== tenantId) return;
      if (!metrics) {
        this.tenantMetricsStatus.set('unavailable');
        return;
      }
      this.tenantMetrics.set(metrics);
      this.tenantMetricsStatus.set('loaded');
    } catch {
      if (this.tenant()?.id === tenantId) this.tenantMetricsStatus.set('error');
    }
  }

  openPublicStorefront(tenantId: string) {
    this.ecosystem.currentTenantId.set(tenantId);
    this.router.navigate(['/p', tenantId]);
    this.dismiss.emit();
  }

  private async loadOwner(tenantId: string) {
    this.isLoadingOwner.set(true);
    try {
      const result = await this.ecosystem.getTenantOwner(tenantId);
      if (this.tenant()?.id !== tenantId) return;
      if (result.ownerUid) this.ownerLinkedUid.set(result.ownerUid);
      if (result.ownerEmail) this.ownerEmail.set(result.ownerEmail);
      this.ownerEmailVerified.set(result.emailVerified);
      if (result.ownerUid && !result.ownerEmail) {
        this.ownerLookupMessage.set('A conta vinculada não foi localizada ou não possui e-mail disponível.');
      }
    } catch {
      if (this.tenant()?.id === tenantId) this.ownerLookupMessage.set('Não foi possível consultar o e-mail da conta vinculada.');
    } finally {
      if (this.tenant()?.id === tenantId) this.isLoadingOwner.set(false);
    }
  }

  async linkOwner(tenantId: string) {
    const email = this.ownerEmail().trim();
    if (!email || this.isLinkingOwner()) return;

    this.isLinkingOwner.set(true);
    this.ownerLinkError.set(null);
    this.ownerLinkSuccess.set(null);
    try {
      const result = await this.ecosystem.linkTenantOwner(tenantId, email);
      this.ownerEmail.set(result.ownerEmail);
      this.ownerEmailVerified.set(true);
      this.ownerLinkedUid.set(result.ownerUid);
      this.ownerLinkSuccess.set(`Responsável vinculado: ${result.ownerEmail}. A pessoa deve entrar novamente para atualizar as permissões.`);
      this.ecosystem.notify('Responsável da loja vinculado com sucesso.', 'success');
    } catch (error) {
      const response = error as { error?: { error?: string } };
      this.ownerLinkError.set(response.error?.error || 'Não foi possível vincular a conta. Confira o e-mail e tente novamente.');
    } finally {
      this.isLinkingOwner.set(false);
    }
  }

  async saveGovernance() {
    const t = this.tenant();
    if (!t || this.isSaving()) return;

    const devicesLimit = this.currentDeviceLimit();
    const deliveryRadiusKm = this.currentDeliveryRadius();
    if (!Number.isInteger(devicesLimit) || devicesLimit < 1 || devicesLimit > 999 ||
        !Number.isFinite(deliveryRadiusKm) || deliveryRadiusKm < 1 || deliveryRadiusKm > 50) {
      this.saveError.set('Informe uma cota inteira de 1 a 999 e um raio entre 1 e 50 km.');
      return;
    }

    this.isSaving.set(true);
    this.saveError.set(null);
    try {
      await this.ecosystem.updateTenant(t.id, {
        plan: this.currentPlan(),
        devicesLimit,
        deliveryRadiusKm,
        status: this.currentStatus(),
        isOpen: this.currentStoreOpen()
      });
      this.ecosystem.notify(`Governança de "${t.name}" atualizada com sucesso.`, 'success');
      this.dismiss.emit();
    } catch {
      this.saveError.set('Não foi possível salvar os parâmetros. As alterações ainda não foram confirmadas no servidor.');
    } finally {
      this.isSaving.set(false);
    }
  }
}
