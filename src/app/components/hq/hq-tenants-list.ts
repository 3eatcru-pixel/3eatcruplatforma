import { ChangeDetectionStrategy, Component, inject, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EcosystemService } from '../../services/ecosystem.service';
import { CompanyTenant } from '../../models/ecosystem.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-hq-tenants-list',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="space-y-4 animate-in fade-in duration-300">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#111114] border border-white/10 p-4 rounded-xl shadow-inner">
        <div>
          <h3 class="font-syne font-extrabold text-white text-base flex items-center gap-2">
            <mat-icon class="text-amber-500">business</mat-icon>
            <span>Lojas Credenciadas &amp; Portfólio Multi-Tenant</span>
          </h3>
          <p class="text-xs text-stone-400 font-geist">Controle de licenças, status operacional e acesso remoto para suporte de unidade.</p>
        </div>

        <div class="flex items-center gap-3 w-full md:w-auto">
          <input 
            [value]="searchQuery()" 
            (input)="searchQuery.set($any($event.target).value)"
            type="text" 
            placeholder="CNPJ, NOME OU CIDADE..." 
            class="bg-[#0e0e10] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-stone-500 font-mono-code focus:outline-none focus:border-amber-500 w-full md:w-64">
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3">
        @for (tenant of filteredTenants(); track tenant.id) {
          <div class="bg-[#16161a] border border-white/10 rounded-lg p-5 shadow-xl text-stone-200 grid grid-cols-1 md:grid-cols-[auto_1fr_auto_auto] items-center gap-6 hover:border-amber-500/50 transition-all">
            <div class="bg-amber-500 text-stone-950 font-mono-code font-bold text-[10px] px-2.5 py-1 rounded uppercase tracking-wider text-center shrink-0">
              {{ tenant.badgeCategory || 'ESTABELECIMENTO' }}
            </div>

            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <h4 class="font-syne font-bold text-white text-lg leading-tight">{{ tenant.name }}</h4>
                <span [class]="tenant.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border-rose-500/40'" class="text-[9px] font-mono-code px-2 py-0.5 rounded border uppercase font-bold">
                  {{ tenant.status === 'active' ? '● OPERACIONAL' : 'SUSPENSO' }}
                </span>
              </div>
              <div class="font-mono-code text-[11px] text-stone-400">
                CNPJ: {{ tenant.cnpj }} • PLANO: <span class="text-amber-400 font-bold uppercase">{{ tenant.plan }}</span>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button 
                (click)="openGovernance.emit(tenant)" 
                class="bg-white/5 hover:bg-white/10 text-stone-200 border border-white/10 font-mono-code font-bold py-2 px-3 rounded-lg text-[10px] transition-all cursor-pointer">
                GOVERNANÇA
              </button>
              <button 
                (click)="toggleStatus(tenant)" 
                [class]="tenant.status === 'active' ? 'border-rose-500/50 text-rose-400 hover:bg-rose-500/10' : 'border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10'" 
                class="bg-transparent border font-mono-code font-bold py-2 px-3 rounded-lg text-[10px] transition-all cursor-pointer">
                {{ tenant.status === 'active' ? 'SUSPENDER' : 'ATIVAR' }}
              </button>
            </div>

            <button 
              (click)="inspectRemote.emit(tenant)" 
              class="bg-black hover:bg-stone-900 text-white font-mono-code font-bold py-2.5 px-4 rounded-lg text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-white/10 shadow">
              <mat-icon class="text-sm">desktop_windows</mat-icon>
              <span>INSPECTION</span>
            </button>
          </div>
        }
      </div>
    </div>
  `
})
export class HqTenantsListComponent {
  readonly ecosystem = inject(EcosystemService);
  
  readonly searchQuery = signal<string>('');
  
  openGovernance = output<CompanyTenant>();
  inspectRemote = output<CompanyTenant>();

  readonly filteredTenants = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const list = this.ecosystem.tenants();
    if (!q) return list;
    return list.filter(t => t.name.toLowerCase().includes(q) || t.cnpj.includes(q) || t.legalName.toLowerCase().includes(q));
  });

  toggleStatus(tenant: CompanyTenant) {
    const newStatus = tenant.status === 'active' ? 'suspended' : 'active';
    this.ecosystem.updateTenant(tenant.id, { status: newStatus });
  }
}
