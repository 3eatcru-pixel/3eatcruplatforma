import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { InventoryService } from '../../services/inventory.service';
import { EcosystemService } from '../../services/ecosystem.service';
import { ProductItem } from '../../models/ecosystem.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-inventory',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#140b06] text-stone-200 font-mono select-none overflow-hidden p-4 space-y-4">
      
      <!-- HEADER ESTOQUE ERP -->
      <div class="flex flex-wrap items-center justify-between gap-3 bg-[#1c0d06] p-3 rounded-2xl border border-[#381c0c] shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-500 flex items-center justify-center">
            <mat-icon class="text-xl">inventory_2</mat-icon>
          </div>
          <div>
            <h2 class="text-sm font-serif font-black text-white">Estoque ERP & Catálogo</h2>
            <p class="text-[10px] text-stone-400">Cadastro de produtos, controle de saldos, custo e tributação NF-e.</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="showNewModal.set(true)"
            class="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black text-xs uppercase rounded-xl cursor-pointer shadow flex items-center gap-1">
            <mat-icon class="text-sm">add</mat-icon>
            <span>Novo Produto</span>
          </button>
        </div>
      </div>

      <!-- BARRA DE BUSCA E FILTROS -->
      <div class="flex items-center gap-2 bg-[#1b0d06] border border-[#381c0c] rounded-xl px-3 py-2 shrink-0">
        <mat-icon class="text-stone-500 text-sm">search</mat-icon>
        <input
          type="text"
          [value]="search()"
          (input)="search.set($any($event.target).value)"
          placeholder="Filtrar por nome, SKU ou código de barras..."
          class="flex-1 bg-transparent border-none text-xs text-white outline-none" />
        @if (search()) {
          <button (click)="search.set('')" class="text-stone-500 hover:text-white cursor-pointer">
            <mat-icon class="text-xs">close</mat-icon>
          </button>
        }
      </div>

      <!-- TABELA DE PRODUTOS -->
      <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar border border-[#381c0c] rounded-2xl bg-[#180b04]">
        <table class="w-full text-left text-xs font-mono">
          <thead class="bg-[#200e05] text-stone-400 border-b border-[#381c0c] sticky top-0">
            <tr>
              <th class="p-3">Produto</th>
              <th class="p-3">Categoria</th>
              <th class="p-3 text-right">Saldo Estoque</th>
              <th class="p-3 text-right">Preço Venda</th>
              <th class="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#2a1307]">
            @for (p of filteredProducts(); track p.id) {
              <tr class="hover:bg-[#200e05]/60 transition-colors">
                <td class="p-3">
                  <div class="font-bold text-white">{{ p.name }}</div>
                  <div class="text-[10px] text-stone-500">SKU: {{ p.sku }} • EAN: {{ p.barcode || 'N/A' }}</div>
                </td>
                <td class="p-3 text-stone-300">
                  <span class="px-2 py-0.5 rounded-lg bg-[#261207] text-[10px] border border-[#381c0c]">
                    {{ p.category }}
                  </span>
                </td>
                <td class="p-3 text-right">
                  <span
                    [class]="(p.stock || 0) <= 5 ? 'text-rose-400 font-black' : 'text-stone-300'"
                    class="font-mono">
                    {{ p.stock }} un
                  </span>
                </td>
                <td class="p-3 text-right font-black text-amber-400">
                  R$ {{ p.price.toFixed(2) }}
                </td>
                <td class="p-3 text-right">
                  <div class="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      (click)="quickAddStock(p, 5)"
                      class="px-2 py-1 bg-[#261207] hover:bg-[#381c0c] text-emerald-400 rounded-lg text-[10px] font-bold border border-[#482814] cursor-pointer"
                      title="Entrada rápida de +5 unidades">
                      +5
                    </button>
                    <button
                      type="button"
                      (click)="quickAddStock(p, -1)"
                      class="px-2 py-1 bg-[#261207] hover:bg-[#381c0c] text-rose-400 rounded-lg text-[10px] font-bold border border-[#482814] cursor-pointer"
                      title="Baixa de 1 unidade">
                      -1
                    </button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- MODAL NOVO PRODUTO -->
      @if (showNewModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div class="bg-[#180b04] border-2 border-amber-600/70 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 class="font-serif font-black text-white text-base">Novo Produto no Estoque</h3>
            
            <div class="space-y-2">
              <div>
                <label for="new-prod-name" class="text-[11px] text-stone-400 block font-bold">Nome do Produto:</label>
                <input
                  id="new-prod-name"
                  type="text"
                  [value]="newProdName()"
                  (input)="newProdName.set($any($event.target).value)"
                  placeholder="Ex: Coca-Cola 350ml"
                  class="w-full bg-[#120803] border border-[#482814] text-white p-2 rounded-xl text-xs outline-none" />
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label for="new-prod-price" class="text-[11px] text-stone-400 block font-bold">Preço de Venda (R$):</label>
                  <input
                    id="new-prod-price"
                    type="number"
                    step="0.01"
                    [value]="newProdPrice()"
                    (input)="newProdPrice.set(+$any($event.target).value)"
                    class="w-full bg-[#120803] border border-[#482814] text-white p-2 rounded-xl text-xs outline-none" />
                </div>
                <div>
                  <label for="new-prod-stock" class="text-[11px] text-stone-400 block font-bold">Saldo Inicial:</label>
                  <input
                    id="new-prod-stock"
                    type="number"
                    [value]="newProdStock()"
                    (input)="newProdStock.set(+$any($event.target).value)"
                    class="w-full bg-[#120803] border border-[#482814] text-white p-2 rounded-xl text-xs outline-none" />
                </div>
              </div>

              <div>
                <label for="new-prod-cat" class="text-[11px] text-stone-400 block font-bold">Categoria:</label>
                <input
                  id="new-prod-cat"
                  type="text"
                  [value]="newProdCat()"
                  (input)="newProdCat.set($any($event.target).value)"
                  placeholder="Ex: Bebidas"
                  class="w-full bg-[#120803] border border-[#482814] text-white p-2 rounded-xl text-xs outline-none" />
              </div>
            </div>

            <div class="flex gap-2 pt-2">
              <button
                type="button"
                (click)="showNewModal.set(false)"
                class="flex-1 py-2 rounded-xl border border-stone-700 text-stone-300 text-xs font-bold uppercase cursor-pointer">
                Cancelar
              </button>
              <button
                type="button"
                (click)="createProduct()"
                class="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-black text-xs uppercase cursor-pointer">
                Salvar Produto
              </button>
            </div>
          </div>
        </div>
      }

    </div>
  `
})
export class EAppInventoryWindow {
  readonly inventoryService = inject(InventoryService);
  readonly ecosystem = inject(EcosystemService);

  readonly search = signal<string>('');
  readonly showNewModal = signal<boolean>(false);

  readonly newProdName = signal<string>('');
  readonly newProdPrice = signal<number>(10);
  readonly newProdStock = signal<number>(20);
  readonly newProdCat = signal<string>('Geral');

  readonly filteredProducts = computed(() => {
    const q = this.search().toLowerCase().trim();
    const prods = this.inventoryService.products();
    if (!q) return prods;
    return prods.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.includes(q))
    );
  });

  quickAddStock(p: ProductItem, delta: number) {
    const newStock = Math.max(0, (p.stock || 0) + delta);
    this.inventoryService.updateProduct(p.id, { stock: newStock });
  }

  createProduct() {
    if (!this.newProdName()) return;
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    this.inventoryService.createProduct({
      name: this.newProdName(),
      price: this.newProdPrice(),
      costPrice: this.newProdPrice() * 0.5,
      stock: this.newProdStock(),
      category: this.newProdCat(),
      sku: 'SKU-' + Date.now().toString().slice(-4),
      barcode: '789' + Math.floor(Math.random() * 9000000000),
      tenantId
    });
    this.showNewModal.set(false);
    this.newProdName.set('');
  }
}
