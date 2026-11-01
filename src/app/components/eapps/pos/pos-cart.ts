import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartItem, CustomerProfile } from '../../../models/ecosystem.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-pos-cart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="flex h-full min-h-0 flex-col rounded-2xl border border-[#482814] bg-[#140b06] p-3 text-stone-200">
      <header class="flex items-center justify-between border-b border-[#482814] pb-2"><div><h2 class="font-black text-white">Venda #{{ currentSaleNumber() }}</h2><p class="text-[10px] text-stone-500">{{ selectedCustomer()?.name || 'Consumidor não identificado' }}</p></div><button type="button" (click)="holdSale.emit()" [disabled]="!cart().length" class="rounded-lg border border-[#482814] px-2 py-1 text-[10px] disabled:opacity-40">Guardar</button></header>
      <div class="relative py-2">
        <input class="w-full rounded-lg border border-[#482814] bg-[#0b0705] px-3 py-2 text-xs" placeholder="Buscar cliente por nome ou CPF" [value]="customerCpf()" (input)="customerCpf.set($any($event.target).value); customerSearch.emit($any($event.target).value)" />
        @if (customerSearchResults().length) { <div class="absolute z-10 mt-1 max-h-32 w-full overflow-auto rounded-lg border border-[#482814] bg-[#0b0705]">@for (customer of customerSearchResults(); track customer.id) { <button type="button" (click)="selectCustomer.emit(customer)" class="block w-full px-3 py-2 text-left text-xs hover:bg-[#30180c]">{{ customer.name }}</button> }</div> }
      </div>
      <div class="min-h-0 flex-1 space-y-2 overflow-y-auto py-2">
        @for (item of cart(); track item.product.id) {
          <article class="rounded-xl border border-[#382012] bg-[#0b0705] p-2">
            <div class="flex justify-between gap-2"><strong class="text-xs text-white">{{ item.product.name }}</strong><span class="text-xs text-amber-400">R$ {{ (item.product.price * item.quantity).toFixed(2) }}</span></div>
            <div class="mt-2 flex items-center gap-2"><button type="button" (click)="decrementQty.emit(item)" class="h-7 w-7 rounded bg-[#241107]">−</button><span class="text-xs">{{ item.quantity }}</span><button type="button" (click)="incrementQty.emit(item)" class="h-7 w-7 rounded bg-[#241107]">+</button><input class="ml-auto w-28 rounded border border-[#482814] bg-transparent px-2 py-1 text-[10px]" placeholder="Observação" [value]="item.notes || ''" (change)="updateItemNotes.emit({ item, notes: $any($event.target).value })" /></div>
          </article>
        } @empty { <p class="py-8 text-center text-xs text-stone-500">Adicione produtos para iniciar a venda.</p> }
      </div>
      <div class="space-y-1 border-t border-[#482814] pt-2 text-xs"><div class="flex justify-between"><span>Subtotal</span><span>R$ {{ cartSubtotal().toFixed(2) }}</span></div><div class="flex justify-between"><span>Desconto</span><span>R$ {{ (cartDiscount() + cartPromotionsDiscount()).toFixed(2) }}</span></div><div class="flex justify-between"><span>Impostos</span><span>R$ {{ cartTax().toFixed(2) }}</span></div><div class="flex justify-between text-base font-black text-white"><span>Total</span><span class="text-amber-400">R$ {{ cartTotal().toFixed(2) }}</span></div></div>
      <div class="mt-2 grid grid-cols-2 gap-2"><button type="button" (click)="openDiscount.emit()" class="rounded-lg border border-[#482814] py-2 text-[10px] font-bold">Desconto</button><button type="button" (click)="clearCart.emit()" class="rounded-lg border border-rose-900 py-2 text-[10px] font-bold text-rose-300">Limpar</button></div>
      @if (!isOnline()) { <p class="mt-2 rounded-lg border border-amber-800 bg-amber-950/50 p-2 text-[10px] text-amber-200">Sem conexão: Cartão e PIX indisponíveis. Dinheiro será registrado em contingência até sincronizar.</p> }
      <div class="mt-2 grid grid-cols-3 gap-2"><button type="button" (click)="checkout.emit('cash')" [disabled]="!cart().length" class="rounded-lg bg-emerald-700 py-2 text-[10px] font-black disabled:opacity-40">Dinheiro</button><button type="button" (click)="checkout.emit('card')" [disabled]="!cart().length || !isOnline()" class="rounded-lg bg-indigo-700 py-2 text-[10px] font-black disabled:opacity-40">Cartão</button><button type="button" (click)="checkout.emit('pix')" [disabled]="!cart().length || !isOnline()" class="rounded-lg bg-cyan-700 py-2 text-[10px] font-black disabled:opacity-40">PIX</button></div>
    </section>
  `
})
export class PosCartComponent {
  readonly currentSaleNumber = input.required<number>();
  readonly cart = input<CartItem[]>([]);
  readonly selectedCustomer = input<CustomerProfile | null>(null);
  readonly customerSearchResults = input<CustomerProfile[]>([]);
  readonly customerCpf = model('');
  readonly splitGuestsCount = input(1);
  readonly cartSubtotal = input(0);
  readonly cartDiscount = input(0);
  readonly cartPromotionsDiscount = input(0);
  readonly cartTax = input(0);
  readonly cartTotal = input(0);
  readonly isOnline = input(true);
  readonly holdSale = output<void>();
  readonly clearCart = output<void>();
  readonly removeCustomer = output<void>();
  readonly customerSearch = output<string>();
  readonly selectCustomer = output<CustomerProfile>();
  readonly incrementQty = output<CartItem>();
  readonly decrementQty = output<CartItem>();
  readonly updateItemNotes = output<{ item: CartItem; notes: string }>();
  readonly openDiscount = output<void>();
  readonly checkout = output<'cash' | 'card' | 'pix'>();
}
