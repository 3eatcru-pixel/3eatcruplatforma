import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EcosystemService } from '../../services/ecosystem.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-hq-audit',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="bg-[#faf7f0] border border-[#ded4c2] rounded-2xl p-5 shadow-xl text-stone-950 space-y-4 animate-in fade-in duration-500">
       <div class="flex justify-between items-center pb-3 border-b border-[#e8dfce]">
         <h3 class="font-serif font-black text-stone-900 text-sm uppercase flex items-center gap-2">
            <mat-icon class="text-amber-800">security</mat-icon> Auditoria estrutural e registros de auditoria
         </h3>
         <div class="flex items-center gap-3">
            <button
              (click)="runAudit()"
              [disabled]="auditRunning()"
              [class]="auditRunning() ? 'bg-stone-300 text-stone-600 border-stone-400' : 'bg-rose-950 text-rose-300 border-rose-600 hover:bg-rose-900'"
              class="text-[10px] font-mono font-bold px-4 py-1.5 rounded-xl border transition-all flex items-center gap-2 cursor-pointer shadow-lg">
              <mat-icon class="text-xs">{{ auditRunning() ? 'hourglass_top' : 'fact_check' }}</mat-icon>
              <span>{{ auditRunning() ? 'VARREDURA EM ANDAMENTO' : 'EXECUTAR VARREDURA ESTRUTURAL' }}</span>
            </button>
            <span class="text-[9px] font-mono bg-stone-900 text-stone-100 px-2.5 py-1 rounded font-bold uppercase">Execução sob demanda</span>
         </div>
       </div>

       <p class="text-[10px] text-stone-600">Escopo desta varredura: tenants, catálogo de produtos, pedidos e inventário de dispositivos. Ela não certifica todos os registros, módulos fiscais, usuários, pagamentos externos ou a infraestrutura.</p>

       @if (auditError()) {
         <div role="alert" class="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-900">{{ auditError() }}</div>
       }

       @if (ecosystem.lastSystemAuditReport(); as report) {
         <div class="p-4 rounded-2xl border transition-all" [class]="report.status === 'passed' ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-amber-50 border-amber-300 text-amber-950'">
           <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
             <div class="flex items-center gap-2">
               <mat-icon class="text-lg" [class]="report.status === 'passed' ? 'text-emerald-700' : 'text-amber-700'">
                 {{ report.status === 'passed' ? 'verified' : 'warning' }}
               </mat-icon>
               <span class="font-bold text-xs uppercase font-mono">
                 Relatório Estrutural (Executado em {{ report.timestamp }})
               </span>
             </div>
             <span class="text-[10px] font-mono font-black uppercase px-2.5 py-1 rounded-lg border" [class]="report.status === 'passed' ? 'bg-emerald-100 border-emerald-300 text-emerald-900' : 'bg-amber-100 border-amber-300 text-amber-900'">
               {{ report.status === 'passed' ? 'SEM APONTAMENTOS NO ESCOPO' : report.status === 'warning' ? 'APONTAMENTOS ESTRUTURAIS' : 'DIVERGÊNCIA NOS TOTAIS DOS PEDIDOS' }}
             </span>
           </div>

           <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono mb-3">
             <div class="bg-white/80 p-2.5 rounded-xl border border-stone-200">
               <span class="text-stone-500 block uppercase font-bold text-[9px]">Lojas Inspecionadas:</span>
               <span class="font-black text-sm text-stone-900">{{ report.tenantsChecked }}</span>
             </div>
             <div class="bg-white/80 p-2.5 rounded-xl border border-stone-200">
               <span class="text-stone-500 block uppercase font-bold text-[9px]">Produtos no Catálogo:</span>
               <span class="font-black text-sm text-stone-900">{{ report.productsChecked }}</span>
             </div>
             <div class="bg-white/80 p-2.5 rounded-xl border border-stone-200">
               <span class="text-stone-500 block uppercase font-bold text-[9px]">Pedidos Auditados:</span>
               <span class="font-black text-sm text-stone-900">{{ report.ordersChecked }}</span>
             </div>
             <div class="bg-white/80 p-2.5 rounded-xl border border-stone-200">
              <span class="text-stone-500 block uppercase font-bold text-[9px]">Totais dos pedidos:</span>
              <span class="font-black text-sm" [class.text-emerald-700]="report.orderTotalsConsistent" [class.text-rose-700]="!report.orderTotalsConsistent">
                 {{ report.orderTotalsConsistent ? 'CONSISTENTES' : 'DIVERGÊNCIA' }}
               </span>
             </div>
           </div>

           @if (report.issuesFound.length > 0) {
             <div class="text-[11px] text-amber-950 space-y-1 bg-amber-100/70 p-3 rounded-xl border border-amber-200">
               <div class="font-bold uppercase text-[9px] font-mono">Apontamentos estruturais encontrados:</div>
               @for (issue of report.issuesFound; track $index) {
                 <div>• {{ issue }}</div>
               }
             </div>
           } @else {
             <div class="text-xs text-emerald-800 font-medium flex items-center gap-1.5">
               <mat-icon class="text-sm">check_circle</mat-icon>
               <span>Nenhum apontamento encontrado nos registros e nas verificações listadas acima. O resultado não representa certificação integral do sistema.</span>
             </div>
           }
         </div>
       }

       <div class="overflow-x-auto">
         <table class="w-full text-left text-[11px] border-separate border-spacing-y-1.5 font-sans">
           <thead>
             <tr class="text-[10px] font-mono font-bold uppercase text-stone-400">
               <th class="px-3">TIMESTAMP</th>
               <th class="px-3">ORIGEM / USUÁRIO</th>
               <th class="px-3">MÓDULO</th>
               <th class="px-3">AÇÃO EXECUTADA</th>
               <th class="px-3 text-right">RISCO</th>
             </tr>
           </thead>
           <tbody>
             @for (log of ecosystem.auditLogs(); track log.id) {
               <tr class="bg-white/40 hover:bg-white/80 transition-colors">
                 <td class="py-2.5 px-3 font-mono text-stone-500 whitespace-nowrap">{{ log.timestamp }}</td>
                 <td class="py-2.5 px-3 font-bold">{{ log.user }}</td>
                 <td class="py-2.5 px-3"><span class="bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded border border-stone-200 font-bold uppercase text-[9px]">{{ log.module }}</span></td>
                 <td class="py-2.5 px-3 text-amber-900 font-bold">{{ log.action }}</td>
                 <td class="py-2.5 px-3 text-right">
                   <span [class]="log.severity === 'critical' ? 'text-rose-600' : log.severity === 'warning' ? 'text-amber-600' : 'text-emerald-600'" class="font-black uppercase text-[9px]">
                     {{ log.severity }}
                   </span>
                 </td>
               </tr>
             }
           </tbody>
         </table>
       </div>
    </div>
  `
})
export class HqAuditComponent {
  readonly ecosystem = inject(EcosystemService);
  readonly auditRunning = signal(false);
  readonly auditError = signal<string | null>(null);

  async runAudit(): Promise<void> {
    if (this.auditRunning()) return;
    this.auditRunning.set(true);
    this.auditError.set(null);
    try {
      await this.ecosystem.runStructuralAuditOnBackend();
    } catch (error) {
      this.auditError.set(error instanceof Error ? error.message : 'Não foi possível executar a varredura. O último relatório foi mantido.');
    } finally {
      this.auditRunning.set(false);
    }
  }
}
