import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-reconciliation',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#140b06] text-stone-200 font-mono select-none overflow-hidden p-4 space-y-4">
      
      <!-- HEADER RECONCILIAÇÃO FINANCEIRA -->
      <div class="flex items-center justify-between gap-3 bg-[#1c0d06] p-3 rounded-2xl border border-[#381c0c] shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
            <mat-icon class="text-xl">swap_horiz</mat-icon>
          </div>
          <div>
            <h2 class="text-sm font-serif font-black text-white">Reconciliação • Protótipo local</h2>
            <p class="text-[10px] text-stone-400">Sem conexão com banco, adquirentes, TEF ou extratos de liquidação.</p>
          </div>
        </div>

        <span class="px-2.5 py-1 rounded-xl bg-emerald-950 text-emerald-300 text-xs font-bold border border-emerald-800">
          Sem dados conciliados
        </span>
      </div>

      <!-- CARDS DE ADQUIRENTES -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0 text-xs">
        <div class="bg-[#1b0d06] border border-[#381c0c] p-3 rounded-2xl">
          <span class="text-stone-500 text-[10px] uppercase block">PIX (exemplo)</span>
          <strong class="text-stone-300 block mt-0.5 text-base">—</strong>
          <span class="text-[10px] text-stone-400">Extrato PIX não importado</span>
        </div>

        <div class="bg-[#1b0d06] border border-[#381c0c] p-3 rounded-2xl">
          <span class="text-stone-500 text-[10px] uppercase block">Cartões (exemplo)</span>
          <strong class="text-stone-300 block mt-0.5 text-base">—</strong>
          <span class="text-[10px] text-stone-400">Adquirente não conectada</span>
        </div>

        <div class="bg-[#1b0d06] border border-[#381c0c] p-3 rounded-2xl">
          <span class="text-stone-500 text-[10px] uppercase block">Divergências Encontradas</span>
          <strong class="text-stone-300 block mt-0.5 text-base">—</strong>
          <span class="text-[10px] text-stone-400">Divergências não calculadas</span>
        </div>
      </div>

      <!-- TABELA DE TRANSAÇÕES AUDITADAS -->
      <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar border border-[#381c0c] rounded-2xl bg-[#180b04]">
        <table class="w-full text-left text-xs font-mono">
          <thead class="bg-[#200e05] text-stone-400 border-b border-[#381c0c] sticky top-0">
            <tr>
              <th class="p-3">NSU / Autorização</th>
              <th class="p-3">Adquirente</th>
              <th class="p-3">Modalidade</th>
              <th class="p-3 text-right">Valor Bruto</th>
              <th class="p-3 text-right">Taxa MDR</th>
              <th class="p-3 text-right">Líquido Previsto</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#2a1307]">
            @if (transactions.length === 0) {
              <tr>
                <td colspan="6" class="p-8 text-center text-stone-500">Nenhum extrato importado; esta interface não consulta transações reais.</td>
              </tr>
            } @else {
            @for (tx of transactions; track tx.nsu) {
              <tr class="hover:bg-[#200e05]/60 transition-colors">
                <td class="p-3 font-bold text-white">
                  {{ tx.nsu }}
                </td>
                <td class="p-3 text-stone-300">
                  {{ tx.acquirer }}
                </td>
                <td class="p-3">
                  <span class="px-2 py-0.5 rounded-lg bg-[#261207] text-[10px] border border-[#381c0c] text-amber-300">
                    {{ tx.method }}
                  </span>
                </td>
                <td class="p-3 text-right font-bold text-white">
                  R$ {{ tx.gross.toFixed(2) }}
                </td>
                <td class="p-3 text-right text-rose-400">
                  - R$ {{ tx.fee.toFixed(2) }}
                </td>
                <td class="p-3 text-right font-black text-emerald-400">
                  R$ {{ (tx.gross - tx.fee).toFixed(2) }}
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
export class EAppReconciliationWindow {
  readonly transactions: {
    nsu: string;
    acquirer: string;
    method: string;
    gross: number;
    fee: number;
  }[] = [];
}
