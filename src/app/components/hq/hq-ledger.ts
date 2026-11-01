import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EcosystemService } from '../../services/ecosystem.service';
import { HqApiService, HqLedgerResponse } from '../../services/hq-api.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-hq-ledger',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="space-y-4 animate-in fade-in duration-500">
      <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#ded4c2] bg-[#faf7f0] p-4 text-stone-950">
        <div>
          <h3 class="font-serif text-sm font-black uppercase tracking-wider text-amber-900">Comissão das entregas da plataforma</h3>
          <p class="text-[10px] text-stone-600">Processo em preparação. Motoristas cadastrados e administrados pela loja não geram comissão para a plataforma.</p>
        </div>
        <div class="flex gap-2">
          @if (ledger()?.commissionStatus === 'active') {
            <button type="button" (click)="exportCsv()" [disabled]="!entries().length" class="rounded-xl border border-[#d6c3aa] bg-[#ebdcc7] px-3 py-1.5 text-[10px] font-bold disabled:opacity-40">Exportar CSV</button>
          }
          <button type="button" (click)="loadLedger()" [disabled]="isLoading()" class="rounded-xl bg-amber-700 px-3 py-1.5 text-[10px] font-bold text-white disabled:opacity-40">{{ isLoading() ? 'Atualizando...' : 'Atualizar' }}</button>
        </div>
      </div>

      @if (isLoading()) {
        <p class="rounded-xl border border-stone-300 bg-white p-4 text-xs text-stone-600">Carregando a estimativa das entregas da rede...</p>
      }

      @if (loadError()) {
        <p class="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950">{{ loadError() }}</p>
      }

      @if (ledger(); as ledgerData) {
        @if (ledgerData.commissionStatus === 'coming_soon') {
          <div class="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-950">
            <div class="flex items-center gap-2 font-bold uppercase"><mat-icon>schedule</mat-icon>Em breve</div>
            <p class="mt-2 text-xs">A comissão só será ativada quando a plataforma tiver sua própria rede de entregadores e o processo de inteligência estiver pronto. A contratação e o pagamento dos motoristas da loja continuam sob responsabilidade do lojista.</p>
          </div>
        } @else {
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div class="space-y-1 rounded-2xl border border-[#ded4c2] bg-[#faf7f0] p-5 text-stone-950 shadow-xl">
              <span class="text-[10px] font-mono font-bold uppercase text-amber-900">Volume das entregas elegíveis</span>
              <div class="text-3xl font-serif font-black text-stone-900">R$ {{ grossVolume().toFixed(2) }}</div>
              <p class="text-[10px] text-stone-500">{{ ledgerData.recordsCount }} entrega(s) paga(s) e concluída(s) pela frota da plataforma.</p>
            </div>
            <div class="space-y-1 rounded-2xl border border-emerald-700 bg-emerald-900 p-5 text-white shadow-xl">
              <span class="text-[10px] font-mono font-bold uppercase text-emerald-300">Comissão da rede ({{ ledgerData.currentCommissionRatePercent ?? 0 }}%)</span>
              <div class="text-3xl font-serif font-black">R$ {{ (ledgerData.totalEstimatedCommission ?? 0) | number:'1.2-2' }}</div>
              <p class="text-[10px] text-emerald-300">Estimativa pela taxa vigente, sem comissão histórica ou confirmação de recebimento.</p>
            </div>
          </div>

          <div class="overflow-x-auto rounded-2xl border border-[#ded4c2] bg-[#faf7f0] p-5 text-stone-950 shadow-xl">
            <table class="w-full border-collapse text-left text-xs font-mono">
            <thead>
              <tr class="border-b border-[#e8dfce] text-[10px] font-bold uppercase text-stone-500">
                <th class="px-3 py-2">Pedido</th><th class="px-3 py-2">Estabelecimento</th><th class="px-3 py-2">Entregador da rede</th><th class="px-3 py-2">Canal</th>
                <th class="px-3 py-2">Valor bruto</th><th class="px-3 py-2">Taxa atual</th><th class="px-3 py-2">Comissão estimada</th><th class="px-3 py-2 text-right">Data</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#e8dfce]/50">
              @for (entry of entries(); track entry.orderId) {
                <tr class="hover:bg-[#f2e8d5]/30">
                  <td class="px-3 py-2.5 font-bold">{{ entry.orderNumber }}</td>
                  <td class="px-3 py-2.5 font-sans font-bold">{{ getTenantName(entry.tenantId) }}</td>
                  <td class="px-3 py-2.5">{{ entry.driverName }}</td>
                  <td class="px-3 py-2.5">{{ entry.channel }}</td>
                  <td class="px-3 py-2.5">R$ {{ entry.orderTotal.toFixed(2) }}</td>
                  <td class="px-3 py-2.5">{{ entry.currentCommissionRatePercent.toFixed(2) }}%</td>
                  <td class="px-3 py-2.5 font-black text-emerald-700">R$ {{ entry.estimatedCommissionAmount.toFixed(2) }}</td>
                  <td class="px-3 py-2.5 text-right text-[10px] text-stone-500">{{ entry.date | date:'dd/MM/yyyy HH:mm' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="8" class="py-8 text-center text-xs text-stone-500">Nenhuma entrega elegível foi retornada pelo servidor.</td></tr>
              }
            </tbody>
            </table>
          </div>
        }
      }
    </div>
  `
})
export class HqLedgerComponent implements OnInit {
  readonly ecosystem = inject(EcosystemService);
  private readonly hqApi = inject(HqApiService);

  readonly ledger = signal<HqLedgerResponse | null>(null);
  readonly isLoading = signal(false);
  readonly loadError = signal('');
  readonly entries = computed(() => this.ledger()?.entries || []);
  readonly grossVolume = computed(() => this.entries().reduce((sum, entry) => sum + entry.orderTotal, 0));

  ngOnInit() {
    void this.loadLedger();
  }

  async loadLedger() {
    if (this.ecosystem.isSimulationMode()) {
      this.ledger.set({
        commissionStatus: 'coming_soon',
        totalEligibleDeliveryVolume: null,
        totalEstimatedCommission: null,
        currentCommissionRatePercent: null,
        recordsCount: 0,
        entries: []
      });
      this.loadError.set('');
      return;
    }

    this.isLoading.set(true);
    this.loadError.set('');
    try {
      this.ledger.set(await this.hqApi.getLedger());
    } catch {
      this.ledger.set(null);
      this.loadError.set('Não foi possível carregar os dados financeiros do servidor.');
    } finally {
      this.isLoading.set(false);
    }
  }

  getTenantName(tenantId: string): string {
    const tenant = this.ecosystem.tenants().find((item) => item.id === tenantId);
    return tenant?.name || tenantId;
  }

  exportCsv() {
    const entries = this.entries();
    if (!entries.length) return;

    const rows = [
      ['Pedido', 'Tenant', 'Entregador da rede', 'Canal', 'Data', 'Valor bruto da entrega', 'Taxa vigente', 'Comissão estimada'],
      ...entries.map((entry) => [
        entry.orderNumber,
        entry.tenantId,
        entry.driverName,
        entry.channel,
        entry.date,
        entry.orderTotal.toFixed(2),
        `${entry.currentCommissionRatePercent.toFixed(2)}%`,
        entry.estimatedCommissionAmount.toFixed(2)
      ])
    ];
    const csv = `\uFEFF${rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `hq-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
