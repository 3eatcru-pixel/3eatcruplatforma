import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EcosystemService } from '../../services/ecosystem.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-hq-ledger',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="space-y-4 animate-in fade-in duration-500">
       <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div class="bg-[#faf7f0] border border-[#ded4c2] rounded-2xl p-5 shadow-xl space-y-1 text-stone-950">
            <span class="text-[10px] font-mono font-bold text-amber-900 uppercase">GMV Total (Todas Lojas)</span>
            <div class="text-3xl font-serif font-black text-stone-900">R$ {{ (ecosystem.hqPublicSalesTotal() * 12.5).toFixed(2) }}</div>
            <p class="text-[10px] text-stone-500">Fluxo bruto transacionado no ecossistema.</p>
         </div>
         <div class="bg-emerald-900 border border-emerald-700 rounded-2xl p-5 shadow-xl text-white space-y-1">
            <span class="text-[10px] font-mono font-bold text-emerald-300 uppercase">Comissão Acumulada (8%)</span>
            <div class="text-3xl font-serif font-black">R$ {{ ecosystem.hqTotalCommissionRevenue().toFixed(2) }}</div>
            <p class="text-[10px] text-emerald-400">Receita líquida da sua plataforma SaaS.</p>
         </div>
         <div class="bg-[#faf7f0] border border-[#ded4c2] rounded-2xl p-5 shadow-xl space-y-1 text-stone-950">
            <span class="text-[10px] font-mono font-bold text-amber-900 uppercase">Pendente de Repasse</span>
            <div class="text-3xl font-serif font-black text-stone-900">R$ {{ (ecosystem.hqPublicSalesTotal() * 0.92).toFixed(2) }}</div>
            <p class="text-[10px] text-stone-500">Valor a ser enviado às lojas via Split D+1.</p>
         </div>
       </div>

       <div class="bg-[#faf7f0] border border-[#ded4c2] rounded-2xl p-5 shadow-xl text-stone-950">
         <div class="flex justify-between items-center mb-4 border-b border-[#e8dfce] pb-2">
            <h3 class="font-serif font-black text-sm uppercase tracking-wider text-amber-900">Livro-Razão Global & Splits Financeiros</h3>
            <button (click)="ecosystem.notify('Relatório exportado para o Cloud Archive.', 'success')" class="text-[10px] font-bold bg-[#ebdcc7] px-3 py-1.5 rounded-xl border border-[#d6c3aa] hover:bg-[#decbb4] cursor-pointer">Exportar XLS</button>
         </div>
         <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr class="text-[10px] font-mono font-bold uppercase text-stone-400 border-b border-[#e8dfce]">
                  <th class="py-2 px-3">TRANS ID</th>
                  <th class="py-2 px-3 text-left">ESTABELECIMENTO</th>
                  <th class="py-2 px-3">CANAL</th>
                  <th class="py-2 px-3">VALOR</th>
                  <th class="py-2 px-3 text-emerald-700">PLATAFORMA (8%)</th>
                  <th class="py-2 px-3 text-right">HORÁRIO</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#e8dfce]/50">
                @for (ord of ecosystem.orders(); track ord.id) {
                  @if (ord.channel !== 'POS') {
                    <tr class="hover:bg-[#f2e8d5]/30 transition-colors">
                      <td class="py-2.5 px-3 font-bold">#{{ ord.orderNumber }}</td>
                      <td class="py-2.5 px-3 text-stone-900 font-sans font-bold text-left">{{ getTenantName(ord.tenantId) }}</td>
                      <td class="py-2.5 px-3"><span class="bg-stone-200 text-stone-600 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">{{ ord.channel }}</span></td>
                      <td class="py-2.5 px-3 font-bold">R$ {{ ord.total.toFixed(2) }}</td>
                      <td class="py-2.5 px-3 text-emerald-700 font-black">R$ {{ (ord.total * ecosystem.hqCommissionRate()).toFixed(2) }}</td>
                      <td class="py-2.5 px-3 text-right text-stone-400 text-[10px]">{{ ord.createdAt | date:'dd/MM HH:mm' }}</td>
                    </tr>
                  }
                }
              </tbody>
            </table>
         </div>
       </div>
    </div>
  `
})
export class HqLedgerComponent {
  readonly ecosystem = inject(EcosystemService);

  getTenantName(tenantId: string): string {
    const t = this.ecosystem.tenants().find(x => x.id === tenantId);
    return t ? t.name : 'Estabelecimento';
  }
}
