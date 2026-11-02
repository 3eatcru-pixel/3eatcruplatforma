import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EcosystemService } from '../../services/ecosystem.service';
import { roundCurrencyAmount } from '../../../shared/utils/money.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-store-manager',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#140b06] text-stone-200 font-mono select-none overflow-hidden p-4 space-y-4">
      
      <!-- HEADER GERENCIADOR DA LOJA PÚBLICA -->
      <div class="flex items-center justify-between gap-3 bg-[#1c0d06] p-3 rounded-2xl border border-[#381c0c] shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black">
            <mat-icon class="text-xl">storefront</mat-icon>
          </div>
          <div>
            <h2 class="text-sm font-serif font-black text-white">Minha Loja • Gerenciador da Vitrine</h2>
            <p class="text-[10px] text-stone-400">Edite o perfil e as condições dos pedidos desta loja. O catálogo de produtos e o marketplace geral são gerenciados em outros módulos.</p>
          </div>
        </div>

        <button
          type="button"
          (click)="saveChanges()"
          [disabled]="isSaving() || !tenantId() || !hasChanges()"
          class="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black text-xs uppercase rounded-xl cursor-pointer shadow flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
          <mat-icon class="text-sm">save</mat-icon>
          <span>{{ isSaving() ? 'Salvando…' : hasChanges() ? 'Salvar alterações' : 'Tudo salvo' }}</span>
        </button>
      </div>

      <!-- FORMULÁRIO DE CUSTOMIZAÇÃO -->
      <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-4">
        
        <div class="bg-[#180b04] border border-[#381c0c] rounded-2xl p-4 space-y-3">
          <h3 class="text-xs font-bold text-white uppercase">Dados do Estabelecimento</h3>

          <div class="space-y-2">
            <div>
              <label for="store-name-input" class="text-[11px] text-stone-400 block font-bold">Nome da Loja:</label>
              <input
                id="store-name-input"
                type="text"
                maxlength="120"
                [value]="storeName()"
                (input)="storeName.set($any($event.target).value)"
                class="w-full bg-[#120803] border border-[#482814] text-white p-2 rounded-xl text-xs outline-none focus:border-amber-500" />
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label for="store-taxa-input" class="text-[11px] text-stone-400 block font-bold">Taxa paga pelo cliente (R$):</label>
                <input
                  id="store-taxa-input"
                  type="number"
                  min="0"
                  step="0.01"
                  [value]="deliveryFee() ?? ''"
                  (input)="setOptionalAmount('deliveryFee', $any($event.target).value)"
                  class="w-full bg-[#120803] border border-[#482814] text-white p-2 rounded-xl text-xs outline-none focus:border-amber-500" />
              </div>

              <div>
                <label for="store-store-contribution-input" class="text-[11px] text-stone-400 block font-bold">Complemento pago pela loja (R$):</label>
                <input
                  id="store-store-contribution-input"
                  type="number"
                  min="0"
                  step="0.01"
                  [value]="storeDeliveryContribution() ?? ''"
                  (input)="setOptionalAmount('storeDeliveryContribution', $any($event.target).value)"
                  class="w-full bg-[#120803] border border-[#482814] text-white p-2 rounded-xl text-xs outline-none focus:border-amber-500" />
              </div>
            </div>

            <div class="rounded-xl border border-emerald-700/40 bg-emerald-950/30 p-3 text-[11px] text-stone-300 space-y-1">
              <p>O entregador recebe o total combinado: <strong class="text-emerald-300">R$ {{ driverCompensation().toFixed(2) }}</strong></p>
              <p>Cliente: R$ {{ (deliveryFee() ?? 0).toFixed(2) }} · Complemento da loja: R$ {{ (storeDeliveryContribution() ?? 0).toFixed(2) }}</p>
              <p class="text-[10px] text-stone-500">Exemplo: cliente R$ 4,00 + loja R$ 4,00 = R$ 8,00 para o entregador. O cliente paga apenas a parte dele no checkout; o complemento da loja é pago diretamente ao entregador. O sistema registra o combinado, mas não faz o repasse.</p>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label for="store-min-order-input" class="text-[11px] text-stone-400 block font-bold">Pedido Mínimo (R$):</label>
                <input
                  id="store-min-order-input"
                  type="number"
                  min="0"
                  step="0.01"
                  [value]="minOrder() ?? ''"
                  (input)="setOptionalAmount('minOrder', $any($event.target).value)"
                  class="w-full bg-[#120803] border border-[#482814] text-white p-2 rounded-xl text-xs outline-none focus:border-amber-500" />
              </div>
              <p class="self-end text-[10px] text-stone-500">Deixe taxa e pedido mínimo em branco se ainda não estiverem definidos. Sem taxa cadastrada, o checkout de entrega permanece indisponível.</p>
            </div>

            <div class="grid sm:grid-cols-2 gap-2">
              <label class="flex items-center gap-2 rounded-xl border border-[#482814] bg-[#120803] p-2 text-[11px] text-stone-300">
                <input type="checkbox" [checked]="supportsDelivery()" (change)="supportsDelivery.set($any($event.target).checked)" class="accent-amber-500" />
                <span>A loja oferece entrega própria</span>
              </label>
              <label class="flex items-center gap-2 rounded-xl border border-[#482814] bg-[#120803] p-2 text-[11px] text-stone-300">
                <input type="checkbox" [checked]="supportsTakeout()" (change)="supportsTakeout.set($any($event.target).checked)" class="accent-amber-500" />
                <span>A loja aceita retirada no balcão</span>
              </label>
              <label class="flex items-center gap-2 rounded-xl border border-[#482814] bg-[#120803] p-2 text-[11px] text-stone-300 sm:col-span-2">
                <input type="checkbox" [checked]="isOpen()" (change)="isOpen.set($any($event.target).checked)" class="accent-amber-500" />
                <span>A loja está aberta para receber pedidos online</span>
              </label>
            </div>

            <div>
              <label for="store-hours-input" class="text-[11px] text-stone-400 block font-bold">Horário informado aos clientes:</label>
              <input
                id="store-hours-input"
                type="text"
                maxlength="60"
                [value]="openingHours()"
                (input)="openingHours.set($any($event.target).value)"
                placeholder="Ex.: Seg a sáb, 11h às 22h"
                class="w-full bg-[#120803] border border-[#482814] text-white p-2 rounded-xl text-xs outline-none focus:border-amber-500" />
              <p class="text-[10px] text-stone-500 mt-1">Este horário é informativo; a abertura e o fechamento para pedidos são controlados separadamente.</p>
            </div>

            <div>
              <label for="store-desc-input" class="text-[11px] text-stone-400 block font-bold">Descrição da Vitrine:</label>
              <textarea
                id="store-desc-input"
                rows="2"
                maxlength="500"
                [value]="description()"
                (input)="description.set($any($event.target).value)"
                placeholder="Conte aos clientes o que torna sua loja especial."
                class="w-full bg-[#120803] border border-[#482814] text-white p-2 rounded-xl text-xs outline-none focus:border-amber-500"></textarea>
            </div>
          </div>
        </div>

        <div class="bg-[#180b04] border border-[#381c0c] rounded-2xl p-4 space-y-2">
          <h3 class="text-xs font-bold text-white uppercase">Link Direto da Vitrine</h3>
          <p class="text-[10px] text-stone-400">Compartilhe este link no Instagram ou WhatsApp dos clientes:</p>
          <div class="bg-[#200e05] p-3 rounded-xl border border-[#381c0c] text-xs text-amber-400 select-all font-mono">
            {{ appUrl() }}/p/{{ tenantId() }}
          </div>
        </div>

        <div class="bg-[#180b04] border border-[#381c0c] rounded-2xl p-4 space-y-2">
          <h3 class="text-xs font-bold text-white uppercase">Recebimento PIX da Loja</h3>
          <label for="store-pix-key" class="text-[11px] text-stone-400 block font-bold">Chave PIX da conta da loja:</label>
          <input
            id="store-pix-key"
            type="text"
            maxlength="77"
            autocomplete="off"
            [value]="pixKey()"
            (input)="pixKey.set($any($event.target).value)"
            placeholder="CPF/CNPJ, e-mail, telefone ou chave aleatória"
            class="w-full bg-[#120803] border border-[#482814] text-white p-2 rounded-xl text-xs outline-none focus:border-amber-500" />
          <p class="text-[10px] text-stone-400">O PIX do marketplace usa esta chave (até 77 caracteres) para direcionar o pagamento à conta da loja. O sistema não valida titularidade; a confirmação é manual. Cartão ficará disponível quando houver conexão de pagamento própria por loja.</p>
        </div>

      </div>

    </div>
  `
})
export class EAppStoreManagerWindow {
  readonly ecosystem = inject(EcosystemService);
  readonly isSaving = signal(false);

  readonly tenant = this.ecosystem.currentTenant;
  readonly tenantId = signal<string>(this.tenant()?.id ?? '');
  readonly storeName = signal<string>(this.tenant()?.name ?? '');
  readonly deliveryFee = signal<number | null>(this.tenant()?.deliveryFee ?? null);
  readonly storeDeliveryContribution = signal<number | null>(this.tenant()?.storeDeliveryContribution ?? 0);
  readonly minOrder = signal<number | null>(this.tenant()?.minOrderValue ?? null);
  readonly description = signal<string>(this.tenant()?.aboutText ?? '');
  readonly pixKey = signal<string>(this.tenant()?.pixKey ?? '');
  readonly supportsDelivery = signal<boolean>(this.tenant()?.supportsDelivery === true);
  readonly supportsTakeout = signal<boolean>(this.tenant()?.supportsTakeout !== false);
  readonly isOpen = signal<boolean>(this.tenant()?.isOpen === true);
  readonly openingHours = signal<string>(this.tenant()?.openingHours ?? '');
  readonly driverCompensation = computed(() => Number(((this.deliveryFee() ?? 0) + (this.storeDeliveryContribution() ?? 0)).toFixed(2)));
  private readonly savedValues = signal(this.currentValues());
  readonly hasChanges = computed(() => JSON.stringify(this.currentValues()) !== JSON.stringify(this.savedValues()));

  constructor() {
    effect(() => {
      const tenant = this.tenant();
      if (!tenant) return;
      this.tenantId.set(tenant.id);
      this.storeName.set(tenant.name ?? '');
      this.deliveryFee.set(tenant.deliveryFee ?? null);
      this.storeDeliveryContribution.set(tenant.storeDeliveryContribution ?? 0);
      this.minOrder.set(tenant.minOrderValue ?? null);
      this.description.set(tenant.aboutText ?? '');
      this.pixKey.set(tenant.pixKey ?? '');
      this.supportsDelivery.set(tenant.supportsDelivery === true);
      this.supportsTakeout.set(tenant.supportsTakeout !== false);
      this.isOpen.set(tenant.isOpen === true);
      this.openingHours.set(tenant.openingHours ?? '');
      this.savedValues.set({
        name: (tenant.name ?? '').trim(),
        deliveryFee: tenant.deliveryFee ?? null,
        storeDeliveryContribution: tenant.storeDeliveryContribution ?? 0,
        minOrderValue: tenant.minOrderValue ?? null,
        aboutText: (tenant.aboutText ?? '').trim(),
        pixKey: (tenant.pixKey ?? '').trim(),
        supportsDelivery: tenant.supportsDelivery === true,
        supportsTakeout: tenant.supportsTakeout !== false,
        isOpen: tenant.isOpen === true,
        openingHours: (tenant.openingHours ?? '').trim()
      });
    });
  }

  private currentValues() {
    return {
      name: this.storeName().trim(),
      deliveryFee: this.deliveryFee(),
      storeDeliveryContribution: this.storeDeliveryContribution(),
      minOrderValue: this.minOrder(),
      aboutText: this.description().trim(),
      pixKey: this.pixKey().trim(),
      supportsDelivery: this.supportsDelivery(),
      supportsTakeout: this.supportsTakeout(),
      isOpen: this.isOpen(),
      openingHours: this.openingHours().trim()
    };
  }

  appUrl() {
    return typeof window === 'undefined' ? '' : window.location.origin;
  }

  setOptionalAmount(field: 'deliveryFee' | 'storeDeliveryContribution' | 'minOrder', rawValue: string) {
    const parsedValue = rawValue.trim() === '' ? null : Number(rawValue);
    const value = parsedValue === null ? null : roundCurrencyAmount(parsedValue);
    if (field === 'deliveryFee') this.deliveryFee.set(value);
    else if (field === 'storeDeliveryContribution') this.storeDeliveryContribution.set(value);
    else this.minOrder.set(value);
  }

  async saveChanges() {
    if (this.isSaving()) return;

    if (!this.hasChanges()) return;

    const values = this.currentValues();
    const tenantId = this.tenantId();
    if (!tenantId || !values.name || values.name.length > 120 ||
        (values.deliveryFee !== null && (!Number.isFinite(values.deliveryFee) || values.deliveryFee < 0)) ||
        (values.storeDeliveryContribution !== null && (!Number.isFinite(values.storeDeliveryContribution) || values.storeDeliveryContribution < 0)) ||
        (values.minOrderValue !== null && (!Number.isFinite(values.minOrderValue) || values.minOrderValue < 0)) ||
        values.pixKey.length > 77 || values.openingHours.length > 60 || values.aboutText.length > 500) {
      this.ecosystem.notify('Revise o nome, os valores opcionais, a descrição, o horário e a chave PIX.', 'warning');
      return;
    }

    this.isSaving.set(true);
    try {
      await this.ecosystem.updateTenant(tenantId, {
        ...values,
        aboutText: values.aboutText || null,
        pixKey: values.pixKey || null
      });
      if (this.tenantId() === tenantId) this.savedValues.set(values);
      this.ecosystem.notify(
        this.ecosystem.isSimulationMode()
          ? 'Alterações salvas somente na simulação.'
          : 'Configurações da loja atualizadas.',
        this.ecosystem.isSimulationMode() ? 'info' : 'success'
      );
    } catch {
      this.ecosystem.notify('Não foi possível salvar as configurações da loja.', 'error');
    } finally {
      this.isSaving.set(false);
    }
  }
}
