import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FinancialsService } from '../../services/financials.service';
import { EcosystemService } from '../../services/ecosystem.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-finance',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#140b06] text-stone-200 font-mono select-none overflow-hidden p-4 space-y-4">
      
      <!-- HEADER FINANCEIRO & DRE -->
      <div class="flex flex-wrap items-center justify-between gap-3 bg-[#1c0d06] p-3 rounded-2xl border border-[#381c0c] shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
            <mat-icon class="text-xl">account_balance_wallet</mat-icon>
          </div>
          <div>
            <h2 class="text-sm font-serif font-black text-white">Livro-Razão & Caixa Financeiro</h2>
            <p class="text-[10px] text-stone-400">Entradas, saídas de caixa, despesas e DRE consolidado.</p>
          </div>
        </div>

        <!-- STATS RESUMO -->
        <div class="flex items-center gap-2 text-xs">
          <div class="px-3 py-1 bg-emerald-950/80 border border-emerald-700/60 rounded-xl">
            <span class="text-[9px] text-emerald-400 block uppercase">Entradas</span>
            <strong class="text-white font-black">R$ {{ totalIncome().toFixed(2) }}</strong>
          </div>
          <div class="px-3 py-1 bg-rose-950/80 border border-rose-700/60 rounded-xl">
            <span class="text-[9px] text-rose-400 block uppercase">Saídas</span>
            <strong class="text-white font-black">R$ {{ totalExpense().toFixed(2) }}</strong>
          </div>
          <div class="px-3 py-1 bg-[#261207] border border-[#482814] rounded-xl">
            <span class="text-[9px] text-amber-400 block uppercase">Saldo Líquido</span>
            <strong [class]="netBalance() >= 0 ? 'text-emerald-400' : 'text-rose-400'" class="font-black">
              R$ {{ netBalance().toFixed(2) }}
            </strong>
          </div>
        </div>
      </div>

      <!-- TABELA DE LANÇAMENTOS -->
      <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar border border-[#381c0c] rounded-2xl bg-[#180b04]">
        <table class="w-full text-left text-xs font-mono">
          <thead class="bg-[#200e05] text-stone-400 border-b border-[#381c0c] sticky top-0">
            <tr>
              <th class="p-3">Data / Hora</th>
              <th class="p-3">Categoria</th>
              <th class="p-3">Descrição</th>
              <th class="p-3">Método</th>
              <th class="p-3 text-right">Valor (R$)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#2a1307]">
            @if (records().length === 0) {
              <tr>
                <td colspan="5" class="p-8 text-center text-stone-500">
                  Nenhum lançamento financeiro registrado.
                </td>
              </tr>
            } @else {
              @for (rec of records(); track rec.id) {
                <tr class="hover:bg-[#200e05]/60 transition-colors">
                  <td class="p-3 text-[10px] text-stone-400">
                    {{ rec.date.slice(0, 10) }} {{ rec.date.slice(11, 16) }}
                  </td>
                  <td class="p-3">
                    <span class="px-2 py-0.5 rounded-lg bg-[#261207] text-[10px] border border-[#381c0c] text-stone-300">
                      {{ rec.category }}
                    </span>
                  </td>
                  <td class="p-3 font-bold text-white">
                    {{ rec.description }}
                  </td>
                  <td class="p-3 text-stone-400 text-[11px]">
                    {{ rec.paymentMethod || 'Caixa' }}
                  </td>
                  <td class="p-3 text-right font-black">
                    <span [class]="rec.type === 'income' ? 'text-emerald-400' : 'text-rose-400'">
                      {{ rec.type === 'income' ? '+' : '-' }} R$ {{ rec.amount.toFixed(2) }}
                    </span>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>

    </div>
  `
})
export class EAppFinanceWindow {
  readonly financialsService = inject(FinancialsService);
  readonly ecosystem = inject(EcosystemService);

  readonly records = computed(() => this.financialsService.records());

  readonly totalIncome = computed(() =>
    this.records().filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0)
  );

  readonly totalExpense = computed(() =>
    this.records().filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0)
  );

  readonly netBalance = computed(() => this.totalIncome() - this.totalExpense());
}
