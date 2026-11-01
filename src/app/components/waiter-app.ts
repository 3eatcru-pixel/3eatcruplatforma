import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { SecurityService } from '../services/security.service';
import { EcosystemService } from '../services/ecosystem.service';
import { ProductItem, TableInfo } from '../models/ecosystem.model';

export type WaiterTab = 'mesas' | 'comanda' | 'pedidos' | 'dados';

interface ComandaItemDraft {
  product: ProductItem;
  quantity: number;
  notes?: string;
  course: 'entrada' | 'principal' | 'sobremesa';
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-waiter-app',
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="min-h-screen bg-[#0e0703] text-stone-100 font-sans selection:bg-amber-600 selection:text-white relative overflow-hidden flex flex-col justify-between">
      
      <!-- SUBTLE RADIAL AMBIENT GLOW -->
      <div class="absolute -top-24 -left-24 w-80 h-80 bg-amber-600/15 blur-[100px] rounded-full pointer-events-none"></div>
      <div class="absolute -bottom-24 -right-24 w-80 h-80 bg-orange-600/10 blur-[100px] rounded-full pointer-events-none"></div>

      <!-- MAIN SMARTPHONE PORTRAIT SHELL -->
      <div class="w-full max-w-md mx-auto min-h-screen flex flex-col relative z-10 shadow-2xl border-x border-[#381c0c]/40 bg-[#0e0703]">
        
        <!-- TOP NATIVE MOBILE STATUS BAR -->
        <div class="px-5 pt-3 pb-1 flex justify-between items-center text-[10px] font-mono font-bold text-stone-400 bg-black/30 backdrop-blur-sm shrink-0">
          <span>{{ currentTime() }}</span>
          <div class="flex items-center gap-1.5 text-stone-300">
            <span class="text-amber-400 font-bold">WI-FI SALÃO</span>
            <mat-icon class="text-[12px] w-3 h-3 text-emerald-400">wifi</mat-icon>
            <div class="flex items-center text-[9px] gap-0.5">
              <mat-icon class="text-[12px] w-3 h-3 text-emerald-400">battery_full</mat-icon>
              <span>94%</span>
            </div>
          </div>
        </div>

        <!-- APP HEADER WITH RESTAURANT & SERVER BADGE -->
        <div class="px-5 py-3 border-b border-[#381c0c] bg-[#1a0c05] shrink-0">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-stone-950 flex items-center justify-center font-bold shadow-md">
                <mat-icon class="text-lg">table_bar</mat-icon>
              </div>
              <div>
                <h1 class="text-sm font-serif font-black tracking-tight text-white flex items-center gap-1.5">
                  <span>3EAT</span>
                  <span class="text-amber-400 italic">Garçom</span>
                  <span class="text-[9px] font-mono bg-amber-950 text-amber-300 px-1.5 py-0.2 rounded border border-amber-700/50">COMANDA</span>
                </h1>
                <p class="text-[10px] text-stone-400 font-mono">
                  {{ ecosystem.currentTenant().name }} • Garçom: <strong class="text-white">{{ serverName() }}</strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              (click)="goToDesktopTables()"
              class="p-2 rounded-xl bg-[#2a1307] border border-[#482814] text-amber-300 hover:text-white transition-all cursor-pointer"
              title="Acessar Terminal Desktop">
              <mat-icon class="text-base">desktop_windows</mat-icon>
            </button>
          </div>
        </div>

        <!-- SCROLLABLE BODY VIEWPORT -->
        <div class="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar pb-24">

