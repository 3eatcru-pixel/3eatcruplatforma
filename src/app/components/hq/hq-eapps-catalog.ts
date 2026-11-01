import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { EcosystemService } from '../../services/ecosystem.service';
import { OSAppId } from '../../models/os.model';

export interface EAppMeta {
  id: OSAppId;
  label: string;
  title: string;
  icon: string;
  colorClass: string;
  category: 'operacional' | 'financeiro' | 'integracao' | 'utilitarios' | 'gestao';
  minPlan: 'Starter' | 'Professional' | 'Enterprise';
  status: 'active' | 'beta' | 'maintenance';
  activeTenantsCount: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-hq-eapps-catalog',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="space-y-6 text-stone-200 font-sans">
      
      <!-- HEADER BANNER: CATÁLOGO DE eAPPS (EMBEDDED OS APPS) -->
      <div class="bg-gradient-to-r from-[#1c0f08] via-[#2a160b] to-[#170a04] border-2 border-[#4d2813] rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div class="absolute -right-8 -bottom-8 opacity-10 pointer-events-none text-amber-500">
          <mat-icon class="text-[160px]">widgets</mat-icon>
        </div>

        <div class="relative z-10 space-y-2">
          <div class="flex items-center gap-2 text-amber-500 font-serif font-black uppercase text-[10px] tracking-widest">
            <mat-icon class="text-sm text-amber-400">apps</mat-icon>
            <span>Catálogo Mestre de eApps (Embedded OS Apps)</span>
            <span class="bg-amber-950 text-amber-300 border border-amber-700/60 px-2 py-0.5 rounded font-mono text-[9px]">STORE OS ENGINE V3</span>
          </div>

          <h2 class="text-2xl sm:text-3xl font-serif font-black tracking-tight text-white">
            eApps Embutidos do Store OS
          </h2>

          <p class="text-stone-400 text-xs font-serif max-w-2xl leading-relaxed">
            Os <strong>eApps</strong> são os módulos operacionais embutidos que rodam em janelas dentro do <strong>Store OS (Sistema Operacional da Loja)</strong>. Controle a distribuição por plano SaaS, disponibilidade e estatísticas de uso.
          </p>
        </div>

        <div class="flex items-center gap-3 relative z-10 shrink-0">
          <div class="bg-[#2a160b] border border-[#482814] px-4 py-2.5 rounded-2xl text-center shadow">
            <span class="text-[10px] text-stone-400 font-mono block uppercase">Total de eApps</span>
            <span class="text-amber-400 font-black text-base font-serif">{{ totalEAppsCount() }} Módulos</span>
          </div>
        </div>
      </div>

      <!-- FILTER & CATEGORY BAR -->
      <div class="flex flex-wrap items-center justify-between gap-4 bg-[#201007] border border-[#482814] p-4 rounded-3xl shadow-xl">
        <div class="flex items-center gap-2 overflow-x-auto no-scrollbar">
          @for (cat of categories; track cat.id) {
            <button
              type="button"
              (click)="selectedCategory.set(cat.id)"
              [class]="selectedCategory() === cat.id ? 'bg-amber-600 text-stone-950 font-black shadow' : 'bg-[#150a04] text-stone-400 hover:text-white border border-[#3d200f]'"
              class="px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer font-bold whitespace-nowrap">
              <mat-icon class="text-sm">{{ cat.icon }}</mat-icon>
              <span>{{ cat.label }}</span>
            </button>
          }
        </div>

        <div class="relative w-full sm:w-64">
          <mat-icon class="absolute left-3 top-2.5 text-stone-500 text-sm">search</mat-icon>
          <input
            type="text"
            [value]="searchQuery()"
            (input)="searchQuery.set($any($event.target).value)"
            placeholder="Buscar eApp por nome..."
            class="w-full bg-[#150a04] border border-[#3d200f] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-600">
        </div>
      </div>

