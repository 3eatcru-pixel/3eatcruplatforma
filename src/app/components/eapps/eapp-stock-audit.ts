import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { InventoryService } from '../../services/inventory.service';

interface AuditItem {
  id: string;
  name: string;
  sku: string;
  systemStock: number;
  countedStock: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-stock-audit',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#140b06] text-stone-200 font-mono select-none overflow-hidden p-4 space-y-4">
      
      <!-- HEADER INVENTÁRIO CEGO -->
      <div class="flex items-center justify-between gap-3 bg-[#1c0d06] p-3 rounded-2xl border border-[#381c0c] shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-500 flex items-center justify-center">
            <mat-icon class="text-xl">fact_check</mat-icon>
          </div>
          <div>
            <h2 class="text-sm font-serif font-black text-white">Inventário Cego • Auditoria de Estoque</h2>
            <p class="text-[10px] text-stone-400">Contagem física de itens com coletor de dados para apuração de quebras.</p>
          </div>
        </div>

        <button
          type="button"
          (click)="finalizeAudit()"
          class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase rounded-xl cursor-pointer shadow flex items-center gap-1.5">
          <mat-icon class="text-sm">verified</mat-icon>
          <span>Concluir Auditoria</span>
        </button>
      </div>

      <!-- LISTA DE ITENS AUDITADOS -->
      <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar border border-[#381c0c] rounded-2xl bg-[#180b04]">
        <table class="w-full text-left text-xs font-mono">
          <thead class="bg-[#200e05] text-stone-400 border-b border-[#381c0c] sticky top-0">
            <tr>
              <th class="p-3">Produto / SKU</th>
              <th class="p-3 text-center">Contagem Física</th>
              <th class="p-3 text-center">Saldo no Sistema</th>
              <th class="p-3 text-right">Divergência</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#2a1307]">
            @for (item of auditItems(); track item.id) {
              <tr class="hover:bg-[#200e05]/60 transition-colors">
                <td class="p-3 font-bold text-white">
                  <div>{{ item.name }}</div>
                  <span class="text-[10px] text-stone-500 font-normal">SKU: {{ item.sku }}</span>
                </td>
                <td class="p-3 text-center">
                  <div class="inline-flex items-center gap-1 bg-[#241107] px-2 py-1 rounded-xl border border-[#482814]">
                    <button (click)="decrement(item.id)" class="w-5 h-5 flex items-center justify-center text-stone-400 hover:text-white cursor-pointer">-</button>
                    <span class="w-8 text-center font-black text-white">{{ item.countedStock }}</span>
                    <button (click)="increment(item.id)" class="w-5 h-5 flex items-center justify-center text-stone-400 hover:text-white cursor-pointer">+</button>
                  </div>
                </td>
                <td class="p-3 text-center text-stone-400">
                  {{ item.systemStock }} un
                </td>
                <td class="p-3 text-right font-black">
                  @let diff = item.countedStock - item.systemStock;
                  <span [class]="diff === 0 ? 'text-emerald-400' : diff < 0 ? 'text-rose-400' : 'text-amber-400'">
                    {{ diff > 0 ? '+' : '' }}{{ diff }} un
                  </span>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

    </div>
  `
})
export class EAppStockAuditWindow {
  readonly inventory = inject(InventoryService);

  readonly auditItems = signal<AuditItem[]>([
    { id: '1', name: 'Refrigerante Coca-Cola 350ml', sku: 'SKU-0012', systemStock: 48, countedStock: 48 },
    { id: '2', name: 'Carne Bovina Picanha Importada (kg)', sku: 'SKU-0084', systemStock: 15, countedStock: 14 },
    { id: '3', name: 'Cerveja Artesanal IPA 500ml', sku: 'SKU-0091', systemStock: 24, countedStock: 25 },
    { id: '4', name: 'Queijo Muçarela Fatiado (kg)', sku: 'SKU-0112', systemStock: 10, countedStock: 10 }
  ]);

  increment(id: string) {
    this.auditItems.update(items =>
      items.map(i => i.id === id ? { ...i, countedStock: i.countedStock + 1 } : i)
    );
  }

  decrement(id: string) {
    this.auditItems.update(items =>
      items.map(i => i.id === id ? { ...i, countedStock: Math.max(0, i.countedStock - 1) } : i)
    );
  }

  finalizeAudit() {
    alert('Auditoria concluída com sucesso! Ajustes de inventário homologados.');
  }
}