          <!-- TAB 1: SELETOR DE MESAS DO SALÃO -->
          @if (activeTab() === 'mesas') {
            <div class="space-y-4 animate-in fade-in duration-300">
              
              <!-- TOP SECTION TITLE & STATS -->
              <div class="flex justify-between items-center bg-[#1d0e06] border border-[#482814] p-3 rounded-2xl">
                <div>
                  <h3 class="font-serif font-black text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
                    <mat-icon class="text-amber-500 text-sm">room_service</mat-icon>
                    <span>Salão de Atendimento</span>
                  </h3>
                  <p class="text-[10px] text-stone-400">Toque na mesa para abrir comanda ou lançar pratos.</p>
                </div>
                <div class="flex items-center gap-1.5 font-mono text-[10px] font-bold">
                  <span class="bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-700/50">
                    {{ freeTablesCount() }} Livres
                  </span>
                  @if (reservedTablesCount() > 0) {
                    <span class="bg-violet-950 text-violet-300 px-2 py-0.5 rounded border border-violet-700/50">
                      {{ reservedTablesCount() }} Reserv.
                    </span>
                  }
                </div>
              </div>

              <!-- TABLE GRID CARDS -->
              <div class="grid grid-cols-2 gap-3">
                @for (table of ecosystem.tables(); track table.id) {
                  <button
                    type="button"
                    (click)="selectTable(table)"
                    [class]="selectedTable()?.id === table.id ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-[#381c0c]'"
                    class="bg-[#190c05] border hover:border-amber-600/70 p-3.5 rounded-2xl text-left transition-all cursor-pointer relative overflow-hidden group shadow-lg flex flex-col justify-between h-32">
                    
                    <div class="flex justify-between items-start">
                      <span class="w-8 h-8 rounded-xl bg-[#2a1408] border border-[#482814] text-amber-300 font-serif font-black text-base flex items-center justify-center">
                        {{ table.number }}
                      </span>

                      <span
                        [class]="tableStatusBadgeClass(table.status)"
                        class="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase">
                        {{ tableStatusLabel(table.status) }}
                      </span>
                    </div>

                    <div class="space-y-0.5">
                      <div class="text-[11px] font-bold text-white truncate">
                        {{ table.status === 'available' ? 'Mesa Disponível' : table.status === 'reserved' ? 'Mesa Reservada' : (table.server || serverName()) }}
                      </div>
                      <div class="text-[10px] font-mono text-stone-400 flex items-center justify-between">
                        <span>{{ table.guests || table.capacity }} Lugares</span>
                        @if (table.currentTotal) {
                          <strong class="text-amber-400">R$ {{ table.currentTotal.toFixed(2) }}</strong>
                        }
                      </div>
                    </div>
                  </button>
                }
              </div>

            </div>
          }

