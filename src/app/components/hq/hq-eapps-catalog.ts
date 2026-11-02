import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { EcosystemService } from '../../services/ecosystem.service';
import { OSAppId } from '../../models/os.model';

type EAppReadiness = 'Beta' | 'Parcial' | 'Somente consulta' | 'Demonstração' | 'Em breve';

export interface EAppMeta {
  id: OSAppId;
  label: string;
  title: string;
  icon: string;
  colorClass: string;
  category: 'operacional' | 'financeiro' | 'integracao' | 'utilitarios' | 'gestao';
  readiness: EAppReadiness;
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
            <span>Catálogo de módulos e integrações</span>
            <span class="bg-amber-950 text-amber-300 border border-amber-700/60 px-2 py-0.5 rounded font-mono text-[9px]">METADADOS LOCAIS</span>
          </div>

          <h2 class="text-2xl sm:text-3xl font-serif font-black tracking-tight text-white">
            Módulos e integrações do Store OS
          </h2>

          <p class="text-stone-400 text-xs font-serif max-w-2xl leading-relaxed">
            A assinatura dá acesso ao <strong>Store OS</strong> completo em todos os planos; a cota de dispositivos é o limite comercial. Integrações e funções ainda em desenvolvimento continuam pendentes para todos os lojistas.
          </p>
        </div>

        <div class="flex items-center gap-3 relative z-10 shrink-0">
          <div class="bg-[#2a160b] border border-[#482814] px-4 py-2.5 rounded-2xl text-center shadow">
            <span class="text-[10px] text-stone-400 font-mono block uppercase">Itens listados</span>
            <span class="text-amber-400 font-black text-base font-serif">{{ totalEAppsCount() }} referências</span>
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

                <div class="flex flex-col items-end gap-1">
                  <span class="bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase">
                    Todos os planos
                  </span>
                  <span [class]="getReadinessBadgeClass(app.readiness)" class="text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase border">
                    {{ app.readiness }}
                  </span>
                </div>
              </div>

              <p class="text-xs text-stone-300 font-sans leading-relaxed">
                {{ app.title }}
              </p>
            </div>

            <div class="pt-3 border-t border-[#2e170b] flex items-center justify-end text-[10px] font-mono">
              <button
                type="button"
                (click)="launchInStoreOs(app.id)"
                class="bg-[#2a160b] hover:bg-amber-600 hover:text-stone-950 text-amber-300 font-mono text-[10px] font-bold px-3 py-1.5 rounded-xl border border-[#482814] flex items-center gap-1 transition-all cursor-pointer">
                <mat-icon class="text-xs">open_in_new</mat-icon>
                <span>Abrir Store OS</span>
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
    { id: 'pos', label: 'PDV Caixa', title: 'Rota de venda presencial; homologação de hardware e adquirentes continua pendente.', icon: 'point_of_sale', colorClass: 'from-amber-500 via-orange-600 to-amber-700', category: 'operacional', readiness: 'Beta' },
    { id: 'tables', label: 'Mesas & Salão', title: 'Consulta e operação de mesas por unidade, integrada ao fluxo de reservas.', icon: 'table_restaurant', colorClass: 'from-amber-600 to-amber-800', category: 'operacional', readiness: 'Beta' },
    { id: 'kds', label: 'KDS Cozinha', title: 'Consulta pedidos e avança o preparo até pronto; não liquida nem conclui o pedido.', icon: 'soup_kitchen', colorClass: 'from-emerald-600 to-emerald-800', category: 'operacional', readiness: 'Beta' },
    { id: 'inventory', label: 'Estoque ERP', title: 'Consulta e cadastro de produtos; sem ajuste direto de saldo ou histórico de movimentos.', icon: 'inventory_2', colorClass: 'from-amber-500 to-amber-700', category: 'gestao', readiness: 'Parcial' },
    { id: 'finance', label: 'Caixa & Finanças', title: 'Consulta lançamentos da unidade; sem DRE, conciliação ou criação de lançamentos nesta tela.', icon: 'account_balance_wallet', colorClass: 'from-emerald-500 to-teal-700', category: 'financeiro', readiness: 'Somente consulta' },
    { id: 'suppliers', label: 'Fornecedores', title: 'Cadastro de contatos por unidade; compras e recebimento de mercadorias ainda não disponíveis.', icon: 'local_shipping', colorClass: 'from-amber-600 via-orange-600 to-amber-800', category: 'gestao', readiness: 'Parcial' },
    { id: 'reconciliation', label: 'Reconciliação', title: 'Importação de extratos e conciliação de adquirentes ainda não estão integradas.', icon: 'swap_horiz', colorClass: 'from-emerald-600 to-teal-800', category: 'financeiro', readiness: 'Em breve' },
    { id: 'stock-audit', label: 'Inventário', title: 'Registra contagens e divergências; não ajusta automaticamente o saldo do estoque.', icon: 'fact_check', colorClass: 'from-amber-500 to-orange-700', category: 'gestao', readiness: 'Parcial' },
    { id: 'store-manager', label: 'Minha Loja', title: 'Edita perfil, taxa do cliente, complemento da loja ao entregador, pedido mínimo e PIX; não processa repasses.', icon: 'storefront', colorClass: 'from-amber-400 via-orange-500 to-amber-600', category: 'gestao', readiness: 'Beta' },
    { id: 'whatsapp', label: 'WhatsApp', title: 'Protótipo visual; não envia mensagens por um provedor externo.', icon: 'chat', colorClass: 'from-emerald-600 to-emerald-800', category: 'integracao', readiness: 'Demonstração' },
    { id: 'delivery-marketplaces', label: 'Pedidos de Marketplaces', title: 'Catálogo de plugins iFood, 99Food e Rappi; conectores e homologação ainda pendentes.', icon: 'delivery_dining', colorClass: 'from-sky-500 via-cyan-600 to-indigo-700', category: 'integracao', readiness: 'Demonstração' },
    { id: 'drivers', label: 'Hub Logística', title: 'Rotas manuais e frota própria da loja; sem GPS ou processamento da remuneração.', icon: 'alt_route', colorClass: 'from-emerald-500 via-teal-600 to-emerald-800', category: 'operacional', readiness: 'Beta' },
    { id: 'reports', label: 'Relatórios', title: 'Resumo comercial dos 200 pedidos recentes; sem DRE, margem ou CMV.', icon: 'analytics', colorClass: 'from-indigo-600 to-indigo-800', category: 'gestao', readiness: 'Somente consulta' },
    { id: 'crm', label: 'CRM', title: 'Resumo de clientes identificados em pedidos pagos; pontos e campanhas externas pendentes.', icon: 'loyalty', colorClass: 'from-indigo-400 to-indigo-600', category: 'gestao', readiness: 'Somente consulta' },
    { id: 'admin-hub', label: 'Gabinete da Loja', title: 'Área administrativa avançada ainda sem fluxo integrado.', icon: 'admin_panel_settings', colorClass: 'from-rose-600 via-amber-600 to-amber-800', category: 'gestao', readiness: 'Em breve' }
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

  getReadinessBadgeClass(readiness: EAppReadiness): string {
    if (readiness === 'Em breve' || readiness === 'Demonstração') {
      return 'bg-amber-950/80 text-amber-300 border-amber-700/60';
    }
    if (readiness === 'Parcial' || readiness === 'Somente consulta') {
      return 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60';
    }
    return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';
  }

  launchInStoreOs(appId: OSAppId) {
    this.ecosystem.currentView.set('os');
    this.router.navigate(['/os']);
    this.ecosystem.notify(`Store OS aberto. Selecione o módulo ${appId} na interface.`, 'info');
  }
}
