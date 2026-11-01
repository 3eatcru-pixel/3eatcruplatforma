import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderTransaction } from '../../../models/ecosystem.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-pos-receipt-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"><section class="w-full max-w-sm rounded-2xl border border-[#70411f] bg-white p-5 font-mono text-stone-900">
      <header class="mb-4 flex justify-between"><h2 class="font-black">Comprovante não fiscal</h2><button type="button" (click)="closeRequest.emit()" aria-label="Fechar">✕</button></header>
      <p class="text-xs">Pedido {{ order().orderNumber }}</p><p class="text-xs">{{ order().createdAt | date:'short' }}</p>
      @if (customerCpf()) { <p class="mt-2 text-xs">CPF: {{ customerCpf() }}</p> }
      <div class="my-3 border-y border-dashed border-stone-400 py-2">@for (item of order().items; track item.product.id) { <div class="flex justify-between gap-2 text-xs"><span>{{ item.quantity }} × {{ item.product.name }}</span><span>R$ {{ (item.quantity * item.product.price).toFixed(2) }}</span></div> }</div>
      <div class="flex justify-between font-black"><span>Total</span><span>R$ {{ order().total.toFixed(2) }}</span></div><p class="mt-3 text-center text-[10px] text-stone-500">Este documento não substitui documento fiscal.</p>
      <button type="button" (click)="printReceipt()" class="mt-4 w-full rounded-lg bg-stone-900 py-2 text-sm font-bold text-white">Imprimir</button>
    </section></div>
  `
})
export class PosReceiptModal {
  readonly order = input.required<OrderTransaction>();
  readonly customerCpf = input('');
  readonly closeRequest = output<void>();

  printReceipt() {
    window.print();
  }
}
