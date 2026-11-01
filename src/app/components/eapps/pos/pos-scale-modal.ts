import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductItem } from '../../../models/ecosystem.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-pos-scale-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"><section class="w-full max-w-md space-y-4 rounded-2xl border border-[#70411f] bg-[#140b06] p-5 text-stone-200">
      <header class="flex justify-between"><h2 class="font-black text-white">Informar pesagem</h2><button type="button" (click)="closeRequest.emit()">✕</button></header>
      <label class="block text-xs">Produto<select class="mt-1 w-full rounded-lg border border-[#482814] bg-[#0b0705] px-3 py-2" [value]="productId()" (change)="productId.set($any($event.target).value)"><option value="">Selecione</option>@for (product of products(); track product.id) { <option [value]="product.id">{{ product.name }} — R$ {{ product.price.toFixed(2) }}/kg</option> }</select></label>
      <label class="block text-xs">Peso em kg<input type="number" min="0.001" step="0.001" class="mt-1 w-full rounded-lg border border-[#482814] bg-[#0b0705] px-3 py-2" [value]="weight()" (input)="weight.set(+$any($event.target).value)" /></label>
      <button type="button" (click)="submit()" [disabled]="!productId() || weight() <= 0" class="w-full rounded-lg bg-amber-500 py-3 font-black text-stone-950 disabled:opacity-40">Adicionar ao carrinho</button>
    </section></div>
  `
})
export class PosScaleModal {
  readonly products = input<ProductItem[]>([]);
  readonly productId = signal('');
  readonly weight = signal(0);
  readonly closeRequest = output<void>();
  readonly save = output<{ productId: string; weight: number }>();

  submit() {
    if (this.productId() && this.weight() > 0) this.save.emit({ productId: this.productId(), weight: this.weight() });
  }
}