          <!-- TAB 2: LANÇAMENTO DE COMANDA DA MESA ATIVA -->
          @if (activeTab() === 'comanda') {
            <div class="space-y-4 animate-in fade-in duration-300">
              
              <!-- ACTIVE TABLE BANNER -->
              @if (selectedTable(); as table) {
                <div class="bg-gradient-to-r from-[#2a1408] via-[#33180a] to-[#200e05] border-2 border-amber-600/60 rounded-2xl p-4 shadow-xl flex justify-between items-center">
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="w-7 h-7 rounded-lg bg-amber-500 text-stone-950 font-serif font-black text-xs flex items-center justify-center">
                        {{ table.number }}
                      </span>
                      <h3 class="font-serif font-black text-sm text-white">Comanda Mesa {{ table.number }}</h3>
                    </div>
                    <p class="text-[10px] text-stone-300 font-mono mt-0.5">
                      {{ table.zone || 'Salão Principal' }} • Garçom: {{ serverName() }}
                    </p>
                  </div>

                  <div class="text-right">
                    <span class="text-[9px] font-mono uppercase text-stone-400 block">Total Itens</span>
                    <strong class="text-amber-400 font-mono text-base font-black">
                      R$ {{ activeComandaTotal().toFixed(2) }}
                    </strong>
                  </div>
                </div>
              } @else {
                <div class="p-6 bg-[#180b04] border border-[#381c0c] rounded-2xl text-center space-y-2">
                  <mat-icon class="text-4xl text-amber-500/40">table_restaurant</mat-icon>
                  <p class="text-xs font-bold text-white">Nenhuma mesa selecionada</p>
                  <p class="text-[10px] text-stone-400">Escolha uma mesa no salão para começar a lançar os pedidos.</p>
                  <button (click)="activeTab.set('mesas')" class="px-4 py-2 bg-amber-600 text-stone-950 font-bold rounded-xl text-xs uppercase cursor-pointer">
                    Selecionar Mesa
                  </button>
                </div>
              }

              <!-- PRODUCT CATEGORY HORIZONTAL PILLS -->
              @if (selectedTable()) {
                <div class="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  @for (cat of productCategories; track cat.id) {
                    <button
                      type="button"
                      (click)="selectedCategory.set(cat.id)"
                      [class]="selectedCategory() === cat.id ? 'bg-amber-600 text-stone-950 font-black shadow' : 'bg-[#1e0f07] text-stone-300 border border-[#482814]'"
                      class="px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shrink-0 transition-all cursor-pointer font-bold">
                      <mat-icon class="text-xs">{{ cat.icon }}</mat-icon>
                      <span>{{ cat.label }}</span>
                    </button>
                  }
                </div>

                <!-- CADENCE / TEMPO SELECTOR -->
                <div class="bg-[#1a0c05] p-2.5 rounded-2xl border border-[#381c0c] space-y-1.5">
                  <span class="text-[9px] font-mono uppercase text-amber-400 font-bold block">Cadência de Saída da Cozinha:</span>
                  <div class="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      (click)="selectedCourse.set('entrada')"
                      [class]="selectedCourse() === 'entrada' ? 'bg-amber-600 text-stone-950 font-black' : 'bg-[#261207] text-stone-400'"
                      class="py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all">
                      1º Entrada
                    </button>
                    <button
                      type="button"
                      (click)="selectedCourse.set('principal')"
                      [class]="selectedCourse() === 'principal' ? 'bg-amber-600 text-stone-950 font-black' : 'bg-[#261207] text-stone-400'"
                      class="py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all">
                      2º Principal
                    </button>
                    <button
                      type="button"
                      (click)="selectedCourse.set('sobremesa')"
                      [class]="selectedCourse() === 'sobremesa' ? 'bg-amber-600 text-stone-950 font-black' : 'bg-[#261207] text-stone-400'"
                      class="py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all">
                      3º Sobremesa
                    </button>
                  </div>
                </div>

                <!-- QUICK TAP ITEMS LIST -->
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <h4 class="text-[10px] font-mono font-bold uppercase text-stone-400">Cardápio do Estabelecimento:</h4>
                    <span class="text-[9px] font-mono text-amber-500 font-bold">{{ filteredProducts().length }} itens</span>
                  </div>

                  <!-- BUSCA RÁPIDA DE PRATOS -->
                  <div class="relative">
                    <mat-icon class="absolute left-3 top-2.5 text-stone-500 text-xs">search</mat-icon>
                    <input
                      type="text"
                      [value]="productSearchQuery()"
                      (input)="productSearchQuery.set($any($event.target).value)"
                      placeholder="Buscar prato, bebida ou acompanhamento..."
                      class="w-full bg-[#180b04] border border-[#381c0c] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-amber-600 font-medium">
                  </div>
                  @for (prod of filteredProducts(); track prod.id) {
                    <div class="bg-[#190c05] border border-[#381c0c] hover:border-amber-600/50 p-3 rounded-2xl flex items-center justify-between gap-3 shadow transition-all">
                      <div class="min-w-0 flex-1">
                        <div class="font-bold text-xs text-white truncate">{{ prod.name }}</div>
                        <div class="text-[10px] text-amber-400 font-mono font-bold">R$ {{ prod.price.toFixed(2) }}</div>
                      </div>

                      <div class="flex items-center gap-1.5 shrink-0">
                        @if (getItemCountInDraft(prod.id); as count) {
                          <button
                            type="button"
                            (click)="decrementItem(prod)"
                            class="w-7 h-7 rounded-lg bg-[#2a1408] border border-stone-700 text-white font-bold flex items-center justify-center cursor-pointer">
                            -
                          </button>
                          <span class="font-mono font-black text-amber-400 text-xs px-1.5">{{ count }}</span>
                        }

                        <button
                          type="button"
                          (click)="addItemToDraft(prod)"
                          class="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-black text-xs uppercase flex items-center gap-1 shadow cursor-pointer transition-all active:scale-95">
                          <mat-icon class="text-xs">add</mat-icon>
                          <span>Adicionar</span>
                        </button>
                      </div>
                    </div>
                  }
                </div>

                <!-- DRAFT ITEMS TRAY & DISPATCH ACTION -->
                @if (draftItems().length > 0) {
                  <div class="bg-[#241107] border-2 border-emerald-600/60 rounded-3xl p-4 space-y-3 shadow-2xl animate-in slide-in-from-bottom duration-300">
                    <div class="flex justify-between items-center border-b border-[#3d1d0c] pb-2">
                      <span class="text-xs font-serif font-black text-emerald-400 uppercase flex items-center gap-1">
                        <mat-icon class="text-sm">shopping_bag</mat-icon> Pratos a Disparar ({{ draftItems().length }})
                      </span>
                      <button (click)="draftItems.set([])" class="text-[10px] text-stone-400 hover:text-white">Limpar</button>
                    </div>

                    <div class="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                      @for (item of draftItems(); track item.product.id) {
                        <div class="flex justify-between items-center text-xs font-mono">
                          <div class="text-stone-200">
                            <strong>{{ item.quantity }}x</strong> {{ item.product.name }}
                            <span class="text-[9px] text-amber-400">({{ item.course }})</span>
                          </div>
                          <span class="text-stone-300 font-bold">R$ {{ (item.product.price * item.quantity).toFixed(2) }}</span>
                        </div>
                      }
                    </div>

                    <button
                      type="button"
                      (click)="registerTableOrder()"
                      [disabled]="isSubmittingComanda()"
                      class="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-stone-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                      <mat-icon class="text-base">receipt_long</mat-icon>
                      <span>{{ isSubmittingComanda() ? 'Registrando pedido…' : 'Registrar pedido da mesa' }}</span>
                    </button>
                  </div>
                }

