import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartItem } from '../../../models/ecosystem.model';

interface HeldSaleView {
  id: string;
  saleNumber: number;
  tableOrClient: string;
  items: CartItem[];
  total: number;
  time: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-pos-recall-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"><section class="w-full max-w-lg space-y-4 rounded-2xl border border-[#70411f] bg-[#140b06] p-5 text-stone-200">
      <header class="flex justify-between"><h2 class="font-black text-white">Vendas em espera</h2><button type="button" (click)="closeRequest.emit()">✕</button></header>
      <div class="max-h-[60vh] space-y-2 overflow-auto">@for (sale of heldSales(); track sale.id) { <button type="button" (click)="recall.emit(sale)" class="flex w-full justify-between rounded-xl border border-[#482814] bg-[#0b0705] p-3 text-left"><span><strong class="block text-sm text-white">Venda #{{ sale.saleNumber }} · {{ sale.tableOrClient }}</strong><small class="text-stone-500">{{ sale.items.length }} item(ns) · {{ sale.time }}</small></span><strong class="text-amber-400">R$ {{ sale.total.toFixed(2) }}</strong></button> } @empty { <p class="p-8 text-center text-sm text-stone-500">Não há vendas aguardando.</p> }</div>
    </section></div>
  `
})
export class PosRecallModal {
  readonly heldSales = input<HeldSaleView[]>([]);
  readonly closeRequest = output<void>();
  readonly recall = output<HeldSaleView>();
}
