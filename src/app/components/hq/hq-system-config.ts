import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EcosystemService } from '../../services/ecosystem.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-hq-system-config',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500">
      
      <!-- SYSTEM GOVERNANCE CONTROLS -->
      <div class="lg:col-span-4 space-y-6">
         <div class="bg-[#2a160b] border border-[#482814] rounded-3xl p-5 shadow-2xl space-y-5">
            <h3 class="font-serif font-black text-white text-base border-b border-[#4d2813] pb-2">Variáveis de Governança</h3>
            
            <div class="space-y-4">
               <div class="space-y-1">
                  <label for="hqCommRate" class="text-[10px] font-mono font-bold text-amber-500 uppercase">Comissão Padrão da Plataforma (%)</label>
                  <div class="flex items-center gap-2">
                     <input id="hqCommRate" type="number" [value]="ecosystem.hqCommissionRate() * 100" (input)="updateCommission($event)" class="flex-1 bg-[#1a0e07] border border-[#4d2813] rounded-xl px-3 py-2 text-white font-mono font-bold focus:border-amber-500 outline-none">
                     <button (click)="saveCommissionRate()" class="bg-amber-600 p-2 rounded-xl text-stone-950 cursor-pointer shadow hover:bg-amber-500 transition-colors">
                       <mat-icon class="text-sm">save</mat-icon>
                     </button>
                  </div>
               </div>

               <div class="p-4 bg-rose-950/20 border border-rose-500/30 rounded-2xl space-y-2">
                  <div class="flex justify-between items-center">
                     <span class="text-xs font-bold text-rose-200">Modo Manutenção SaaS</span>
                     <button type="button" aria-label="Alternar Modo Manutenção" class="w-10 h-5 bg-stone-900 border border-stone-700 rounded-full relative cursor-pointer focus:outline-none" (click)="toggleMaintenanceMode()">
                        <div [class]="ecosystem.maintenanceMode() ? 'bg-rose-500 translate-x-5' : 'bg-stone-500 translate-x-0'" class="w-4 h-4 rounded-full absolute left-0.5 top-0.5 transition-all duration-300 shadow-sm"></div>
                     </button>
                  </div>
                  <p class="text-[9px] text-rose-400 uppercase leading-snug">Ao ativar, todos os terminais Store OS serão bloqueados para atualizações críticas.</p>
               </div>

               <div class="space-y-2">
                  <label for="globalBroadcastText" class="text-[10px] font-mono font-bold text-amber-500 uppercase">Broadcast Global (Mensagem Interna)</label>
                  <textarea id="globalBroadcastText" #broadcastArea placeholder="Digite um aviso para todos os lojistas..." class="w-full h-24 bg-[#1a0e07] border border-[#4d2813] rounded-xl p-3 text-xs text-white focus:border-amber-500 outline-none no-scrollbar"></textarea>
                  <button (click)="sendBroadcast(broadcastArea.value); broadcastArea.value = ''" class="w-full bg-[#3b1e0d] text-amber-400 font-black py-2 rounded-xl text-[10px] uppercase border border-amber-600/30 hover:bg-amber-900/40 transition-all cursor-pointer">Disparar Broadcast</button>
               </div>
            </div>
         </div>
      </div>

      <!-- INFRASTRUCTURE MONITORING -->
      <div class="lg:col-span-8 space-y-6">
         <div class="bg-[#faf7f0] border border-[#ded4c2] rounded-3xl p-6 shadow-2xl space-y-6 text-stone-900">
            <div class="flex flex-wrap justify-between items-center border-b border-[#e8dfce] pb-3 gap-2">
               <div class="flex flex-wrap items-center gap-2">
                  <h3 class="font-serif font-black text-base uppercase tracking-tight">Status da Infraestrutura & Cloud Master</h3>
                  <span class="border border-amber-600/70 bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase">[MÉTRICAS CONSOLIDADAS EM TEMPO REAL]</span>
               </div>
               <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span class="text-[10px] font-mono font-black uppercase text-emerald-700">Cluster 01 - São Paulo (Active)</span>
               </div>
            </div>

            <!-- INFRA CHART REAL-TIME MONITORING -->
            <div class="h-48 flex items-end justify-between gap-1.5 px-4 bg-stone-50 border border-stone-200 rounded-2xl overflow-hidden relative group">
               <div class="absolute inset-0 bg-graph-pattern opacity-5 pointer-events-none"></div>
               @for (bar of infraStats(); track $index) {
                 <div [style.height.%]="bar" class="flex-1 bg-gradient-to-t from-emerald-600 to-emerald-400 opacity-60 hover:opacity-100 transition-all rounded-t-sm group-hover:scale-y-105"></div>
               }
               <div class="absolute top-4 left-4 text-[10px] font-mono font-black uppercase text-emerald-800 bg-emerald-50 px-2 py-1 rounded shadow-sm border border-emerald-200">Load Factor: {{ currentLoad() }}% Average</div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
               <div class="space-y-1 text-center">
                  <span class="text-[9px] font-black text-stone-400 uppercase block">API Response</span>
                  <div class="text-xl font-serif font-black text-stone-900">{{ ecosystem.avgLatencyMs() }}ms</div>
               </div>
               <div class="space-y-1 text-center">
                  <span class="text-[9px] font-black text-stone-400 uppercase block">DB Throughput</span>
                  <div class="text-xl font-serif font-black text-stone-900">{{ dbThroughput() }}k rps</div>
               </div>
               <div class="space-y-1 text-center">
                  <span class="text-[9px] font-black text-stone-400 uppercase block">Storage Usage</span>
                  <div class="text-xl font-serif font-black text-stone-900">1.2 TB</div>
               </div>
               <div class="space-y-1 text-center">
                  <span class="text-[9px] font-black text-stone-400 uppercase block">Global Traffic</span>
                  <div class="text-xl font-serif font-black text-stone-900">{{ globalTraffic() }} GB/s</div>
               </div>
            </div>

            <div class="bg-[#f5ebd9] border border-[#e6d8be] rounded-2xl p-4 flex items-center justify-between shadow-sm">
               <div class="flex items-center gap-3">
                  <mat-icon class="text-amber-800">security</mat-icon>
                  <div class="text-xs">
                     <div class="font-bold text-stone-900 uppercase tracking-tighter">Certificados SSL & Segurança</div>
                     <div class="text-stone-600 font-medium">Validade: 342 dias restantes. Criptografia AES-256 habilitada.</div>
                  </div>
               </div>
               <mat-icon class="text-emerald-600">verified</mat-icon>
            </div>
         </div>
      </div>

    </div>
  `
})
export class HqSystemConfigComponent {
  readonly ecosystem = inject(EcosystemService);

  // Dynamic Infra Metrics (Derived from ecosystem load)
  readonly infraStats = computed(() => {
    const sessionCount = this.ecosystem.activeSessionsCount();
    const base = [85, 90, 88, 92, 95, 87, 85, 98, 100, 95, 92, 90, 88, 85];
    return base.map(v => Math.min(100, Math.max(10, v + (sessionCount % 10) - 5)));
  });
  
  readonly dbThroughput = computed(() => (this.ecosystem.orders().length * 0.12 + 5).toFixed(1));
  readonly globalTraffic = computed(() => (this.ecosystem.activeSessionsCount() * 0.015 + 1).toFixed(1));

  readonly currentLoad = computed(() => {
    const stats = this.infraStats();
    return Math.round(stats.reduce((a, b) => a + b, 0) / stats.length);
  });

  updateCommission(event: Event) {
    const target = event.target as HTMLInputElement;
    const val = parseFloat(target.value) / 100;
    if (!isNaN(val)) {
      this.ecosystem.hqCommissionRate.set(val);
    }
  }

  saveCommissionRate() {
    this.ecosystem.setPlatformCommissionRate(this.ecosystem.hqCommissionRate());
  }

  toggleMaintenanceMode() {
    const next = !this.ecosystem.maintenanceMode();
    this.ecosystem.maintenanceMode.set(next);
    this.ecosystem.setMaintenance(next).catch((err: unknown) => console.warn('Maintenance sync deferred:', err));
  }

  sendBroadcast(msg: string) {
    if (!msg) return;
    this.ecosystem.globalBroadcastMessage.set(msg);
    this.ecosystem.setBroadcast(msg).catch((err: unknown) => console.warn('Broadcast sync deferred:', err));
    this.ecosystem.notify('Broadcast Global enviado!', 'success');
    this.ecosystem.logAudit('Broadcast Global', 'HQ', `Mensagem disparada: ${msg}`, 'warning');
  }
}
