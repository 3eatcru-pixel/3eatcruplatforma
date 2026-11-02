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
          <p class="text-xs text-stone-400 font-geist">Consulte as lojas, ajuste o status administrativo e abra o Store OS em modo de inspeção.</p>
        </div>

        <div class="flex items-center gap-3 w-full md:w-auto">
          <label for="hqTenantSearch" class="sr-only">Buscar por nome, CNPJ, cidade ou bairro</label>
          <input 
            id="hqTenantSearch"
            [value]="searchQuery()" 
            (input)="searchQuery.set($any($event.target).value)"
            type="text" 
            placeholder="Nome, CNPJ, cidade ou bairro..."
            class="bg-[#0e0e10] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-stone-500 font-mono-code focus:outline-none focus:border-amber-500 w-full md:w-64">
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2 text-[10px] text-stone-400" aria-live="polite">
        <span>{{ filteredTenants().length }} de {{ ecosystem.tenants().length }} lojas</span>
        <span>Ativa: publicada • Em teste: trial • Suspensa: fora do marketplace público</span>
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
                <span [class]="statusClass(tenant)" class="text-[9px] font-mono-code px-2 py-0.5 rounded border uppercase font-bold">
                  {{ statusLabel(tenant) }}
                </span>
              </div>
              <div class="font-mono-code text-[11px] text-stone-400">
                CNPJ: {{ tenant.cnpj }} • PLANO: <span class="text-amber-400 font-bold uppercase">{{ tenant.plan }}</span>
              </div>
              <div class="text-[11px] text-stone-500">
                {{ tenant.address.city || 'Cidade não informada' }}{{ tenant.address.state ? ', ' + tenant.address.state : '' }}
                @if (tenant.address.neighborhood) { <span>• {{ tenant.address.neighborhood }}</span> }
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button 
                (click)="openGovernance.emit(tenant)" 
                class="bg-white/5 hover:bg-white/10 text-stone-200 border border-white/10 font-mono-code font-bold py-2 px-3 rounded-lg text-[10px] transition-all cursor-pointer">
                GOVERNANÇA
              </button>
              <button 
                type="button"
                (click)="toggleStatus(tenant)"
                [disabled]="isUpdatingStatus(tenant.id)"
                [attr.aria-label]="statusActionLabel(tenant) + ' ' + tenant.name"
                [class]="tenant.status === 'active' ? 'border-rose-500/50 text-rose-400 hover:bg-rose-500/10' : 'border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10'"
                class="bg-transparent border font-mono-code font-bold py-2 px-3 rounded-lg text-[10px] transition-all cursor-pointer disabled:cursor-wait disabled:opacity-50">
                {{ isUpdatingStatus(tenant.id) ? 'SALVANDO…' : statusActionLabel(tenant) }}
              </button>
            </div>

            <button 
              (click)="inspectRemote.emit(tenant)" 
              class="bg-black hover:bg-stone-900 text-white font-mono-code font-bold py-2.5 px-4 rounded-lg text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-white/10 shadow">
              <mat-icon class="text-sm">desktop_windows</mat-icon>
              <span>INSPECIONAR OS</span>
            </button>
          </div>
        } @empty {
          <div class="rounded-xl border border-dashed border-white/15 bg-[#111114] px-5 py-10 text-center text-sm text-stone-400">
            {{ ecosystem.tenants().length ? 'Nenhuma loja corresponde à busca.' : 'Nenhuma loja foi carregada para este contexto.' }}
          </div>
        }
      </div>
    </div>
  `
})
export class HqTenantsListComponent {
  readonly ecosystem = inject(EcosystemService);
  
  readonly searchQuery = signal<string>('');
  readonly updatingTenantStatus = signal<Set<string>>(new Set());
  
  openGovernance = output<CompanyTenant>();
  inspectRemote = output<CompanyTenant>();

  readonly filteredTenants = computed(() => {
    const q = this.normalizeSearchText(this.searchQuery());
    const list = this.ecosystem.tenants();
    if (!q) return list;
    const cnpjQuery = q.replace(/\D/g, '');
    return list.filter((tenant) => {
      const searchFields = [
        tenant.name,
        tenant.legalName,
        tenant.address?.city,
        tenant.address?.state,
        tenant.address?.neighborhood
      ].filter((value): value is string => typeof value === 'string');
      return searchFields.some((value) => this.normalizeSearchText(value).includes(q)) ||
        Boolean(cnpjQuery) && tenant.cnpj.replace(/\D/g, '').includes(cnpjQuery);
    });
  });

  statusLabel(tenant: CompanyTenant): string {
    if (tenant.status === 'active') return '● ATIVA';
    if (tenant.status === 'trial') return 'EM TESTE';
    return 'SUSPENSA';
  }

  statusClass(tenant: CompanyTenant): string {
    if (tenant.status === 'active') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    if (tenant.status === 'trial') return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
  }

  statusActionLabel(tenant: CompanyTenant): string {
    return tenant.status === 'active' ? 'SUSPENDER' : 'ATIVAR';
  }

  isUpdatingStatus(tenantId: string): boolean {
    return this.updatingTenantStatus().has(tenantId);
  }

  async toggleStatus(tenant: CompanyTenant) {
    if (this.isUpdatingStatus(tenant.id)) return;
    const newStatus = tenant.status === 'active' ? 'suspended' : 'active';
    this.updatingTenantStatus.update((current) => new Set(current).add(tenant.id));
    try {
      await this.ecosystem.updateTenant(tenant.id, { status: newStatus });
      const verb = newStatus === 'active' ? 'ativada' : 'suspensa';
      this.ecosystem.notify(
        this.ecosystem.isSimulationMode()
          ? `Loja ${verb} somente na simulação.`
          : `Loja ${verb} no marketplace público.`,
        this.ecosystem.isSimulationMode() ? 'info' : 'success'
      );
    } catch {
      this.ecosystem.notify('Não foi possível alterar o status desta loja. Tente novamente.', 'error');
    } finally {
      this.updatingTenantStatus.update((current) => {
        const next = new Set(current);
        next.delete(tenant.id);
        return next;
      });
    }
  }

  private normalizeSearchText(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
  }
}
