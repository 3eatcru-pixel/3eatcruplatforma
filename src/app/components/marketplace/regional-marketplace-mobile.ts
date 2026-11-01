import { ChangeDetectionStrategy, Component, inject, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { EcosystemService } from '../../services/ecosystem.service';
import { CompanyTenant } from '../../models/ecosystem.model';
import { ConsumerProfileComponent } from '../consumer-profile';

type CategoryFilter = 'todos' | 'restaurant' | 'retail' | 'services' | 'outros';
type SortBy = 'rating' | 'distance' | 'name' | 'fee';

@Component({
  selector: 'app-regional-marketplace-mobile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, ConsumerProfileComponent],
  template: `
    <div class="min-h-screen bg-[#0d0704] text-stone-200 font-sans selection:bg-amber-600 selection:text-white pb-12">
      
      <!-- TOP NAVIGATION BAR -->
      <header class="sticky top-0 z-50 bg-[#0d0704]/95 backdrop-blur-md border-b border-[#2b170c] px-4 py-3 flex items-center justify-between gap-2 shadow-lg">
        <!-- Logo -->
        <div class="flex items-center gap-2 shrink-0">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-stone-950 font-black shadow-md">
            <mat-icon class="text-xl">settings</mat-icon>
          </div>
          <div>
            <div class="font-serif font-black text-amber-400 text-xs tracking-wider leading-tight">3EATCRU OS</div>
            <div class="text-[8px] font-mono text-stone-400 font-bold uppercase tracking-widest leading-none">SÃO PAULO • SP</div>
          </div>
        </div>

        <!-- Region Selector Pill -->
        <div class="relative">
          <button
            type="button"
            (click)="toggleRegionDropdown()"
            class="bg-black/90 text-amber-300 border border-amber-600/60 rounded-full px-3 py-1 text-[10px] font-bold flex items-center gap-1 shadow cursor-pointer">
            <mat-icon class="text-[12px] text-amber-400">place</mat-icon>
            <span>{{ selectedRegionName() }}</span>
            <mat-icon class="text-[14px]">arrow_drop_down</mat-icon>
          </button>

          @if (showRegionDropdown()) {
            <div class="absolute top-8 left-1/2 -translate-x-1/2 bg-[#1b0d06] border border-[#482814] rounded-2xl p-2 w-48 shadow-2xl z-50 text-xs space-y-1 animate-in fade-in zoom-in-95 font-sans">
              @for (reg of availableRegions; track reg) {
                <button
                  type="button"
                  (click)="selectRegion(reg)"
                  class="w-full text-left px-3 py-1.5 rounded-xl hover:bg-amber-900/40 text-stone-200 hover:text-amber-300 transition-colors cursor-pointer text-[11px] font-bold">
                  {{ reg }}
                </button>
              }
            </div>
          }
        </div>

        <!-- Admin & Menu Controls -->
        <div class="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            (click)="router.navigate(['/para-lojistas'])"
            class="bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 rounded-full px-2.5 py-1 text-[9px] font-mono font-black uppercase flex items-center gap-1 shadow-md cursor-pointer transition-all active:scale-95"
            title="Você tem um negócio? Conheça o 3eatcru OS">
            <mat-icon class="text-[11px]">storefront</mat-icon>
            <span>Para Lojistas</span>
          </button>

          @if (ecosystem.activeConsumer(); as cons) {
            <button
              type="button"
              (click)="showConsumerModal.set(true)"
              class="bg-amber-950/80 text-amber-300 border border-amber-600/60 rounded-full px-2.5 py-1 text-[9px] font-mono font-bold uppercase flex items-center gap-1 shadow cursor-pointer max-w-[110px] truncate"
              title="Meu Perfil de Consumidor">
              <mat-icon class="text-[12px] text-amber-400 shrink-0">account_circle</mat-icon>
              <span class="truncate">{{ cons.name }}</span>
            </button>
          } @else {
            <button
              type="button"
              (click)="showConsumerModal.set(true)"
              class="bg-black/80 text-amber-400 border border-amber-600/40 rounded-full px-2.5 py-1 text-[9px] font-mono font-bold uppercase flex items-center gap-1 shadow cursor-pointer">
              <mat-icon class="text-[11px]">person</mat-icon>
              <span>Entrar</span>
            </button>
          }

          <button
            type="button"
            (click)="toggleMenu.emit()"
            class="text-stone-300 hover:text-white p-1 cursor-pointer">
            <mat-icon class="text-xl">menu</mat-icon>
          </button>
        </div>
      </header>

      <div class="px-3.5 pt-3 space-y-3.5 max-w-lg mx-auto">
        
        <!-- HERO BANNER SECTION -->
        <div class="relative rounded-3xl overflow-hidden border border-[#3d200f] bg-stone-950 p-5 shadow-2xl min-h-[220px] flex flex-col justify-between">
          <!-- Background image with gradient overlay -->
          <img
            [src]="ecosystem.regionalConfig().heroBannerImage"
            alt="Hero Background"
            class="absolute inset-0 w-full h-full object-cover opacity-40"
            referrerpolicy="no-referrer">
          <div class="absolute inset-0 bg-gradient-to-t from-[#0d0704] via-[#0d0704]/70 to-[#0d0704]/40 pointer-events-none"></div>

          <div class="relative z-10 space-y-2">
            <h1 class="font-serif font-black text-xl text-white leading-tight drop-shadow-md">
              Encontre Estabelecimentos pelo Ecossistema 3eatcru
            </h1>
            <p class="text-[11px] text-stone-300 font-serif leading-relaxed line-clamp-3">
              Explore fichas diferenciadas em modo Partidário, consultando o Livro-Razão Contábil ou localizar pela Marca Cartográfica com cálculo preditivo de distância real.
            </p>
          </div>

          <div class="relative z-10 pt-3">
            <button
              type="button"
              (click)="scrollToStores()"
              class="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black px-4 py-2.5 rounded-full text-xs shadow-lg border border-amber-400/50 flex items-center gap-2 cursor-pointer active:scale-95 transition-all">
              <mat-icon class="text-base">explore</mat-icon>
              <span>Explorar Estabelecimentos</span>
              <mat-icon class="text-sm">arrow_forward</mat-icon>
            </button>
          </div>
        </div>

        <!-- ANNOUNCEMENT BANNER -->
        <div class="bg-[#241208] border border-[#522911] rounded-2xl p-3 shadow-lg flex items-center justify-between gap-3 text-xs">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-7 h-7 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center shrink-0">
              <mat-icon class="text-base">campaign</mat-icon>
            </div>
            <p class="text-[10px] text-amber-200 font-bold leading-tight line-clamp-2">
              {{ ecosystem.regionalConfig().heroAnnouncement || 'Festival Gastronômico de Paulista: besteiras gourmet em até 60 minutos em todo o perímetro central!' }}
            </p>
          </div>
          <span class="bg-black/60 border border-amber-600/40 text-amber-400 font-mono text-[8px] font-black uppercase px-2 py-1 rounded-md shrink-0 flex items-center gap-1">
            <mat-icon class="text-[10px]">emoji_events</mat-icon> NO CENTRAL
          </span>
        </div>

        <!-- CARD 1: BÚSSOLA & LOCALIZAÇÃO (COLLAPSIBLE ACCORDION) -->
        <div class="bg-white rounded-3xl p-4 sm:p-5 shadow-xl text-stone-950 border border-stone-200 space-y-3.5">
          <button
            type="button"
            (click)="toggleBussola()"
            class="w-full flex items-center justify-between cursor-pointer select-none border-b border-stone-100 pb-2 text-left bg-transparent border-t-0 border-l-0 border-r-0">
            <div class="flex items-center gap-2">
              <mat-icon class="text-stone-900 text-lg">place</mat-icon>
              <h2 class="font-serif font-black text-sm text-stone-900">Bússola &amp; Localização</h2>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-stone-700">
                <mat-icon class="text-xs">explore</mat-icon>
              </div>
              <mat-icon class="text-stone-700 text-base transition-transform" [class.rotate-180]="!bussolaOpen()">
                keyboard_arrow_up
              </mat-icon>
            </div>
          </button>

          @if (bussolaOpen()) {
            <div class="space-y-3 text-xs animate-in fade-in duration-200">
              <p class="text-[11px] text-stone-600 leading-snug">
                Defina o ponto de referência para realizar a distância em quilometragem real de cada estabelecimento.
              </p>

              <!-- Reference Point Box with GPS Trigger -->
              <div class="space-y-1">
                <span class="text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider block">Ponto de Referência</span>
                <div class="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div class="sm:col-span-8 bg-[#fbf6ee] border border-[#e5d7c3] rounded-2xl p-2.5 flex items-start gap-2">
                    <mat-icon class="text-stone-800 text-sm mt-0.5 shrink-0">place</mat-icon>
                    <span class="text-[10px] text-stone-800 font-bold leading-tight line-clamp-2">
                      {{ referenceAddress() }}
                    </span>
                  </div>

                  <button
                    type="button"
                    (click)="triggerGpsCalibration()"
                    class="sm:col-span-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black px-3 py-2 rounded-2xl text-[10px] uppercase flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer">
                    <mat-icon class="text-sm">my_location</mat-icon>
                    <span>Usar Sinal de GPS Real</span>
                  </button>
                </div>
              </div>

              <!-- Address Search Row -->
              <div class="space-y-1">
                <span class="text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider block">Buscar Endereço no Mapa</span>
                <div class="flex gap-2">
                  <div class="flex-1 bg-white border border-stone-300 rounded-2xl px-3 py-2 flex items-center gap-2 shadow-inner">
                    <mat-icon class="text-stone-400 text-base">search</mat-icon>
                    <input
                      type="text"
                      [value]="searchAddressQuery()"
                      (input)="searchAddressQuery.set($any($event.target).value)"
                      (keydown.enter)="applyAddressSearch()"
                      placeholder="Rua, Bairro, Cidade..."
                      class="w-full text-xs text-stone-900 placeholder-stone-400 focus:outline-none bg-transparent">
                  </div>

                  <button
                    type="button"
                    (click)="applyAddressSearch()"
                    class="bg-[#f0e5d4] hover:bg-[#ebdcc7] text-stone-900 border border-[#d6c3aa] font-bold px-4 py-2 rounded-2xl text-xs flex items-center gap-1 cursor-pointer active:scale-95 transition-all">
                    <mat-icon class="text-sm">search</mat-icon>
                    <span>Buscar</span>
                  </button>
                </div>
                <div class="text-[9px] text-rose-600 font-mono font-bold pt-0.5">*GPS real máximo para busca.</div>
              </div>

              <!-- Max Distance Slider -->
              <div class="space-y-1 pt-1 border-t border-stone-100">
                <div class="flex justify-between items-center text-xs font-bold">
                  <span class="text-blue-600 text-[11px]">Raio Máximo:</span>
                  <span class="text-orange-600 font-mono text-sm">{{ maxRadius() }} km</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="1"
                  [value]="maxRadius()"
                  (input)="maxRadius.set(+$any($event.target).value)"
                  class="w-full accent-orange-500 h-2 bg-stone-200 rounded-lg cursor-pointer">
                <div class="flex justify-between text-[9px] font-mono text-stone-500 font-bold">
                  <span>1 km</span>
                  <span>30 km</span>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- CARD 2: MODALIDADES DO BALCÃO (COLLAPSIBLE ACCORDION) -->
        <div class="bg-white rounded-3xl p-4 sm:p-5 shadow-xl text-stone-950 border border-stone-200 space-y-3">
          <button
            type="button"
            (click)="toggleModalidades()"
            class="w-full flex items-center justify-between cursor-pointer select-none border-b border-stone-100 pb-2 text-left bg-transparent border-t-0 border-l-0 border-r-0">
            <div class="flex items-center gap-2">
              <mat-icon class="text-stone-900 text-lg">tune</mat-icon>
              <h2 class="font-serif font-black text-sm text-stone-900">Modalidades do Balcão</h2>
            </div>
            <mat-icon class="text-stone-700 text-base transition-transform" [class.rotate-180]="!modalidadesOpen()">
              keyboard_arrow_up
            </mat-icon>
          </button>

          @if (modalidadesOpen()) {
            <div class="space-y-2.5 text-xs animate-in fade-in duration-200">
              <label class="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  [checked]="filterDelivery()"
                  (change)="filterDelivery.set($any($event.target).checked)"
                  class="w-4 h-4 rounded text-orange-600 accent-orange-500 cursor-pointer">
                <mat-icon class="text-stone-700 text-base">two_wheeler</mat-icon>
                <span class="font-medium text-stone-800 text-[11px] group-hover:text-stone-950">Suporte Entrega (Delivery)</span>
              </label>

              <label class="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  [checked]="filterTakeout()"
                  (change)="filterTakeout.set($any($event.target).checked)"
                  class="w-4 h-4 rounded text-orange-600 accent-orange-500 cursor-pointer">
                <mat-icon class="text-stone-700 text-base">storefront</mat-icon>
                <span class="font-medium text-stone-800 text-[11px] group-hover:text-stone-950">Suporte Retirada no Balcão</span>
              </label>

              <label class="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  [checked]="filterReservation()"
                  (change)="filterReservation.set($any($event.target).checked)"
                  class="w-4 h-4 rounded text-orange-600 accent-orange-500 cursor-pointer">
                <mat-icon class="text-stone-700 text-base">event_seat</mat-icon>
                <span class="font-medium text-stone-800 text-[11px] group-hover:text-stone-950">Aceita Agendamento de Mesa / Horário</span>
              </label>

              <label class="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  [checked]="filterOpenNow()"
                  (change)="filterOpenNow.set($any($event.target).checked)"
                  class="w-4 h-4 rounded text-orange-600 accent-orange-500 cursor-pointer">
                <mat-icon class="text-stone-700 text-base">schedule</mat-icon>
                <span class="font-medium text-stone-800 text-[11px] group-hover:text-stone-950">Aberto Agora (Funcionamento Ativo)</span>
              </label>
            </div>
          }
        </div>

        <!-- CATEGORIES FILTER BAR -->
        <div class="bg-white rounded-2xl p-1.5 shadow-md border border-stone-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            (click)="activeCategory.set('todos')"
            [class]="activeCategory() === 'todos' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 font-black shadow-sm' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'"
            class="px-3.5 py-2 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer font-bold">
            Todos
          </button>

          <button
            type="button"
            (click)="activeCategory.set('restaurant')"
            [class]="activeCategory() === 'restaurant' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 font-black shadow-sm' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'"
            class="px-3 py-2 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 font-bold">
            <mat-icon class="text-sm">restaurant</mat-icon>
            <span>Restaurantes</span>
          </button>

          <button
            type="button"
            (click)="activeCategory.set('retail')"
            [class]="activeCategory() === 'retail' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 font-black shadow-sm' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'"
            class="px-3 py-2 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 font-bold">
            <mat-icon class="text-sm">shopping_bag</mat-icon>
            <span>Varejo</span>
          </button>

          <button
            type="button"
            (click)="activeCategory.set('services')"
            [class]="activeCategory() === 'services' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 font-black shadow-sm' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'"
            class="px-3 py-2 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 font-bold">
            <mat-icon class="text-sm">build</mat-icon>
            <span>Serviços</span>
          </button>

          <button
            type="button"
            (click)="activeCategory.set('outros')"
            [class]="activeCategory() === 'outros' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 font-black shadow-sm' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'"
            class="px-3 py-2 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 font-bold">
            <mat-icon class="text-sm">more_horiz</mat-icon>
            <span>Outros</span>
          </button>
        </div>

        <!-- FAST STATUS SEGMENTED CONTROL: TODOS / ABERTOS AGORA / FECHADOS -->
        <div class="bg-white/95 rounded-2xl p-1 shadow-sm border border-stone-200/90 flex items-center gap-1">
          <button
            type="button"
            (click)="statusFilter.set('all')"
            [class]="statusFilter() === 'all' ? 'bg-stone-900 text-amber-300 font-black shadow-xs' : 'text-stone-600 hover:text-stone-950 font-bold'"
            class="flex-1 py-1.5 rounded-xl text-[11px] text-center transition-all cursor-pointer">
            Todos ({{ totalStoresCount() }})
          </button>

          <button
            type="button"
            (click)="statusFilter.set('open')"
            [class]="statusFilter() === 'open' ? 'bg-emerald-700 text-white font-black shadow-xs' : 'text-emerald-800 hover:text-emerald-950 font-bold'"
            class="flex-1 py-1.5 rounded-xl text-[11px] text-center transition-all cursor-pointer flex items-center justify-center gap-1">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Abertos ({{ openStoresCount() }})</span>
          </button>

          <button
            type="button"
            (click)="statusFilter.set('closed')"
            [class]="statusFilter() === 'closed' ? 'bg-rose-800 text-white font-black shadow-xs' : 'text-rose-800 hover:text-rose-950 font-bold'"
            class="flex-1 py-1.5 rounded-xl text-[11px] text-center transition-all cursor-pointer flex items-center justify-center gap-1">
            <span class="w-2 h-2 rounded-full bg-rose-400"></span>
            <span>Fechados ({{ closedStoresCount() }})</span>
          </button>
        </div>

        <!-- SORTING ROW -->
        <div class="flex items-center justify-between text-xs px-1">
          <div class="flex items-center gap-1 text-stone-400 font-bold">
            <mat-icon class="text-sm">swap_vert</mat-icon>
            <span>Ordenar por:</span>
          </div>

          <div class="relative">
            <button
              type="button"
              (click)="toggleSortMenu()"
              class="bg-white text-stone-900 border border-stone-300 rounded-2xl px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer">
              <mat-icon class="text-amber-500 text-sm">star</mat-icon>
              <span>{{ sortLabel() }}</span>
              <mat-icon class="text-sm text-stone-500">expand_more</mat-icon>
            </button>

            @if (showSortMenu()) {
              <div class="absolute right-0 top-10 bg-white border border-stone-200 rounded-2xl p-1.5 shadow-2xl z-40 w-44 text-xs space-y-1 font-sans text-stone-900 animate-in fade-in">
                <button
                  type="button"
                  (click)="setSort('rating')"
                  class="w-full text-left px-3 py-1.5 rounded-xl hover:bg-stone-100 font-bold flex items-center gap-1.5">
                  <mat-icon class="text-amber-500 text-xs">star</mat-icon>
                  <span>Melhor Avaliação</span>
                </button>
                <button
                  type="button"
                  (click)="setSort('distance')"
                  class="w-full text-left px-3 py-1.5 rounded-xl hover:bg-stone-100 font-bold flex items-center gap-1.5">
                  <mat-icon class="text-blue-500 text-xs">near_me</mat-icon>
                  <span>Menor Distância</span>
                </button>
                <button
                  type="button"
                  (click)="setSort('name')"
                  class="w-full text-left px-3 py-1.5 rounded-xl hover:bg-stone-100 font-bold flex items-center gap-1.5">
                  <mat-icon class="text-stone-500 text-xs">sort_by_alpha</mat-icon>
                  <span>Nome da Loja</span>
                </button>
                <button
                  type="button"
                  (click)="setSort('fee')"
                  class="w-full text-left px-3 py-1.5 rounded-xl hover:bg-stone-100 font-bold flex items-center gap-1.5">
                  <mat-icon class="text-emerald-500 text-xs">local_shipping</mat-icon>
                  <span>Menor Taxa de Entrega</span>
                </button>
              </div>
            }
          </div>
        </div>

        <!-- STORES LIST -->
        <div id="storesList" class="space-y-3.5">
          @for (store of displayedStores(); track store.id) {
            <div class="bg-white rounded-3xl p-4 shadow-xl border border-stone-200 text-stone-950 space-y-3 transition-all hover:border-amber-400">
              
              <!-- Top Row: Thumbnail + Details + Actions -->
              <div class="flex items-start gap-3">
                <img
                  [src]="store.logo || store.coverImage"
                  [alt]="store.name"
                  class="w-14 h-14 rounded-2xl object-cover border border-stone-200 shadow-sm shrink-0"
                  referrerpolicy="no-referrer">

                <div class="flex-1 min-w-0">
                  <!-- Hub Choice Badge -->
                  @if (isHubChoice(store)) {
                    <div class="flex items-center gap-1.5 mb-0.5">
                      <span class="bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[8px] font-mono uppercase px-2 py-0.2 rounded-full inline-flex items-center gap-1">
                        <mat-icon class="text-[9px] text-amber-600">star</mat-icon>
                        <span>Escolha do Hub</span>
                      </span>
                      <div class="flex-1 border-b border-dashed border-stone-300"></div>
                    </div>
                  }

                  <h3 class="font-serif font-black text-sm text-stone-950 leading-tight truncate">
                    {{ store.name }}
                  </h3>

                  <!-- Category / Specialties Line -->
                  <div class="text-[10px] text-stone-600 flex items-center gap-1 truncate mt-0.5">
                    <mat-icon class="text-[11px] text-blue-600 shrink-0">verified</mat-icon>
                    <span class="truncate">{{ getCategoryDescription(store) }}</span>
                  </div>

                  <!-- Location Address -->
                  <div class="text-[10px] text-stone-500 flex items-center gap-1 truncate mt-0.5">
                    <mat-icon class="text-[11px] text-stone-400 shrink-0">place</mat-icon>
                    <span class="truncate">{{ store.address.street }}, {{ store.address.number }} - {{ store.address.neighborhood }}</span>
                  </div>

                  <!-- Aberto Agora / Fechado Badge & Quick Operator Control -->
                  <div class="flex flex-wrap items-center gap-1.5 mt-1">
                    @if (store.isOpen) {
                      <span class="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[8px] font-mono px-2 py-0.5 rounded-full shadow-xs">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>ABERTO AGORA</span>
                      </span>
                    } @else {
                      <span class="inline-flex items-center gap-1 bg-stone-200 text-stone-700 border border-stone-300 font-bold text-[8px] font-mono px-2 py-0.5 rounded-full shadow-xs">
                        <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        <span>FECHADO NO MOMENTO</span>
                      </span>
                    }
                  </div>

                  <!-- Delivery Fee, Min Order & Fleet Type -->
                  <div class="flex flex-wrap items-center gap-1.5 mt-1 text-[9px] font-mono font-bold">
                    <span class="bg-amber-100 text-amber-950 px-1.5 py-0.2 rounded border border-amber-300">
                      {{ (store.deliveryFee ?? 0) === 0 ? 'Entrega Grátis' : 'Entrega R$ ' + (store.deliveryFee || 0).toFixed(2) }}
                    </span>
                    @if (store.minOrderValue && store.minOrderValue > 0) {
                      <span class="bg-stone-100 text-stone-800 px-1.5 py-0.2 rounded border border-stone-300">
                        Min. R$ {{ store.minOrderValue.toFixed(2) }}
                      </span>
                    }
                    <span [class]="store.deliveryFleetType === 'own' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-purple-100 text-purple-900 border-purple-300'" class="px-1.5 py-0.2 rounded border">
                      {{ store.deliveryFleetType === 'own' ? '🛵 Entrega pela loja' : '🛵 Entrega pela loja · 3EAT em breve' }}
                    </span>
                  </div>
                </div>

                <!-- Right Corner: Actions & Distance -->
                <div class="flex flex-col items-end justify-between shrink-0 h-14">
                  <div class="flex items-center gap-1">
                    <button
                      type="button"
                      (click)="shareStore(store)"
                      class="w-7 h-7 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 flex items-center justify-center border border-teal-200 transition-colors cursor-pointer"
                      title="Compartilhar">
                      <mat-icon class="text-xs">share</mat-icon>
                    </button>
                    <button
                      type="button"
                      (click)="toggleFavorite(store)"
                      class="w-7 h-7 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center border border-stone-200 transition-colors cursor-pointer"
                      title="Favorito">
                      <mat-icon class="text-xs">star_border</mat-icon>
                    </button>
                  </div>

                  <span class="text-[10px] font-mono font-bold text-stone-800">
                    {{ getDistanceKm(store) }} km
                  </span>
                </div>
              </div>

              <!-- Bottom Row: Buttons (Examinar vs Abrir Vitrine) -->
              <div class="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  (click)="inspectStore(store)"
                  class="bg-[#ebdcc7] hover:bg-[#decbb4] text-stone-800 font-bold py-2.5 px-3 rounded-2xl border border-[#d6c3aa] text-xs transition-all text-center cursor-pointer active:scale-98">
                  Examinar
                </button>

                <button
                  type="button"
                  (click)="openStorefront(store.id)"
                  class="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black py-2.5 px-3 rounded-2xl shadow-md border border-amber-400/50 text-xs transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 active:scale-98">
                  <span>Abrir Vitrine</span>
                  <mat-icon class="text-xs">arrow_forward</mat-icon>
                </button>
              </div>

            </div>
          } @empty {
            <div class="bg-white rounded-3xl p-8 text-center text-stone-600 space-y-2 border border-stone-200">
              <mat-icon class="text-3xl text-stone-400">storefront</mat-icon>
              <h4 class="font-bold text-sm text-stone-900">Nenhum estabelecimento encontrado</h4>
              <p class="text-xs text-stone-500">Tente aumentar o raio máximo de busca ou desmarcar alguns filtros.</p>
            </div>
          }
        </div>

        <!-- LOAD MORE FOOTER -->
        @if (canLoadMore()) {
          <div class="text-center pt-2">
            <button
              type="button"
              (click)="loadMore()"
              class="text-xs font-bold text-stone-400 hover:text-amber-400 transition-colors inline-flex items-center gap-1 cursor-pointer">
              <mat-icon class="text-sm">expand_more</mat-icon>
              <span>Carregar mais estabelecimentos</span>
            </button>
          </div>
        }

        <!-- DISCRETE BANNER FOR STORE OWNERS / LOJISTAS -->
        <div class="bg-gradient-to-r from-[#1c0d06] via-[#261208] to-[#1c0d06] border border-amber-600/40 rounded-2xl p-4 shadow-xl space-y-2.5 text-center mt-6">
          <div class="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
            <mat-icon class="text-lg">storefront</mat-icon>
          </div>
          <div class="space-y-1">
            <h4 class="font-serif font-black text-white text-xs">Você tem um negócio? Conheça o 3eatcru OS</h4>
            <p class="text-[10px] text-stone-400 leading-snug">
              PDV, KDS Cozinha, Estoque e Cardápio Integrado ao Marketplace da Região.
            </p>
          </div>
          <button
            type="button"
            (click)="router.navigate(['/para-lojistas'])"
            class="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-black py-2.5 px-3 rounded-xl text-[11px] uppercase tracking-wider shadow cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5">
            <span>Apresentação Comercial &amp; Cadastro</span>
            <mat-icon class="text-xs">arrow_forward</mat-icon>
          </button>
        </div>

      </div>

      <!-- CONSUMER PROFILE & AUTH MODAL -->
      @if (showConsumerModal()) {
        <div class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in">
          <div class="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <app-consumer-profile [isModal]="true" (close)="showConsumerModal.set(false)"></app-consumer-profile>
          </div>
        </div>
      }

      <!-- INSPECT STORE MODAL (MOBILE) -->
      @if (inspectedStore(); as store) {
        <div class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div class="bg-[#faf7f0] border-t sm:border border-[#ded4c2] rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 text-stone-900 space-y-4 shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95">
            <div class="flex justify-between items-start pb-3 border-b border-[#e8dfce]">
              <div class="flex items-center gap-3">
                <img [src]="store.logo || store.coverImage" [alt]="store.name" class="w-12 h-12 rounded-2xl object-cover border border-[#d6c7b0]" referrerpolicy="no-referrer">
                <div>
                  <span class="border border-dashed border-amber-700 text-amber-800 bg-amber-100 px-2 py-0.5 rounded text-[8px] font-bold font-mono uppercase">
                    {{ store.badgeCategory || store.category }} • FICHA #{{ store.fichaCode || '001' }}
                  </span>
                  <h3 class="font-serif font-black text-base text-stone-900 mt-0.5 leading-tight">{{ store.name }}</h3>
                  <div class="text-[10px] text-stone-500 font-medium">{{ store.tagline || (store.badgeCategory || store.category) }}</div>
                </div>
              </div>
              <button type="button" (click)="inspectedStore.set(null)" class="text-stone-400 hover:text-stone-800 font-bold text-lg p-1 cursor-pointer">✕</button>
            </div>

            <!-- Operating Status & Toggle Control -->
            <div class="bg-[#f5ebd9] border border-[#e6d8be] rounded-2xl p-3 flex items-center justify-between">
              <div>
                <div class="text-[9px] font-mono uppercase font-bold text-amber-900">Expediente Operacional:</div>
                <div class="flex items-center gap-1.5 mt-0.5 font-bold text-xs" [class]="store.isOpen ? 'text-emerald-800' : 'text-rose-800'">
                  <span class="w-2 h-2 rounded-full" [class]="store.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'"></span>
                  <span>{{ store.isOpen ? 'ABERTO AGORA' : 'FECHADO NO MOMENTO' }}</span>
                </div>
              </div>
            </div>

            <div class="space-y-2 text-xs">
              <div class="bg-[#f5ebd9] border border-[#e6d8be] rounded-xl p-2.5 space-y-0.5">
                <div class="font-bold text-[10px] text-amber-900 uppercase font-mono">Endereço &amp; Localização:</div>
                <div class="text-[11px] text-stone-800">{{ store.address.street }}, {{ store.address.number }} - {{ store.address.neighborhood }}</div>
                <div class="text-[10px] text-stone-500">Distância calculada: {{ getDistanceKm(store) }} km</div>
              </div>

              <div class="bg-[#f5ebd9] border border-[#e6d8be] rounded-xl p-2.5 space-y-0.5">
                <div class="font-bold text-[10px] text-amber-900 uppercase font-mono">Atendimento &amp; Telefone:</div>
                <div class="text-[11px] text-stone-800">Horário: {{ store.openingHours || 'Seg a Dom 11h às 23h' }}</div>
                <div class="text-[11px] text-stone-800">Telefone: {{ store.phone }}</div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 pt-2 border-t border-[#e8dfce]">
              <button
                type="button"
                (click)="inspectedStore.set(null)"
                class="bg-[#ebdcc7] hover:bg-[#decbb4] text-stone-800 font-bold py-2.5 rounded-xl border border-[#d6c3aa] text-xs cursor-pointer">
                Voltar
              </button>

              <button
                type="button"
                (click)="openStorefront(store.id); inspectedStore.set(null)"
                class="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black py-2.5 rounded-xl shadow-lg border border-amber-400/50 text-xs flex items-center justify-center gap-1 cursor-pointer">
                <span>Abrir Vitrine</span>
                <mat-icon class="text-sm">arrow_forward</mat-icon>
              </button>
            </div>
          </div>
        </div>
      }

    </div>
  `
})
export class RegionalMarketplaceMobileComponent {
  readonly ecosystem = inject(EcosystemService);
  readonly router = inject(Router);

  toggleMenu = output<void>();

  readonly showConsumerModal = signal<boolean>(false);
  readonly inspectedStore = signal<CompanyTenant | null>(null);
  readonly statusFilter = signal<'all' | 'open' | 'closed'>('all');

  readonly totalStoresCount = computed(() => this.ecosystem.tenants().filter(t => t.status === 'active').length);
  readonly openStoresCount = computed(() => this.ecosystem.tenants().filter(t => t.status === 'active' && t.isOpen).length);
  readonly closedStoresCount = computed(() => this.ecosystem.tenants().filter(t => t.status === 'active' && !t.isOpen).length);

  readonly bussolaOpen = signal<boolean>(true);
  readonly modalidadesOpen = signal<boolean>(true);
  readonly showRegionDropdown = signal<boolean>(false);
  readonly showSortMenu = signal<boolean>(false);

  toggleRegionDropdown() {
    this.showRegionDropdown.update(v => !v);
  }

  toggleBussola() {
    this.bussolaOpen.update(v => !v);
  }

  toggleModalidades() {
    this.modalidadesOpen.update(v => !v);
  }

  toggleSortMenu() {
    this.showSortMenu.update(v => !v);
  }

  readonly availableRegions = ['Zona Sul - SP', 'Paulista & Centro', 'Zona Oeste - Pinheiros', 'Zona Leste', 'Zona Norte'];
  readonly selectedRegionName = signal<string>('Zona Sul - SP');

  readonly referenceAddress = computed(() => this.ecosystem.userReferenceAddress());
  readonly searchAddressQuery = signal<string>('');
  readonly maxRadius = signal<number>(30);

  readonly filterDelivery = signal<boolean>(true);
  readonly filterTakeout = signal<boolean>(true);
  readonly filterReservation = signal<boolean>(true);
  readonly filterOpenNow = signal<boolean>(true);

  readonly activeCategory = signal<CategoryFilter>('todos');
  readonly currentSort = signal<SortBy>('rating');

  readonly displayLimit = signal<number>(6);

  readonly sortLabel = computed(() => {
    switch (this.currentSort()) {
      case 'rating': return 'Melhor Avaliação';
      case 'distance': return 'Menor Distância';
      case 'name': return 'Nome da Loja';
      case 'fee': return 'Menor Taxa';
    }
  });

  readonly filteredStores = computed(() => {
    let list = this.ecosystem.tenants().filter(t => t.status === 'active');

    // Status filter (Todos / Abertos / Fechados)
    const sFilter = this.statusFilter();
    if (sFilter === 'open') {
      list = list.filter(t => t.isOpen);
    } else if (sFilter === 'closed') {
      list = list.filter(t => !t.isOpen);
    }

    // Category filter
    const cat = this.activeCategory();
    if (cat === 'restaurant') {
      list = list.filter(t => t.category === 'restaurant' || t.category === 'hybrid');
    } else if (cat === 'retail') {
      list = list.filter(t => t.category === 'retail');
    } else if (cat === 'services') {
      list = list.filter(t => t.category === 'services' || t.category === 'beauty' || t.category === 'automotive');
    } else if (cat === 'outros') {
      list = list.filter(t => t.category !== 'restaurant' && t.category !== 'retail' && t.category !== 'services');
    }

    // Modalidades filter
    if (this.filterDelivery()) {
      list = list.filter(t => t.supportsDelivery !== false);
    }
    if (this.filterTakeout()) {
      list = list.filter(t => t.supportsTakeout !== false);
    }
    if (this.filterOpenNow() && sFilter === 'all') {
      list = list.filter(t => t.isOpen !== false);
    }

    // Radius filter
    const maxR = this.maxRadius();
    list = list.filter(t => this.ecosystem.calculateDistanceToUser(t.lat, t.lng) <= maxR);

    // Sorting
    const sort = this.currentSort();
    if (sort === 'rating') {
      list = [...list].sort((a, b) => (b.rating || 4.5) - (a.rating || 4.5));
    } else if (sort === 'distance') {
      list = [...list].sort((a, b) => this.ecosystem.calculateDistanceToUser(a.lat, a.lng) - this.ecosystem.calculateDistanceToUser(b.lat, b.lng));
    } else if (sort === 'name') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'fee') {
      list = [...list].sort((a, b) => (a.deliveryFee || 0) - (b.deliveryFee || 0));
    }

    return list;
  });

  readonly displayedStores = computed(() => {
    return this.filteredStores().slice(0, this.displayLimit());
  });

  readonly canLoadMore = computed(() => {
    return this.filteredStores().length > this.displayLimit();
  });

  loadMore() {
    this.displayLimit.update(l => l + 4);
  }

  inspectStore(store: CompanyTenant) {
    this.inspectedStore.set(store);
  }

  isHubChoice(store: CompanyTenant): boolean {
    const featured = this.ecosystem.regionalConfig().featuredTenantIds || [];
    return featured.includes(store.id) || (store.rating || 4.5) >= 4.8;
  }

  getCategoryDescription(store: CompanyTenant): string {
    if (store.specialties && store.specialties.length > 0) {
      return store.badgeCategory ? `${store.badgeCategory} • ${store.specialties.slice(0, 3).join(' • ')}` : store.specialties.slice(0, 3).join(' • ');
    }
    return store.tagline || (store.category === 'restaurant' ? 'Alimentação • Lanches • Artesanal' : 'Comércio & Serviços Locais');
  }

  getDistanceKm(store: CompanyTenant): string {
    const d = this.ecosystem.calculateDistanceToUser(store.lat, store.lng);
    return d.toFixed(1).replace('.', ',');
  }

  triggerGpsCalibration() {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.ecosystem.userReferenceCoords.set({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          this.ecosystem.notify('GPS calibrado em tempo real com precisão de satélite!', 'success');
        },
        () => {
          this.ecosystem.userReferenceCoords.set({ lat: -23.5651, lng: -46.6521 });
          this.ecosystem.notify('Coordenadas de referência GPS calibradas (Avenida Paulista).', 'success');
        }
      );
    } else {
      this.ecosystem.userReferenceCoords.set({ lat: -23.5651, lng: -46.6521 });
      this.ecosystem.notify('Coordenadas de referência GPS calibradas.', 'success');
    }
  }

  applyAddressSearch() {
    const q = this.searchAddressQuery().trim();
    if (!q) return;
    this.ecosystem.userReferenceAddress.set(q + ' - São Paulo, SP');
    this.ecosystem.notify(`Ponto de referência atualizado para: ${q}`, 'info');
  }

  selectRegion(region: string) {
    this.selectedRegionName.set(region);
    this.showRegionDropdown.set(false);
    this.ecosystem.notify(`Região alterada para: ${region}`, 'info');
  }

  setSort(sort: SortBy) {
    this.currentSort.set(sort);
    this.showSortMenu.set(false);
  }

  shareStore(store: CompanyTenant) {
    this.ecosystem.sendWhatsAppMessage('Compartilhar', '999', `Confira esta loja no 3EAT: ${store.name}! Acesse: https://3eatcru.com.br/p/${store.id}`);
  }

  toggleFavorite(store: CompanyTenant) {
    this.ecosystem.notify(`Loja "${store.name}" adicionada aos seus favoritos!`, 'success');
  }

  openStorefront(storeId: string) {
    this.ecosystem.openStorefront(storeId);
  }

  scrollToStores() {
    const el = document.getElementById('storesList');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
