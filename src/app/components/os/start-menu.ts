import { ChangeDetectionStrategy, Component, input, output, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { EcosystemService } from '../../services/ecosystem.service';
import { OSAppId } from '../../models/os.model';
import { OSWorkspace } from '../../services/os-preferences.service';
import { OrderTransaction } from '../../models/ecosystem.model';

export interface AppDefinition {
  id: OSAppId;
  title: string;
  icon: string;
  category: 'vendas' | 'gestao' | 'operacao' | 'sistema';
  badge?: string;
  color: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-os-start-menu',
  imports: [CommonModule, MatIconModule],
  template: `
    <div 
      class="fixed bottom-14 left-4 z-[300] bg-[#180b04]/98 border-2 border-[#4d2813] rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-5 w-full max-w-md text-stone-200 backdrop-blur-xl animate-in slide-in-from-bottom-6 duration-200 select-none flex flex-col space-y-4">
      
      <!-- HEADER: STORE & OPERATOR PROFILE -->
      <div class="flex items-center justify-between pb-3 border-b border-[#3d200f]">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 text-stone-950 flex items-center justify-center font-black text-lg shadow-lg border border-amber-400/30">
            3E
          </div>
          <div>
            <div class="font-serif font-black text-sm text-white flex items-center gap-1.5">
              <span>{{ currentTenant().name }}</span>
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Sessão Ativa"></span>
            </div>
            <div class="text-[10px] text-amber-400 font-mono flex items-center gap-1">
              <mat-icon class="text-[11px]">person</mat-icon>
              <span>{{ session()?.name || 'Operador' }} &bull; {{ currentTenant().plan }}</span>
            </div>
          </div>
        </div>

        @if (isHqAdmin()) {
          <span class="text-[9px] bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded-full font-mono font-bold tracking-wider">
            AUDITORIA HQ
          </span>
        }
      </div>

      <!-- SEARCH BAR -->
      <div class="relative">
        <mat-icon class="absolute left-3.5 top-2.5 text-stone-400 text-base">search</mat-icon>
        <input
          type="text"
          [value]="searchFilter()"
          (input)="onSearchInput($event)"
          placeholder="Buscar no Menu Iniciar (PDV, Estoque, KDS, DRE...)"
          class="w-full bg-[#2a160b] border border-[#4d2813] focus:border-amber-500 text-amber-100 placeholder-stone-500 text-xs rounded-2xl pl-10 pr-9 py-2.5 outline-none transition-all" />
        @if (searchFilter()) {
          <button 
            type="button" 
            (click)="searchFilter.set('')"
            class="absolute right-3 top-2.5 text-stone-400 hover:text-white text-xs">
            ✕
          </button>
        }
      </div>

      <!-- CATEGORY TABS -->
      <div class="flex items-center gap-1 text-[10px] font-bold p-1 bg-[#231208] border border-[#3d200f] rounded-xl">
        <button
          type="button"
          (click)="selectedCategory.set('all')"
          [class]="selectedCategory() === 'all' ? 'bg-amber-600 text-stone-950 shadow' : 'text-stone-400 hover:text-stone-200'"
          class="flex-1 py-1 rounded-lg text-center transition-all cursor-pointer">
          Tudo
        </button>
        <button
          type="button"
          (click)="selectedCategory.set('vendas')"
          [class]="selectedCategory() === 'vendas' ? 'bg-amber-600 text-stone-950 shadow' : 'text-stone-400 hover:text-stone-200'"
          class="flex-1 py-1 rounded-lg text-center transition-all cursor-pointer">
          Vendas
        </button>
        <button
          type="button"
          (click)="selectedCategory.set('gestao')"
          [class]="selectedCategory() === 'gestao' ? 'bg-amber-600 text-stone-950 shadow' : 'text-stone-400 hover:text-stone-200'"
          class="flex-1 py-1 rounded-lg text-center transition-all cursor-pointer">
          Gestão
        </button>
        <button
          type="button"
          (click)="selectedCategory.set('sistema')"
          [class]="selectedCategory() === 'sistema' ? 'bg-amber-600 text-stone-950 shadow' : 'text-stone-400 hover:text-stone-200'"
          class="flex-1 py-1 rounded-lg text-center transition-all cursor-pointer">
          Sistema
        </button>
      </div>

      <!-- APP GRID (SCROLLABLE) -->
      <div class="max-h-64 overflow-y-auto pr-1 grid grid-cols-4 gap-2 text-xs custom-scrollbar">
        @for (app of filteredApps(); track app.id) {
          <div class="relative group">
            <button
              type="button"
              (click)="appSelected.emit({id: app.id, title: app.title, icon: app.icon})"
              class="w-full flex flex-col items-center p-2 rounded-2xl hover:bg-[#3d200f] active:scale-95 text-center transition-all cursor-pointer">
              
              <div [class]="'w-10 h-10 rounded-xl bg-gradient-to-br ' + app.color + ' text-white flex items-center justify-center shadow-md mb-1.5 group-hover:scale-105 transition-transform border border-white/10'">
                <mat-icon class="text-xl">{{ app.icon }}</mat-icon>
              </div>

              <span class="font-bold text-[10px] text-amber-200 group-hover:text-white leading-tight line-clamp-2">
                {{ app.title }}
              </span>

              @if (app.badge) {
                <span class="absolute top-1 left-1 text-[8px] bg-emerald-500 text-stone-950 font-black px-1 rounded-full shadow">
                  {{ app.badge }}
                </span>
              }
            </button>

            <!-- PIN / UNPIN DESKTOP ACTION BUTTON -->
            <div class="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                (click)="togglePin($event, app.id)"
                [title]="isPinned(app.id) ? 'Remover da Área de Trabalho' : 'Fixar na Área de Trabalho'"
                [class]="isPinned(app.id) ? 'text-amber-400 bg-amber-950/80 border-amber-600' : 'text-stone-400 bg-[#2b160b] hover:text-white border-[#4d2813]'"
                class="p-1 rounded-lg border transition-all cursor-pointer shadow z-10">
                <mat-icon class="text-[12px] h-3 w-3 leading-none">
                  {{ isPinned(app.id) ? 'push_pin' : 'add' }}
                </mat-icon>
              </button>
              
              <button
                type="button"
                (click)="onToggleFavorite($event, app.id)"
                [title]="isFavorite(app.id) ? 'Remover dos Favoritos' : 'Fixar nos Favoritos'"
                [class]="isFavorite(app.id) ? 'text-rose-400 bg-rose-950/80 border-rose-800' : 'text-stone-400 bg-[#2b160b] hover:text-white border-[#4d2813]'"
                class="p-1 rounded-lg border transition-all cursor-pointer shadow z-10">
                <mat-icon class="text-[12px] h-3 w-3 leading-none">
                  {{ isFavorite(app.id) ? 'favorite' : 'favorite_border' }}
                </mat-icon>
              </button>
            </div>
          </div>
        }
        @if (filteredApps().length === 0) {
          <div class="col-span-4 py-8 text-center text-stone-500 text-xs">
            Nenhum aplicativo encontrado para "{{ searchFilter() }}".
          </div>
        }
      </div>

      <!-- QUICK KPI STATS CAROUSEL -->
      <div class="bg-[#2a160b]/80 border border-[#4d2813] rounded-2xl p-3 flex items-center justify-between text-xs">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-xl bg-emerald-950 border border-emerald-700/60 text-emerald-400 flex items-center justify-center">
            <mat-icon class="text-sm">payments</mat-icon>
          </div>
          <div>
            <div class="text-[9px] uppercase font-mono text-stone-400 font-bold">Vendas de Hoje</div>
            <div class="font-mono font-bold text-emerald-400 text-xs">R$ {{ todayRevenue().toFixed(2) }}</div>
          </div>
        </div>

        <button 
          type="button" 
          (click)="appSelected.emit({id: 'finance', title: 'Financeiro & Caixa', icon: 'account_balance_wallet'})"
          class="text-[10px] text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer">
          Financeiro (janela não integrada) <mat-icon class="text-xs">arrow_forward</mat-icon>
        </button>
      </div>

      <!-- WORKSPACE QUICK SAVE & RESTORE -->
      <div class="bg-[#2a160b]/40 border border-[#4d2813]/60 rounded-2xl p-3 flex flex-col gap-2">
        <div class="text-[9px] uppercase font-mono text-stone-500 font-bold flex items-center justify-between">
          <span class="flex items-center gap-1.5">
            <mat-icon class="text-[11px]">workspaces</mat-icon>
            <span>Ambientes de Trabalho ({{ workspaces().length }})</span>
          </span>
        </div>
        <div class="flex items-center gap-2">
          <input #wsName type="text" placeholder="Ex: Fechamento de Turno..." class="flex-1 bg-[#1a0e06] border border-[#3d200f] rounded-xl px-3 py-1.5 text-xs text-stone-200 outline-none focus:border-amber-600" />
          <button 
            type="button"
            (click)="saveWorkspace.emit(wsName.value || 'Meu Workspace'); wsName.value = ''"
            class="bg-amber-600 hover:bg-amber-500 text-stone-950 font-black px-3 py-1.5 rounded-xl text-[10px] flex items-center gap-1 cursor-pointer active:scale-95 transition-all">
            <mat-icon class="text-xs">save</mat-icon>
            <span>Salvar</span>
          </button>
        </div>

        @if (workspaces().length > 0) {
          <div class="max-h-24 overflow-y-auto space-y-1 pt-1 border-t border-[#3d200f]/60">
            @for (ws of workspaces(); track ws.id) {
              <div
                [class]="currentWorkspaceId() === ws.id ? 'bg-amber-950/60 border-amber-600/70' : 'bg-[#1a0e06]/80 border-[#3d200f]'"
                class="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl border text-[10px]">
                <div class="truncate">
                  <span class="font-bold text-amber-200">{{ ws.name }}</span>
                  <span class="text-stone-400 ml-1">({{ ws.windows.length }} janelas)</span>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    (click)="restoreWorkspace.emit(ws.id)"
                    class="px-2 py-0.5 rounded-lg bg-emerald-950 hover:bg-emerald-800 text-emerald-300 border border-emerald-700/60 font-bold flex items-center gap-0.5 cursor-pointer"
                    title="Restaurar ambiente">
                    <mat-icon class="text-[11px]">restore</mat-icon>
                    <span>Abrir</span>
                  </button>
                  <button
                    type="button"
                    (click)="deleteWorkspace.emit(ws.id)"
                    class="p-0.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/60 flex items-center justify-center cursor-pointer"
                    title="Excluir ambiente">
                    <mat-icon class="text-[11px]">delete</mat-icon>
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- FOOTER POWER ACTIONS -->
      <div class="pt-2 border-t border-[#3d200f] flex items-center justify-between gap-2 text-[10px] text-stone-400">
        <div class="flex items-center gap-1">
          <button
            type="button"
            (click)="lockClicked.emit()"
            class="px-2.5 py-1.5 rounded-xl bg-[#2b160b] hover:bg-[#3d200f] text-amber-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
            title="Bloquear Terminal">
            <mat-icon class="text-xs text-amber-400">lock</mat-icon> Bloquear
          </button>
        </div>

        <div class="flex items-center gap-1">
          <button
            type="button"
            (click)="appSelected.emit({id: 'system', title: 'Este Computador', icon: 'folder'})"
            class="p-1.5 rounded-xl bg-[#2b160b] hover:bg-[#3d200f] text-stone-300 hover:text-white cursor-pointer transition-colors"
            title="Gerenciador de Tarefas">
            <mat-icon class="text-xs">monitor_heart</mat-icon>
          </button>

          <button
            type="button"
            (click)="ecosystem.logout()"
            class="px-2.5 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 font-bold flex items-center gap-1 cursor-pointer transition-colors">
            <mat-icon class="text-xs">power_settings_new</mat-icon> Desligar
          </button>
        </div>
      </div>

    </div>
  `
})
export class StartMenuComponent {
  readonly ecosystem = inject(EcosystemService);
  private readonly router = inject(Router);

