import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductItem } from '../../../models/ecosystem.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-pos-grid',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#482814] bg-[#140b06] p-3 text-stone-200">
      <div class="mb-3 flex gap-2 overflow-x-auto pb-1">
        @for (category of categories(); track category) {
          <button type="button" (click)="selectedCategory.set(category)" [class.bg-amber-500]="selectedCategory() === category" [class.text-stone-950]="selectedCategory() === category" class="shrink-0 rounded-lg border border-[#482814] px-3 py-1.5 text-xs font-bold">{{ category }}</button>
        }
      </div>
      <div class="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 xl:grid-cols-4">
        @for (product of products(); track product.id) {
          <button type="button" (click)="addToCart.emit(product)" class="flex min-h-24 flex-col justify-between rounded-xl border border-[#482814] bg-[#0b0705] p-3 text-left hover:border-amber-500">
            <span class="font-bold text-white">{{ product.name }}</span>
            <span class="mt-2 flex justify-between gap-2 text-xs"><span class="text-stone-500">Estoque {{ product.stock }}</span><strong class="text-amber-400">R$ {{ product.price.toFixed(2) }}</strong></span>
          </button>
        } @empty {
          <p class="col-span-full self-center p-6 text-center text-sm text-stone-500">Nenhum produto disponível para esta busca ou categoria.</p>
        }
      </div>
    </section>
  `
})
export class PosGridComponent {
  readonly products = input<ProductItem[]>([]);
  readonly categories = input<string[]>([]);
  readonly selectedCategory = model('Todos');
  readonly addToCart = output<ProductItem>();
}
