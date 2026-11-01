import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EcosystemService } from '../../services/ecosystem.service';
import { TenantsService } from '../../services/tenants.service';

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
            <p class="text-[10px] text-stone-400">Customização visual da vitrine pública (/p/:id) e cardápio online.</p>
          </div>
        </div>

        <button
          type="button"
          (click)="saveChanges()"
          class="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black text-xs uppercase rounded-xl cursor-pointer shadow flex items-center gap-1.5">
          <mat-icon class="text-sm">save</mat-icon>
          <span>Salvar Alterações</span>
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

      </div>

    </div>
  `
})
export class EAppStoreManagerWindow {
  readonly ecosystem = inject(EcosystemService);
  readonly tenants = inject(TenantsService);

  readonly tenant = this.ecosystem.currentTenant();
  readonly tenantId = signal<string>(this.tenant.id);
  readonly storeName = signal<string>(this.tenant.name);
  readonly deliveryFee = signal<number>(this.tenant.deliveryFee ?? 7.50);
  readonly minOrder = signal<number>(this.tenant.minOrderValue ?? 20.00);
  readonly description = signal<string>(this.tenant.aboutText || 'Especialidades culinárias artesanais e delivery rápido.');

  appUrl() {
    return window.location.origin;
  }

  saveChanges() {
    this.ecosystem.updateTenant(this.tenantId(), {
      name: this.storeName(),
      deliveryFee: this.deliveryFee(),
      minOrderValue: this.minOrder(),
      aboutText: this.description()
    });
    this.ecosystem.notify('Configurações da loja atualizadas com sucesso!', 'success');
  }
}