  appSelected = output<{id: OSAppId, title: string, icon: string}>();
  lockClicked = output<void>();
  pinToDesktop = output<OSAppId>();
  unpinFromDesktop = output<OSAppId>();
  toggleFavorite = output<OSAppId>();
  saveWorkspace = output<string>();
  restoreWorkspace = output<string>();
  deleteWorkspace = output<string>();

  pinnedAppIds = input<OSAppId[]>([]);
  favoriteAppIds = input<OSAppId[]>([]);
  workspaces = input<OSWorkspace[]>([]);
  currentWorkspaceId = input<string | null>(null);

  readonly searchFilter = signal<string>('');
  readonly selectedCategory = signal<'all' | 'vendas' | 'gestao' | 'sistema'>('all');

  readonly session = computed(() => this.ecosystem.currentSession());
  readonly isHqAdmin = computed(() => this.session()?.role === 'hq_admin');

  currentTenant = computed(() => {
    const id = this.ecosystem.currentTenantId();
    return this.ecosystem.tenants().find(t => t.id === id) || this.ecosystem.tenants()[0];
  });

  todayRevenue = computed(() => {
    const orders: OrderTransaction[] = this.ecosystem.orders();
    const tenantId = this.ecosystem.currentTenantId();
    if (!tenantId) return 0;
    const today = new Date().toDateString();
    return orders
      .filter((order) => {
        const createdAt = new Date(order.createdAt);
        const isToday = !Number.isNaN(createdAt.getTime()) && createdAt.toDateString() === today;
        const isSettled = order.status === 'completed' &&
          (order.paymentStatus === 'approved' || order.isSimulated || order.mode === 'simulation');
        return order.tenantId === tenantId && isToday && isSettled;
      })
      .reduce((sum: number, order: OrderTransaction) => sum + (order.total || 0), 0);
  });

