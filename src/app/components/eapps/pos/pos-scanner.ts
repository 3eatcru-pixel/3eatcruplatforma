import { ChangeDetectionStrategy, Component, model, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-pos-scanner',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <section class="shrink-0 rounded-2xl border border-[#482814] bg-[#140b06] p-3 text-stone-200">
      <div class="grid gap-3 md:grid-cols-2">
        <label class="text-[10px] font-bold uppercase text-stone-400">
          Código, SKU ou produto
          <div class="mt-1 flex rounded-xl border border-[#482814] bg-[#0b0705]">
            <input class="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none" [value]="searchQuery()" (input)="searchQuery.set($any($event.target).value)" (keyup.enter)="bip.emit()" placeholder="Bipe ou digite para buscar" />
            <button type="button" class="px-3 text-amber-400" (click)="bip.emit()" aria-label="Buscar produto"><mat-icon>search</mat-icon></button>
          </div>
        </label>
        <label class="text-[10px] font-bold uppercase text-stone-400">Mesa ou comanda<input class="mt-1 w-full rounded-xl border border-[#482814] bg-[#0b0705] px-3 py-2 text-sm text-white" [value]="tableOrComanda()" (input)="tableOrComanda.set($any($event.target).value)" placeholder="Opcional" /></label>
      </div>
      <div class="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" (click)="fastScanMode.set(!fastScanMode())" class="rounded-lg border border-[#482814] px-3 py-1.5 text-[10px] font-bold">Bipe rápido {{ fastScanMode() ? 'ON' : 'OFF' }}</button>
        <button type="button" (click)="openScale.emit()" class="rounded-lg border border-[#482814] px-3 py-1.5 text-[10px] font-bold"><mat-icon class="!h-3 !w-3 !text-sm align-middle">scale</mat-icon> Pesagem</button>
        <button type="button" (click)="openRecall.emit()" class="rounded-lg border border-[#482814] px-3 py-1.5 text-[10px] font-bold">Vendas em espera ({{ heldSalesCount() }})</button>
        <button type="button" (click)="openSangria.emit()" class="ml-auto rounded-lg border border-rose-800 px-3 py-1.5 text-[10px] font-bold text-rose-300">Caixa</button>
      </div>
    </section>
  `
})
export class PosScannerComponent {
  readonly fastScanMode = model(true);
  readonly tableOrComanda = model('');
  readonly searchQuery = model('');
  readonly heldSalesCount = model(0);
  readonly openScale = output<void>();
  readonly openRecall = output<void>();
  readonly openSangria = output<void>();
  readonly bip = output<void>();
}
