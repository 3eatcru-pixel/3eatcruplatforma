import { ChangeDetectionStrategy, Component, computed, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';

type CashOperation = 'sangria' | 'suprimento';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-pos-cash-op-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"><section class="w-full max-w-md space-y-4 rounded-2xl border border-[#70411f] bg-[#140b06] p-5 text-stone-200">
      <header class="flex items-center justify-between"><h2 class="font-black text-white">Operação de Caixa</h2><button type="button" (click)="closeRequest.emit()" aria-label="Fechar">✕</button></header>
      <div class="grid grid-cols-2 gap-2">@for (option of operations; track option.id) { <button type="button" (click)="type.set(option.id)" [class.bg-amber-600]="type() === option.id" class="rounded-lg border border-[#482814] px-2 py-2 text-xs font-bold">{{ option.label }}</button> }</div>
      <label class="block text-xs">Valor (R$)<input type="number" min="0.01" step="0.01" class="mt-1 w-full rounded-lg border border-[#482814] bg-[#0b0705] px-3 py-2 text-white" [value]="amount()" (input)="amount.set(+$any($event.target).value)" /></label>
      <label class="block text-xs">Motivo<input class="mt-1 w-full rounded-lg border border-[#482814] bg-[#0b0705] px-3 py-2 text-white" [value]="reason()" (input)="reason.set($any($event.target).value)" placeholder="Informe o motivo da operação" /></label>
      <button type="button" (click)="submit()" [disabled]="!canSubmit()" class="w-full rounded-lg bg-amber-500 py-3 text-sm font-black text-stone-950 disabled:opacity-40">Registrar</button>
    </section></div>
  `
})
export class PosCashOpModal {
  readonly operations: { id: CashOperation; label: string }[] = [
    { id: 'sangria', label: 'Sangria' }, { id: 'suprimento', label: 'Suprimento' }
  ];
  readonly type = signal<CashOperation>('sangria');
  readonly amount = signal(0);
  readonly reason = signal('');
  readonly canSubmit = computed(() => Number.isFinite(this.amount()) && this.amount() > 0 && this.reason().trim().length > 0);
  readonly closeRequest = output<void>();
  readonly execute = output<{ type: CashOperation; amount: number; reason: string }>();

  submit() {
    if (!this.canSubmit()) return;
    this.execute.emit({ type: this.type(), amount: this.amount(), reason: this.reason().trim() });
  }
}
