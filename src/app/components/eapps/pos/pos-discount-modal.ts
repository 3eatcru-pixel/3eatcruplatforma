import { ChangeDetectionStrategy, Component, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-pos-discount-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"><section class="w-full max-w-sm space-y-4 rounded-2xl border border-[#70411f] bg-[#140b06] p-5 text-stone-200">
      <header class="flex justify-between"><h2 class="font-black text-white">Desconto na venda</h2><button type="button" (click)="closeRequest.emit()">✕</button></header>
      <label class="block text-xs">Percentual<input type="number" min="0" max="100" step="1" class="mt-1 w-full rounded-lg border border-[#482814] bg-[#0b0705] px-3 py-2" [value]="percent()" (input)="setPercent($any($event.target).value)" /></label>
      <button type="button" (click)="applyDiscount.emit(percent() / 100)" class="w-full rounded-lg bg-amber-500 py-3 font-black text-stone-950">Aplicar</button>
    </section></div>
  `
})
export class PosDiscountModal {
  readonly percent = signal(0);
  readonly closeRequest = output<void>();
  readonly applyDiscount = output<number>();

  setPercent(value: string) {
    this.percent.set(Math.min(100, Math.max(0, Number(value) || 0)));
  }
}