      <!-- eAPPS CARDS GRID -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (app of filteredEApps(); track app.id) {
          <div class="bg-[#1b0d06] border border-[#3d200f] hover:border-amber-600/50 rounded-2xl p-4 shadow-xl transition-all space-y-3 flex flex-col justify-between group">
            
            <div class="space-y-3">
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3">
                  <div [class]="'w-11 h-11 rounded-2xl bg-gradient-to-br ' + app.colorClass + ' text-white flex items-center justify-center font-bold shadow-md shrink-0'">
                    <mat-icon class="text-xl">{{ app.icon }}</mat-icon>
                  </div>
                  <div>
                    <h4 class="font-serif font-black text-white text-sm group-hover:text-amber-400 transition-colors">
                      {{ app.label }}
                    </h4>
                    <span class="text-[10px] font-mono text-stone-400 block font-bold">
                      ID: {{ app.id }}
                    </span>
                  </div>
                </div>

                <span [class]="getPlanBadgeClass(app.minPlan)" class="text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase border">
                  {{ app.minPlan }}
                </span>
              </div>

              <p class="text-xs text-stone-300 font-sans leading-relaxed">
                {{ app.title }}
              </p>
            </div>

            <div class="pt-3 border-t border-[#2e170b] flex items-center justify-between text-[10px] font-mono">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span class="text-stone-400">Lojas Ativas:</span>
                <strong class="text-amber-400 font-bold">{{ app.activeTenantsCount }}</strong>
              </div>

              <button
                type="button"
                (click)="launchInStoreOs(app.id)"
                class="bg-[#2a160b] hover:bg-amber-600 hover:text-stone-950 text-amber-300 font-mono text-[10px] font-bold px-3 py-1.5 rounded-xl border border-[#482814] flex items-center gap-1 transition-all cursor-pointer">
                <mat-icon class="text-xs">open_in_new</mat-icon>
                <span>Inspecionar</span>
              </button>
            </div>

          </div>
        } @empty {
          <div class="col-span-full py-12 text-center text-stone-500 font-mono text-xs">
            Nenhum eApp localizado com o filtro especificado.
          </div>
        }
      </div>

    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(217, 119, 6, 0.3); border-radius: 4px; }
  `]
})
export class HqEappsCatalogComponent {
  readonly ecosystem = inject(EcosystemService);
  private readonly router = inject(Router);

  readonly selectedCategory = signal<string>('all');
  readonly searchQuery = signal<string>('');

  readonly categories = [
    { id: 'all', label: 'Todos os eApps', icon: 'apps' },
    { id: 'operacional', label: 'Operação & Cozinha', icon: 'soup_kitchen' },
    { id: 'financeiro', label: 'Financeiro & Caixa', icon: 'account_balance_wallet' },
    { id: 'gestao', label: 'Gestão & CRM', icon: 'analytics' },
    { id: 'integracao', label: 'Integrações', icon: 'cloud_sync' },
    { id: 'utilitarios', label: 'Utilitários', icon: 'construction' }
  ];

  readonly eAppsList: EAppMeta[] = [
    { id: 'pos', label: 'PDV Caixa', title: 'Ponto de Venda com atalhos rápidos e abertura de caixa', icon: 'point_of_sale', colorClass: 'from-amber-500 via-orange-600 to-amber-700', category: 'operacional', minPlan: 'Starter', status: 'active', activeTenantsCount: 12 },
    { id: 'tables', label: 'Mesas & Salão', title: 'Mapa visual interativo de comandas e salão de atendimento', icon: 'table_restaurant', colorClass: 'from-amber-600 to-amber-800', category: 'operacional', minPlan: 'Starter', status: 'active', activeTenantsCount: 10 },
    { id: 'kds', label: 'KDS Cozinha', title: 'Display de Cozinha em tempo real com priorização e tempo de preparo', icon: 'soup_kitchen', colorClass: 'from-emerald-600 to-emerald-800', category: 'operacional', minPlan: 'Starter', status: 'active', activeTenantsCount: 9 },
    { id: 'inventory', label: 'Estoque ERP', title: 'Ficha técnica, inventário de insumos e alerta de reposição', icon: 'inventory_2', colorClass: 'from-amber-500 to-amber-700', category: 'gestao', minPlan: 'Starter', status: 'active', activeTenantsCount: 11 },
    { id: 'finance', label: 'Caixa & Finanças', title: 'Fechamento de caixa diário, sangrias, suprimentos e fluxo de caixa', icon: 'account_balance_wallet', colorClass: 'from-emerald-500 to-teal-700', category: 'financeiro', minPlan: 'Starter', status: 'active', activeTenantsCount: 12 },
    { id: 'suppliers', label: 'Fornecedores', title: 'Cotações de compras, ordens de fornecimento e nota fiscal', icon: 'local_shipping', colorClass: 'from-amber-600 via-orange-600 to-amber-800', category: 'gestao', minPlan: 'Professional', status: 'active', activeTenantsCount: 7 },
    { id: 'reconciliation', label: 'Reconciliação', title: 'Auditoria de maquininhas de cartão, taxas e adquirentes', icon: 'swap_horiz', colorClass: 'from-emerald-600 to-teal-800', category: 'financeiro', minPlan: 'Professional', status: 'active', activeTenantsCount: 6 },
    { id: 'stock-audit', label: 'Inventário Cego', title: 'Contagem cega de insumos e balanço físico de estoque', icon: 'fact_check', colorClass: 'from-amber-500 to-orange-700', category: 'gestao', minPlan: 'Professional', status: 'active', activeTenantsCount: 5 },
    { id: 'store-manager', label: 'Minha Loja', title: 'Configuração do cardápio público no marketplace regional', icon: 'storefront', colorClass: 'from-amber-400 via-orange-500 to-amber-600', category: 'gestao', minPlan: 'Starter', status: 'active', activeTenantsCount: 12 },
    { id: 'whatsapp', label: 'WhatsApp Bot', title: 'Robô atendente para pedidos automáticos no WhatsApp', icon: 'chat', colorClass: 'from-emerald-600 to-emerald-800', category: 'integracao', minPlan: 'Professional', status: 'active', activeTenantsCount: 8 },
    { id: 'ifood', label: 'iFood Sync', title: 'Integração bidirecional de pedidos e cardápio iFood', icon: 'delivery_dining', colorClass: 'from-rose-600 to-red-800', category: 'integracao', minPlan: 'Professional', status: 'active', activeTenantsCount: 8 },
    { id: 'drivers', label: 'Hub Logística', title: 'Despacho geodésico de entregadores e acompanhamento GPS', icon: 'alt_route', colorClass: 'from-emerald-500 via-teal-600 to-emerald-800', category: 'operacional', minPlan: 'Professional', status: 'active', activeTenantsCount: 10 },
    { id: 'reports', label: 'Inteligência & KPIs', title: 'Relatórios analíticos, CMV teórico vs real e ticket médio', icon: 'analytics', colorClass: 'from-indigo-600 to-indigo-800', category: 'gestao', minPlan: 'Starter', status: 'active', activeTenantsCount: 12 },
    { id: 'crm', label: 'Fidelidade & CRM', title: 'Programa de pontos, cashback e régua de relacionamento', icon: 'loyalty', colorClass: 'from-indigo-400 to-indigo-600', category: 'gestao', minPlan: 'Professional', status: 'active', activeTenantsCount: 7 },
    { id: 'admin-hub', label: 'Gabinete da Loja', title: 'Configurações avançadas do proprietário da filial', icon: 'admin_panel_settings', colorClass: 'from-rose-600 via-amber-600 to-amber-800', category: 'gestao', minPlan: 'Enterprise', status: 'active', activeTenantsCount: 4 }
  ];

  readonly totalEAppsCount = computed(() => this.eAppsList.length);

  readonly filteredEApps = computed(() => {
    const cat = this.selectedCategory();
    const query = this.searchQuery().toLowerCase().trim();

    return this.eAppsList.filter(app => {
      const matchCat = cat === 'all' || app.category === cat;
      const matchQuery = !query || app.label.toLowerCase().includes(query) || app.title.toLowerCase().includes(query) || app.id.toLowerCase().includes(query);
      return matchCat && matchQuery;
    });
  });

  getPlanBadgeClass(plan: string): string {
    switch (plan) {
      case 'Starter': return 'bg-amber-950/80 text-amber-300 border-amber-700/60';
      case 'Professional': return 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60';
      case 'Enterprise': return 'bg-purple-950/80 text-purple-300 border-purple-700/60';
      default: return 'bg-stone-800 text-stone-300 border-stone-600';
    }
  }

  launchInStoreOs(appId: OSAppId) {
    this.ecosystem.currentView.set('os');
    this.router.navigate(['/os']);
    this.ecosystem.notify(`Modo Inspeção eApp: Abrindo ${appId} no Store OS.`, 'info');
  }
}