                <!-- ACTIONS FOR ACTIVE TABLE (CLOSE BILL) -->
                <div class="pt-2 flex gap-2">
                  <button
                    type="button"
                    (click)="requestBillForTable()"
                    [disabled]="isUpdatingTableStatus()"
                    class="flex-1 py-3 bg-[#261207] hover:bg-[#331809] border border-amber-600/40 text-amber-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                    <mat-icon class="text-sm">receipt_long</mat-icon>
                    <span>{{ isUpdatingTableStatus() ? 'Atualizando mesa…' : 'Marcar conta solicitada' }}</span>
                  </button>
                </div>
              }

            </div>
          }

          <!-- TAB 3: STATUS DOS PEDIDOS DE SALÃO -->
          @if (activeTab() === 'pedidos') {
            <div class="space-y-4 animate-in fade-in duration-300">
              <div class="bg-[#1d0e06] border border-[#482814] p-3 rounded-2xl flex justify-between items-center">
                <div>
                  <h3 class="font-serif font-black text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
                    <mat-icon class="text-amber-500 text-sm">soup_kitchen</mat-icon>
                    <span>Pedidos de salão</span>
                  </h3>
                  <p class="text-[10px] text-stone-400">Status registrado dos pedidos. A confirmação de uma estação KDS não está integrada nesta tela.</p>
                </div>
                <mat-icon class="text-amber-400">info</mat-icon>
              </div>

              <div class="space-y-3">
                @for (order of activeSalonOrders(); track order.id) {
                  <div class="bg-[#180b04] border border-[#381c0c] rounded-2xl p-4 space-y-2 shadow">
                    <div class="flex justify-between items-start">
                      <div class="flex items-center gap-2">
                        <span class="text-xs font-mono font-black text-amber-400">{{ order.orderNumber }}</span>
                        <span class="text-xs font-bold text-white">{{ order.tableNumber || 'Balcão' }}</span>
                      </div>
                      <span
                        [class]="order.status === 'ready' ? 'bg-emerald-950 text-emerald-300 border-emerald-700/50' : 'bg-amber-950 text-amber-300 border-amber-700/50'"
                        class="border text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase">
                        {{ order.status === 'pending' ? 'Na Fila' : order.status === 'preparing' ? 'Em Preparo' : 'Pronto p/ Servir' }}
                      </span>
                    </div>

                    <div class="text-[11px] text-stone-300 font-mono space-y-0.5 border-t border-[#2e1509] pt-1.5">
                      @for (item of order.items; track item.product.id) {
                        <div>
                          • {{ item.quantity }}x {{ item.product.name }}
                          @if (item.notes) {
                            <span class="text-[10px] text-amber-400">{{ item.notes }}</span>
                          }
                        </div>
                      }
                    </div>

                    <div class="flex justify-between items-center text-[10px] text-stone-500 pt-1">
                      <span>Pedido {{ order.isSimulated ? 'simulado' : 'registrado' }}</span>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- TAB 4: PAREAMENTO & CONFIGURAÇÕES -->
          @if (activeTab() === 'dados') {
            <div class="space-y-4 animate-in fade-in duration-300">
              <div class="bg-[#1d0e06] border border-[#482814] p-4 rounded-2xl space-y-3">
                <h3 class="font-serif font-black text-sm text-white uppercase tracking-wider flex items-center gap-2">
                  <mat-icon class="text-amber-500">store</mat-icon>
                  <span>Dados da loja</span>
                </h3>
                <p class="text-xs text-stone-400 leading-relaxed">
                  Atualize produtos, pedidos e mesas conforme o modo de execução. Pareamento por QR, IP fixo e conexão direta com o terminal/KDS não estão disponíveis.
                </p>

                <div class="p-3 bg-[#130702] border border-[#331809] rounded-xl space-y-2 font-mono text-[11px]">
                  <div class="flex justify-between">
                    <span class="text-stone-500">Unidade:</span>
                    <span class="text-stone-200 font-bold">{{ ecosystem.currentTenant().name }}</span>
                  </div>
                </div>

                <button
                  type="button"
                  (click)="refreshStoreData()"
                  class="w-full py-3 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black text-xs uppercase rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow">
                  <mat-icon class="text-sm">sync</mat-icon>
                  <span>Atualizar dados da loja</span>
                </button>
              </div>
            </div>
          }

        </div>

        <!-- FIXED BOTTOM TOUCH TAB BAR (SMARTPHONE NATIVE NAVIGATION) -->
        <div class="absolute bottom-0 left-0 w-full bg-[#120703]/95 backdrop-blur-md border-t border-[#381c0c] px-4 py-2.5 flex justify-between items-center z-50">
          <button
            type="button"
            (click)="activeTab.set('mesas')"
            [class.text-amber-400]="activeTab() === 'mesas'"
            class="flex flex-col items-center gap-1 text-stone-500 hover:text-white transition-all cursor-pointer">
            <mat-icon class="text-xl">table_restaurant</mat-icon>
            <span class="text-[9px] font-mono font-bold uppercase">Mesas</span>
          </button>

          <button
            type="button"
            (click)="activeTab.set('comanda')"
            [class.text-amber-400]="activeTab() === 'comanda'"
            class="flex flex-col items-center gap-1 text-stone-500 hover:text-white transition-all cursor-pointer relative">
            <mat-icon class="text-xl">post_add</mat-icon>
            <span class="text-[9px] font-mono font-bold uppercase">Comanda</span>
            @if (draftItems().length > 0) {
              <span class="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-stone-950 text-[9px] font-black rounded-full flex items-center justify-center shadow">
                {{ draftItems().length }}
              </span>
            }
          </button>

          <button
            type="button"
            (click)="activeTab.set('pedidos')"
            [class.text-amber-400]="activeTab() === 'pedidos'"
            class="flex flex-col items-center gap-1 text-stone-500 hover:text-white transition-all cursor-pointer">
            <mat-icon class="text-xl">receipt_long</mat-icon>
            <span class="text-[9px] font-mono font-bold uppercase">Pedidos</span>
          </button>

          <button
            type="button"
            (click)="activeTab.set('dados')"
            [class.text-amber-400]="activeTab() === 'dados'"
            class="flex flex-col items-center gap-1 text-stone-500 hover:text-white transition-all cursor-pointer">
            <mat-icon class="text-xl">store</mat-icon>
            <span class="text-[9px] font-mono font-bold uppercase">Dados</span>
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 3px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(217, 119, 6, 0.4); border-radius: 4px; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
  `]
})
export class WaiterAppComponent implements OnInit {
  private readonly security = inject(SecurityService);
  readonly ecosystem = inject(EcosystemService);
  private readonly router = inject(Router);

  ngOnInit() {
    this.security.setPillar('os');
    void this.refreshStoreData();
  }

  readonly currentTime = computed(() => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  readonly activeTab = signal<WaiterTab>('mesas');
  readonly serverName = computed(() => this.ecosystem.currentSession()?.name || 'Lucas R.');
  readonly selectedTable = signal<TableInfo | null>(null);
  readonly selectedCategory = signal<string>('all');
  readonly selectedCourse = signal<'entrada' | 'principal' | 'sobremesa'>('principal');
  readonly draftItems = signal<ComandaItemDraft[]>([]);
  readonly isSubmittingComanda = signal(false);
  readonly isUpdatingTableStatus = signal(false);

  readonly productCategories = [
    { id: 'all', label: 'Todos', icon: 'apps' },
    { id: 'bebidas', label: 'Bebidas', icon: 'local_drink' },
    { id: 'burgers', label: 'Pratos & Burgers', icon: 'lunch_dining' },
    { id: 'entradas', label: 'Entradas & Porções', icon: 'tapas' },
    { id: 'sobremesas', label: 'Sobremesas', icon: 'cake' }
  ];

  readonly freeTablesCount = computed(() =>
    this.ecosystem.tables().filter(t => t.status === 'available').length
  );

  readonly reservedTablesCount = computed(() =>
    this.ecosystem.tables().filter(t => t.status === 'reserved').length
  );

  readonly productSearchQuery = signal<string>('');

  readonly filteredProducts = computed(() => {
    const cat = this.selectedCategory();
    const query = this.productSearchQuery().toLowerCase().trim();
    const tenantId = this.ecosystem.currentTenantId();
    let products = tenantId
      ? this.ecosystem.products().filter(p => p.tenantId === tenantId)
      : this.ecosystem.products();
    if (products.length === 0) products = this.ecosystem.products();

    if (cat !== 'all') {
      if (cat === 'bebidas') products = products.filter(p => p.category === 'Bebidas' || p.category.toLowerCase().includes('drink') || p.category.toLowerCase().includes('suco') || p.category.toLowerCase().includes('chopp'));
      else if (cat === 'burgers') products = products.filter(p => p.category === 'Hambúrgueres' || p.category.toLowerCase().includes('burger') || p.category.toLowerCase().includes('prato') || p.category.toLowerCase().includes('refeição'));
      else if (cat === 'entradas') products = products.filter(p => p.category === 'Acompanhamentos' || p.category.toLowerCase().includes('porção') || p.category.toLowerCase().includes('entrada') || p.category.toLowerCase().includes('petisco'));
      else if (cat === 'sobremesas') products = products.filter(p => p.category === 'Sobremesas' || p.category.toLowerCase().includes('doce') || p.category.toLowerCase().includes('torta'));
      else products = products.filter(p => p.category.toLowerCase().includes(cat));
    }

    if (query) {
      products = products.filter(p => p.name.toLowerCase().includes(query) || (p.description && p.description.toLowerCase().includes(query)));
    }

    return products;
  });

  readonly activeComandaTotal = computed(() => {
    return this.draftItems().reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  });

  readonly activeSalonOrders = computed(() => {
    const tenantId = this.ecosystem.currentTenantId();
    return this.ecosystem.orders().filter(o => {
      if (tenantId && o.tenantId !== tenantId) return false;
      const isSalonOrder = o.type === 'dine-in' || o.channel === 'POS' || o.channel === 'Table QR';
      const isActiveStatus = o.status === 'pending' || o.status === 'preparing' || o.status === 'ready';
      return isSalonOrder && isActiveStatus;
    });
  });

  tableStatusLabel(status: TableInfo['status']): string {
    switch (status) {
      case 'available':
        return 'Livre';
      case 'occupied':
        return 'Ocupada';
      case 'billing':
        return 'Conta';
      case 'reserved':
        return 'Reservada';
      default:
        return 'Livre';
    }
  }

  tableStatusBadgeClass(status: TableInfo['status']): string {
    switch (status) {
      case 'available':
        return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      case 'occupied':
        return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
      case 'billing':
        return 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
      case 'reserved':
        return 'bg-violet-500/20 text-violet-300 border border-violet-500/30';
      default:
        return 'bg-zinc-800 text-zinc-300';
    }
  }

  private formatCourseLabel(course: ComandaItemDraft['course']): string {
    switch (course) {
      case 'entrada':
        return 'Tempo: 1º Entrada';
      case 'sobremesa':
        return 'Tempo: 3º Sobremesa';
      default:
        return 'Tempo: 2º Principal';
    }
  }

  selectTable(table: TableInfo) {
    this.selectedTable.set(table);
    this.activeTab.set('comanda');
    this.ecosystem.notify(`Mesa ${table.number} selecionada para lançamento da comanda.`, 'info');
  }

  getItemCountInDraft(productId: string): number {
    const item = this.draftItems().find(i => i.product.id === productId);
    return item ? item.quantity : 0;
  }

  addItemToDraft(product: ProductItem) {
    const course = this.selectedCourse();
    this.draftItems.update(items => {
      const existing = items.find(i => i.product.id === product.id && i.course === course);
      if (existing) {
        return items.map(i =>
          i.product.id === product.id && i.course === course
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...items, { product, quantity: 1, course }];
    });
  }

  decrementItem(product: ProductItem) {
    const course = this.selectedCourse();
    this.draftItems.update(items => {
      const existing =
        items.find(i => i.product.id === product.id && i.course === course) ||
        items.find(i => i.product.id === product.id);
      if (!existing) return items;
      if (existing.quantity <= 1) {
        return items.filter(i => i !== existing);
      }
      return items.map(i => (i === existing ? { ...i, quantity: i.quantity - 1 } : i));
    });
  }

  async registerTableOrder() {
    const table = this.selectedTable();
    const items = this.draftItems();
    if (!table || items.length === 0 || this.isSubmittingComanda()) return;

    this.isSubmittingComanda.set(true);

    const orderItems = items.map(i => ({
      product: i.product,
      quantity: i.quantity,
      notes: this.formatCourseLabel(i.course)
    }));
    const total = this.activeComandaTotal();
    const serviceCharge = Number((total * 0.1).toFixed(2));
    const finalBillAmount = Number((total + serviceCharge).toFixed(2));

    try {
      const createdOrder = await this.ecosystem.addOrder({
        tenantId: this.ecosystem.currentTenantId(),
        orderNumber: '#M' + table.number,
        type: 'dine-in',
        tableNumber: 'Mesa ' + table.number,
        items: orderItems,
        subtotal: total,
        tax: serviceCharge,
        discount: 0,
        total: finalBillAmount,
        paymentMethod: 'card',
        status: 'pending',
        channel: 'Waiter Comanda',
        deviceType: 'mobile',
        deviceName: 'Smartphone Garçom',
        operatorName: this.serverName()
      });
      this.draftItems.set([]);

      const updatedTable: Partial<TableInfo> = {
        status: 'occupied',
        server: this.serverName(),
        currentTotal: Number(((table.currentTotal || 0) + finalBillAmount).toFixed(2)),
        guests: table.guests || 2
      };
      try {
        await this.ecosystem.updateTable(table.id, updatedTable);
        this.selectedTable.set({ ...table, ...updatedTable });
      } catch {
        this.ecosystem.notify(
          'Pedido registrado, mas o estado da mesa não foi atualizado. Atualize os dados antes de lançar outro pedido nesta mesa.',
          'warning'
        );
        this.activeTab.set('pedidos');
        return;
      }

      const queuedOffline = createdOrder.id.startsWith('off-ord-');
      const message = queuedOffline
        ? `Comanda da Mesa ${table.number} salva na fila local offline.`
        : createdOrder.isSimulated
          ? `Comanda da Mesa ${table.number} criada somente na simulação.`
          : `Comanda da Mesa ${table.number} registrada. O acompanhamento desta tela mostra o status do pedido.`;
      this.ecosystem.notify(message, queuedOffline ? 'info' : 'success');
      this.activeTab.set('pedidos');
    } catch {
      this.ecosystem.notify('Não foi possível registrar o pedido. O rascunho foi mantido para tentar novamente.', 'error');
    } finally {
      this.isSubmittingComanda.set(false);
    }
  }

  async requestBillForTable() {
    const table = this.selectedTable();
    if (!table || this.isUpdatingTableStatus()) return;

    const total = table.currentTotal || 0;
    const guests = Math.max(1, table.guests || 2);
    const perPerson = total / guests;

    this.isUpdatingTableStatus.set(true);
    try {
      await this.ecosystem.updateTable(table.id, { status: 'billing' });
      this.selectedTable.set({ ...table, status: 'billing' });
      this.ecosystem.notify(
        `Status da Mesa ${table.number} atualizado para conta: R$ ${total.toFixed(2)} (${guests}x R$ ${perPerson.toFixed(2)}/pessoa).`,
        'info'
      );
      this.activeTab.set('mesas');
    } catch {
      this.ecosystem.notify('Não foi possível atualizar o status da mesa.', 'error');
    } finally {
      this.isUpdatingTableStatus.set(false);
    }
  }

  async refreshStoreData() {
    const role = this.ecosystem.currentSession()?.role;
    const tenantId = this.ecosystem.currentTenantId() || this.ecosystem.currentSession()?.tenantId;
    if (!tenantId || !['waiter', 'operator', 'tenant_owner', 'hq_admin'].includes(role || '')) {
      this.ecosystem.notify('Sincronização indisponível: sessão sem acesso operacional.', 'warning');
      return;
    }

    const results = await Promise.allSettled([
      this.ecosystem.inventoryService.fetchProducts(tenantId),
      this.ecosystem.ordersService.fetchOrders(tenantId),
      this.ecosystem.tablesService.fetchTables(tenantId)
    ]);
    const hasFailures = results.some((result) => result.status === 'rejected');
    this.ecosystem.notify(
      hasFailures
      ? 'Atualização parcial: alguns dados não foram atualizados.'
        : this.ecosystem.isSimulationMode()
          ? 'Dados de demonstração atualizados nesta sessão.'
          : 'Dados da loja atualizados pela API.',
      hasFailures ? 'warning' : 'success'
    );
  }

  goToDesktopTables() {
    this.ecosystem.currentView.set('os');
    this.router.navigate(['/os']);
  }
}

