import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EcosystemService } from '../../services/ecosystem.service';

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
            <p class="text-[10px] text-stone-400">Gerencie os dados da vitrine pública (/p/:id) e do cardápio desta loja. O marketplace geral da plataforma é configurado pelo HQ.</p>
          </div>
        </div>

        <button
          type="button"
          (click)="saveChanges()"
          [disabled]="isSaving() || !hasChanges()"
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
                [value]="storeName()"
                (input)="storeName.set($any($event.target).value)"
                class="w-full bg-[#120803] border border-[#482814] text-white p-2 rounded-xl text-xs outline-none focus:border-amber-500" />
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label for="store-taxa-input" class="text-[11px] text-stone-400 block font-bold">Taxa de Entrega Padrão (R$):</label>
                <input
                  id="store-taxa-input"
                  type="number"
                  step="0.50"
                  [value]="deliveryFee()"
                  (input)="deliveryFee.set(+$any($event.target).value)"
                  class="w-full bg-[#120803] border border-[#482814] text-white p-2 rounded-xl text-xs outline-none focus:border-amber-500" />
              </div>

              <div>
                <label for="store-min-order-input" class="text-[11px] text-stone-400 block font-bold">Pedido Mínimo (R$):</label>
                <input
                  id="store-min-order-input"
                  type="number"
                  step="1.00"
                  [value]="minOrder()"
                  (input)="minOrder.set(+$any($event.target).value)"
                  class="w-full bg-[#120803] border border-[#482814] text-white p-2 rounded-xl text-xs outline-none focus:border-amber-500" />
              </div>
            </div>

            <div>
              <label for="store-desc-input" class="text-[11px] text-stone-400 block font-bold">Descrição da Vitrine:</label>
              <textarea
                id="store-desc-input"
                rows="2"
                [value]="description()"
                (input)="description.set($any($event.target).value)"
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

  readonly tenant = this.ecosystem.currentTenant();
  readonly tenantId = signal<string>(this.tenant.id);
  readonly storeName = signal<string>(this.tenant.name);
  readonly deliveryFee = signal<number>(this.tenant.deliveryFee ?? 7.50);
  readonly minOrder = signal<number>(this.tenant.minOrderValue ?? 20.00);
  readonly description = signal<string>(this.tenant.aboutText || 'Especialidades culinárias artesanais e delivery rápido.');
  readonly pixKey = signal<string>(this.tenant.pixKey ?? '');
  private readonly savedValues = signal(this.currentValues());
  readonly hasChanges = computed(() => JSON.stringify(this.currentValues()) !== JSON.stringify(this.savedValues()));

  private currentValues() {
    return {
      name: this.storeName().trim(),
      deliveryFee: this.deliveryFee(),
      minOrderValue: this.minOrder(),
      aboutText: this.description().trim(),
      pixKey: this.pixKey().trim()
    };
  }

  appUrl() {
    return window.location.origin;
  }

  async saveChanges() {
    if (this.isSaving()) return;

    if (!this.hasChanges()) return;

    const values = this.currentValues();
    const name = values.name;
    const deliveryFee = this.deliveryFee();
    const minOrderValue = this.minOrder();
    const pixKey = values.pixKey;
    if (!name || !Number.isFinite(deliveryFee) || deliveryFee < 0 ||
        !Number.isFinite(minOrderValue) || minOrderValue < 0 || pixKey.length > 77) {
      this.ecosystem.notify('Informe nome, taxa, pedido mínimo e chave PIX válidos.', 'warning');
      return;
    }

    this.isSaving.set(true);
    try {
      await this.ecosystem.updateTenant(this.tenantId(), {
        name,
        deliveryFee,
        minOrderValue,
        aboutText: values.aboutText,
        pixKey
      });
      this.savedValues.set(values);
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
