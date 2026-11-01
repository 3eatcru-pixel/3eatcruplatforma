import { ChangeDetectionStrategy, Component, inject, computed, effect, signal } from '@angular/core';
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
            <h2 class="text-sm font-serif font-black text-white">Financeiro • Lançamentos da unidade</h2>
            <p class="text-[10px] text-stone-400">Consulta somente leitura; não gera DRE nem concilia adquirentes.</p>
          </div>
        </div>

        <!-- STATS RESUMO -->
        <div class="flex items-center gap-2 text-xs">
          <div class="px-3 py-1 bg-emerald-950/80 border border-emerald-700/60 rounded-xl">
            <span class="text-[9px] text-emerald-400 block uppercase">Entradas liquidadas</span>
            <strong class="text-white font-black">R$ {{ totalIncome().toFixed(2) }}</strong>
          </div>
          <div class="px-3 py-1 bg-rose-950/80 border border-rose-700/60 rounded-xl">
            <span class="text-[9px] text-rose-400 block uppercase">Saídas liquidadas</span>
            <strong class="text-white font-black">R$ {{ totalExpense().toFixed(2) }}</strong>
          </div>
          <div class="px-3 py-1 bg-[#261207] border border-[#482814] rounded-xl">
            <span class="text-[9px] text-amber-400 block uppercase">Saldo liquidado</span>
            <strong [class]="netBalance() >= 0 ? 'text-emerald-400' : 'text-rose-400'" class="font-black">
              R$ {{ netBalance().toFixed(2) }}
            </strong>
          </div>
          <button
            type="button"
            (click)="refreshRecords()"
            [disabled]="isLoading() || !canViewFinancials()"
            aria-label="Atualizar lançamentos financeiros"
            class="px-2.5 py-2 border border-[#593017] text-stone-300 rounded-xl disabled:opacity-50">
            <mat-icon class="!text-sm !h-4 !w-4">refresh</mat-icon>
          </button>
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
              <th class="p-3">Situação</th>
              <th class="p-3 text-right">Valor (R$)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#2a1307]">
            @if (!canViewFinancials()) {
              <tr><td colspan="6" class="p-8 text-center text-amber-300">A consulta financeira é restrita ao proprietário ou operador da unidade.</td></tr>
            } @else if (isLoading()) {
              <tr><td colspan="6" class="p-8 text-center text-stone-400">Carregando lançamentos financeiros…</td></tr>
            } @else if (loadError()) {
              <tr>
                <td colspan="6" class="p-8 text-center text-rose-300">
                  <p>{{ loadError() }}</p>
                  <button type="button" (click)="refreshRecords()" class="mt-2 font-bold underline">Tentar novamente</button>
                </td>
              </tr>
            } @else if (records().length === 0) {
              <tr>
                <td colspan="6" class="p-8 text-center text-stone-500">
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
                  <td class="p-3 text-[10px]">
                    <span [class]="rec.status === 'pending' ? 'text-amber-300' : 'text-emerald-300'">
                      {{ rec.status === 'pending' ? 'Pendente' : 'Liquidado' }}
                    </span>
                  </td>
                  <td class="p-3 text-right font-black">
                    <span [class]="rec.type === 'expense' ? 'text-rose-400' : 'text-emerald-400'">
                      {{ rec.type === 'expense' ? '-' : '+' }} R$ {{ rec.amount.toFixed(2) }}
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
  readonly isLoading = signal<boolean>(false);
  readonly loadError = signal<string | null>(null);
  private fetchGeneration = 0;

  readonly records = computed(() => {
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    if (!tenantId) return [];
    return this.financialsService.records().filter((record) => record.tenantId === tenantId);
  });

  readonly canViewFinancials = computed(() => {
    const role = this.ecosystem.currentSession()?.role;
    return role === 'tenant_owner' || role === 'operator';
  });

  private readonly settledRecords = computed(() =>
    this.records().filter((record) => record.status !== 'pending')
  );

  readonly totalIncome = computed(() =>
    this.settledRecords()
      .filter((record) => record.type === 'income' || record.type === 'sale')
      .reduce((sum, record) => sum + record.amount, 0)
  );

  readonly totalExpense = computed(() =>
    this.settledRecords()
      .filter((record) => record.type === 'expense')
      .reduce((sum, record) => sum + record.amount, 0)
  );

  readonly netBalance = computed(() => this.totalIncome() - this.totalExpense());

  constructor() {
    effect(() => {
      if (!this.canViewFinancials()) {
        this.fetchGeneration += 1;
        this.isLoading.set(false);
        this.loadError.set(null);
        return;
      }
      void this.loadRecords(this.ecosystem.resolveOperationalTenantId());
    });
  }

  async refreshRecords() {
    if (!this.canViewFinancials()) return;
    await this.loadRecords(this.ecosystem.resolveOperationalTenantId());
  }

  private async loadRecords(tenantId: string) {
    const generation = ++this.fetchGeneration;
    this.loadError.set(null);
    if (!tenantId) {
      this.isLoading.set(false);
      this.loadError.set('Selecione uma unidade para consultar o financeiro.');
      return;
    }

    this.isLoading.set(true);
    try {
      await this.financialsService.fetchRecords(tenantId);
    } catch {
      if (generation === this.fetchGeneration) {
        this.loadError.set('Não foi possível carregar os lançamentos desta unidade.');
      }
    } finally {
      if (generation === this.fetchGeneration) this.isLoading.set(false);
    }
  }
}
