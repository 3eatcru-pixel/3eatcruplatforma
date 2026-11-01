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
            <h2 class="text-sm font-serif font-black text-white">Reconciliação Financeira & Adquirentes</h2>
            <p class="text-[10px] text-stone-400">Batimento de extrato de cartões (TEF/POS), taxas e liquidação PIX.</p>
          </div>
        </div>

        <span class="px-2.5 py-1 rounded-xl bg-emerald-950 text-emerald-300 text-xs font-bold border border-emerald-800">
          Status: 100% Conciliado
        </span>
      </div>

      <!-- CARDS DE ADQUIRENTES -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0 text-xs">
        <div class="bg-[#1b0d06] border border-[#381c0c] p-3 rounded-2xl">
          <span class="text-stone-500 text-[10px] uppercase block">PIX Direto / Banco Central</span>
          <strong class="text-emerald-400 block mt-0.5 text-base">R$ 4.280,00</strong>
          <span class="text-[10px] text-stone-400">Taxa Média: 0.8% • D+0 Imediato</span>
        </div>

        <div class="bg-[#1b0d06] border border-[#381c0c] p-3 rounded-2xl">
          <span class="text-stone-500 text-[10px] uppercase block">Cartões Crédito / Débito (TEF)</span>
          <strong class="text-amber-400 block mt-0.5 text-base">R$ 8.940,50</strong>
          <span class="text-[10px] text-stone-400">Taxa Média: 2.1% • Antecipação Ativa</span>
        </div>

        <div class="bg-[#1b0d06] border border-[#381c0c] p-3 rounded-2xl">
          <span class="text-stone-500 text-[10px] uppercase block">Divergências Encontradas</span>
          <strong class="text-white block mt-0.5 text-base">R$ 0,00</strong>
          <span class="text-[10px] text-emerald-400 font-bold">Sem estornos pendentes</span>
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
          </tbody>
        </table>
      </div>

    </div>
  `
})
export class EAppReconciliationWindow {
  readonly transactions = [
    { nsu: 'NSU-9840192', acquirer: 'Rede / Itaú', method: 'Crédito à Vista', gross: 145.00, fee: 3.19 },
    { nsu: 'NSU-9840193', acquirer: 'Banco Central', method: 'PIX Dinâmico', gross: 88.50, fee: 0.70 },
    { nsu: 'NSU-9840194', acquirer: 'Stone Pagamentos', method: 'Débito Chip', gross: 210.00, fee: 2.52 },
    { nsu: 'NSU-9840195', acquirer: 'Cielo TEF', method: 'Crédito 2x', gross: 320.00, fee: 9.60 }
  ];
}