  readonly allApps: AppDefinition[] = [
    { id: 'pos', title: 'eApp PDV Caixa', icon: 'point_of_sale', category: 'vendas', badge: 'HOT', color: 'from-amber-500 via-orange-600 to-amber-700' },
    { id: 'tables', title: 'eApp Mesas & Salão', icon: 'table_restaurant', category: 'vendas', color: 'from-amber-600 to-amber-800' },
    { id: 'kds', title: 'eApp KDS Cozinha', icon: 'soup_kitchen', category: 'vendas', color: 'from-emerald-600 to-emerald-800' },
    { id: 'inventory', title: 'eApp Estoque ERP', icon: 'inventory_2', category: 'gestao', color: 'from-amber-500 to-amber-700' },
    { id: 'finance', title: 'eApp Caixa & DRE', icon: 'account_balance_wallet', category: 'gestao', color: 'from-emerald-500 to-teal-700' },
    { id: 'store-manager', title: 'eApp Minha Loja', icon: 'storefront', category: 'vendas', color: 'from-amber-400 via-orange-500 to-amber-600' },
    { id: 'whatsapp', title: 'eApp WhatsApp', icon: 'chat', category: 'vendas', color: 'from-emerald-600 to-emerald-800' },
    { id: 'delivery-marketplaces', title: 'eApp Pedidos de Marketplaces', icon: 'delivery_dining', category: 'vendas', color: 'from-sky-500 via-cyan-600 to-indigo-700' },
    { id: 'drivers', title: 'eApp Hub Drivers', icon: 'alt_route', category: 'operacao', color: 'from-emerald-500 via-teal-600 to-emerald-800' },
    { id: 'rh', title: 'eApp RH & Pessoal', icon: 'badge', category: 'gestao', color: 'from-amber-600 via-orange-600 to-amber-800' },
    { id: 'history', title: 'eApp Histórico Vendas', icon: 'history', category: 'gestao', color: 'from-indigo-500 to-indigo-700' },
    { id: 'reports', title: 'eApp Relatórios KPIs', icon: 'analytics', category: 'gestao', color: 'from-indigo-600 to-indigo-800' },
    { id: 'crm', title: 'eApp Fidelidade CRM', icon: 'loyalty', category: 'vendas', color: 'from-indigo-400 to-indigo-600' },
    { id: 'services', title: 'eApp Serviços & OS', icon: 'handyman', category: 'gestao', color: 'from-amber-600 to-amber-800' },
    { id: 'tasks', title: 'eApp Tarefas OS', icon: 'task_alt', category: 'sistema', color: 'from-rose-600 to-rose-800' },
    { id: 'calendar', title: 'eApp Calendário OS', icon: 'calendar_month', category: 'sistema', color: 'from-amber-500 to-orange-600' },
    { id: 'agenda', title: 'eApp Reservas & Fila', icon: 'event_seat', category: 'vendas', color: 'from-amber-500 to-orange-600' },
    { id: 'suppliers', title: 'eApp Fornecedores', icon: 'local_shipping', category: 'gestao', color: 'from-amber-600 via-orange-600 to-amber-800' },
    { id: 'reconciliation', title: 'eApp Reconciliação', icon: 'swap_horiz', category: 'gestao', color: 'from-emerald-600 to-teal-800' },
    { id: 'stock-audit', title: 'eApp Inventário Cego', icon: 'fact_check', category: 'gestao', color: 'from-amber-500 to-orange-700' },
    { id: 'calculator', title: 'eApp Calculadora', icon: 'calculate', category: 'sistema', color: 'from-stone-600 to-stone-800' },
    { id: 'notes', title: 'eApp Notas & Memos', icon: 'description', category: 'sistema', color: 'from-amber-400 to-amber-600' },
    { id: 'docs', title: 'eApp Manual 3EAT', icon: 'menu_book', category: 'sistema', color: 'from-amber-500 to-amber-700' },
    { id: 'google-drive', title: 'eApp Google Drive', icon: 'cloud_queue', category: 'sistema', color: 'from-amber-500 via-emerald-600 to-blue-600' },
    { id: 'settings', title: 'eApp Painel Controle', icon: 'settings', category: 'sistema', color: 'from-stone-700 to-stone-900' },
    { id: 'system', title: 'eApp Este Computador', icon: 'folder', category: 'sistema', color: 'from-amber-700 to-amber-900' },
    { id: 'admin-hub', title: 'eApp Diretoria Loja', icon: 'admin_panel_settings', category: 'gestao', color: 'from-rose-600 via-amber-600 to-amber-800' },
    { id: 'waiter-sim', title: 'SIM: App Garçom', icon: 'restaurant_menu', category: 'operacao', badge: 'SIM', color: 'from-amber-500 to-amber-700' },
    { id: 'driver-sim', title: 'SIM: App Motorista', icon: 'local_shipping', category: 'operacao', badge: 'SIM', color: 'from-emerald-600 to-emerald-800' },
    { id: 'consumer-sim', title: 'SIM: Marketplace', icon: 'shopping_bag', category: 'vendas', badge: 'SIM', color: 'from-amber-600 via-rose-700 to-amber-800' }
  ];

  isPinned(id: OSAppId): boolean {
    return this.pinnedAppIds().includes(id);
  }

  isFavorite(id: OSAppId): boolean {
    return this.favoriteAppIds().includes(id);
  }

  onToggleFavorite(event: MouseEvent, id: OSAppId) {
    event.stopPropagation();
    this.toggleFavorite.emit(id);
  }

  togglePin(event: MouseEvent, id: OSAppId) {
    event.stopPropagation();
    if (this.isPinned(id)) {
      this.unpinFromDesktop.emit(id);
    } else {
      this.pinToDesktop.emit(id);
    }
  }

  filteredApps = computed(() => {
    const filter = this.searchFilter().toLowerCase().trim();
    const cat = this.selectedCategory();

    return this.allApps.filter(app => {
      const matchesSearch = !filter || app.title.toLowerCase().includes(filter) || app.id.toLowerCase().includes(filter);
      const matchesCat = cat === 'all' || app.category === cat;
      return matchesSearch && matchesCat;
    });
  });

  onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchFilter.set(input.value);
  }
}
