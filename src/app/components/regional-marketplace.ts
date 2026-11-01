/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChangeDetectionStrategy, Component, inject, signal, computed, ElementRef, viewChild, afterNextRender, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { EcosystemService } from '../services/ecosystem.service';
import { CompanyTenant, ConsumerAccount } from '../models/ecosystem.model';
import { RegionalMarketplaceMobileComponent } from './marketplace/regional-marketplace-mobile';
import { ConsumerProfileComponent } from './consumer-profile';

type CatalogViewMode = 'fichario' | 'livro-razao' | 'mesa-cartografica';
type SortOption = 'rating' | 'distance' | 'name' | 'fee';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-regional-marketplace',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, RegionalMarketplaceMobileComponent, ConsumerProfileComponent],
  template: `
    <!-- SMARTPHONE MOBILE VIEW (MODELO MOCKUP DE ALTA FIDELIDADE) -->
    <div class="block md:hidden">
      <app-regional-marketplace-mobile></app-regional-marketplace-mobile>
    </div>

    <!-- DESKTOP / WIDESCREEN VIEW -->
    <div class="hidden md:block min-h-screen bg-[#0d0704] text-stone-200 p-3 sm:p-8 font-sans selection:bg-amber-600 selection:text-white relative overflow-x-hidden">
      
      <!-- BACKGROUND CARBON TEXTURE -->
      <div class="absolute inset-0 pointer-events-none opacity-20 bg-carbon-pattern z-0"></div>

      <div class="max-w-7xl mx-auto space-y-6 relative z-10">
        
        <!-- REGIONAL HERO BANNER (GOVERNED BY HQ) -->
        <div class="border-2 border-[#4d2813] rounded-3xl overflow-hidden relative shadow-2xl bg-stone-950 min-h-[200px] flex flex-col justify-between p-6 sm:p-8">
          
          <!-- HQ CURATED HERO BACKGROUND IMAGE WITH ARTISTIC GRADIENT OVERLAY -->
          <img
            [src]="ecosystem.regionalConfig().heroBannerImage"
            alt="Hero Banner Regional"
            class="absolute inset-0 w-full h-full object-cover opacity-35"
            referrerpolicy="no-referrer">
          <div class="absolute inset-0 bg-gradient-to-t from-[#0d0704] via-[#0d0704]/75 to-[#0d0704]/30 pointer-events-none"></div>

          <!-- TOP PILL & HQ ADMIN SHORTCUT -->
          <div class="relative z-10 flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <div class="inline-flex items-center gap-1.5 bg-emerald-950/90 text-emerald-300 font-mono font-bold uppercase text-[10px] px-3 py-1 rounded-full border border-emerald-500/70 shadow-md tracking-wider">
                <mat-icon class="text-xs text-emerald-400">storefront</mat-icon>
                <span>PILAR 3: MARKETPLACE REGIONAL (CONSUMIDOR)</span>
              </div>
              <div class="inline-flex items-center gap-2 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-600 text-stone-950 font-black uppercase text-[10px] px-3.5 py-1 rounded-full border border-amber-400 shadow-md font-mono tracking-wider">
                <mat-icon class="text-xs">verified</mat-icon>
                <span>{{ ecosystem.regionalConfig().heroTag }}</span>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <span class="bg-[#1d1008]/90 text-amber-300 border border-[#4d2813] text-[11px] font-mono px-3 py-1 rounded-xl shadow flex items-center gap-1.5 font-bold">
                <mat-icon class="text-xs text-amber-400">place</mat-icon>
                <span>{{ ecosystem.regionalConfig().activeRegionName }}</span>
              </span>

              @if (isMerchant()) {
                 <button
                  type="button"
                  (click)="ecosystem.currentView.set('os'); router.navigate(['/os'])"
                  class="bg-[#2b160b] hover:bg-[#3d200f] text-amber-300 border border-[#482814] text-[10px] font-bold px-4 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow">
                  <mat-icon class="text-xs">desktop_windows</mat-icon>
                  <span>Retornar ao Meu Terminal OS</span>
                </button>
              } @else {
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    (click)="router.navigate(['/para-lojistas'])"
                    class="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 font-black border border-amber-300 text-[11px] px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95"
                    title="Conheça a plataforma comercial 3eatcru OS para o seu negócio">
                    <mat-icon class="text-xs">storefront</mat-icon>
                    <span>Você tem um negócio? Conheça o 3eatcru OS</span>
                  </button>

                  <button
                    type="button"
                    (click)="router.navigate(['/os/login'])"
                    class="bg-[#1a0f08] hover:bg-[#2b160b] text-amber-500 border border-amber-600/30 text-[10px] font-bold px-3 py-1 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow"
                    title="Acesso ao Terminal OS do Lojista">
                    <mat-icon class="text-[14px]">desktop_windows</mat-icon>
                    <span>Área do Lojista</span>
                  </button>

                  <button
                    type="button"
                    (click)="showConsumerModal.set(true)"
                    class="bg-[#2b160b] hover:bg-[#3d200f] text-amber-300 hover:text-white border border-[#482814] text-[11px] font-bold px-3 py-1 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow">
                    <mat-icon class="text-xs text-amber-400">account_circle</mat-icon>
                    <span>{{ ecosystem.activeConsumer() ? ecosystem.activeConsumer()?.name : 'Entrar Consumidor' }}</span>
                  </button>
                </div>
              }
            </div>
          </div>

          <!-- MAIN HERO TITLES & CTA -->
          <div class="relative z-10 space-y-2 mt-4 max-w-3xl">
            <h1 class="text-2xl sm:text-4xl font-serif font-black tracking-tight text-white drop-shadow-lg leading-tight">
              {{ ecosystem.regionalConfig().heroTitle }}
            </h1>

            <p class="text-stone-300 font-serif text-xs sm:text-sm leading-relaxed drop-shadow">
              {{ ecosystem.regionalConfig().heroSubtitle }}
            </p>

            <div class="pt-2 flex flex-wrap items-center gap-3">
              <span class="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-stone-950 font-extrabold px-4 py-2 rounded-xl text-xs shadow-lg flex items-center gap-1.5 font-sans">
                <mat-icon class="text-sm">store</mat-icon>
                <span>{{ ecosystem.regionalConfig().heroCtaText }}</span>
              </span>

              <span class="text-[11px] font-mono text-stone-400">
                • {{ filteredTenants().length }} estabelecimentos credenciados na área
              </span>
            </div>
          </div>

          <!-- BROADCAST BANNER IF ACTIVE -->
          @if (ecosystem.regionalConfig().showHeroAnnouncement && ecosystem.regionalConfig().heroAnnouncement) {
            <div class="relative z-10 mt-5 bg-gradient-to-r from-amber-950/95 via-orange-950/95 to-amber-950/95 text-amber-200 border-2 border-amber-600/80 rounded-2xl p-3 shadow-xl flex items-center justify-between gap-3 text-xs font-bold animate-in fade-in">
              <div class="flex items-center gap-2">
                <mat-icon class="text-amber-400 text-base animate-pulse">campaign</mat-icon>
                <span>{{ ecosystem.regionalConfig().heroAnnouncement }}</span>
              </div>
              <span class="text-[10px] bg-stone-950/70 border border-amber-700/60 font-mono px-2 py-0.5 rounded text-amber-400 uppercase font-black shrink-0">
                HQ Central
              </span>
            </div>
          }

        </div>

        <!-- MAIN LAYOUT: SIDEBAR & MAIN AREA -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          <!-- LEFT SIDEBAR (2 PARCHMENT CARDS) -->
          <div class="lg:col-span-4 space-y-6">
            
            <!-- CARD 1: BÚSSOLA & LOCALIZAÇÃO -->
            <div class="bg-[#faf7f0] border border-[#ded4c2] rounded-2xl p-5 shadow-xl text-stone-900 space-y-4">
              <div class="flex items-center gap-2 font-serif font-black text-base text-stone-900 border-b border-[#e8dfce] pb-3">
                <mat-icon class="text-amber-700">explore</mat-icon>
                <span>Bússola &amp; Localização</span>
              </div>

              <p class="text-xs text-stone-600 leading-snug">
                Defina o ponto de referência para medir a distância em quilômetros reais de cada balcão comercial:
              </p>

              <!-- PONTO GEOGRÁFICO BOX -->
              <div class="space-y-1">
                <span class="text-[9px] font-mono font-bold text-amber-800 uppercase tracking-widest block">PONTO GEOGRÁFICO</span>
                <div class="bg-[#f5ebd9] border border-[#e6d8be] rounded-xl p-3 text-stone-800 font-sans text-xs flex items-start gap-2.5">
                  <mat-icon class="text-amber-800 text-sm mt-0.5 shrink-0">place</mat-icon>
                  <span class="font-medium leading-tight">{{ ecosystem.userReferenceAddress() }}</span>
                </div>
              </div>

              <!-- GPS BUTTON -->
              <button
                type="button"
                (click)="useLiveGps()"
                [disabled]="isAcquiringGps()"
                class="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-extrabold py-3 px-4 rounded-xl shadow-lg border border-amber-400/50 flex items-center justify-center gap-2 text-xs transition-all active:scale-98 cursor-pointer">
                <mat-icon class="text-base" [class.animate-spin]="isAcquiringGps()">
                  {{ isAcquiringGps() ? 'autorenew' : 'gps_fixed' }}
                </mat-icon>
                <span>{{ isAcquiringGps() ? 'Obtendo GPS...' : 'Usar Sinal de GPS Real' }}</span>
              </button>

              <!-- BUSCAR ENDEREÇO -->
              <div class="space-y-2 pt-1">
                <label for="searchAddrInput" class="block text-xs font-bold text-stone-800">Buscar Endereço no Mapa</label>
                <div class="flex gap-2">
                  <input
                    id="searchAddrInput"
                    #addrInput
                    type="text"
                    [value]="searchAddressValue()"
                    (input)="searchAddressValue.set(addrInput.value)"
                    (keydown.enter)="applyAddressSearch(addrInput.value)"
                    placeholder="Rua, Bairro, Cidade..."
                    class="flex-1 bg-white border border-[#d6c7b0] rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-amber-600 font-medium placeholder:text-stone-400">
                  <button
                    type="button"
                    (click)="applyAddressSearch(addrInput.value)"
                    class="bg-[#ebdcc7] hover:bg-[#decbb4] text-stone-800 font-bold px-3 py-2 rounded-xl border border-[#d6c3aa] flex items-center gap-1 text-xs cursor-pointer">
                    <mat-icon class="text-sm">search</mat-icon> Buscar
                  </button>
                </div>
                <div class="text-[10px] text-rose-600 font-semibold italic">Digite um endereço para buscar.</div>
              </div>

              <!-- SLIDER RAIO MÁXIMO -->
              <div class="space-y-2 pt-3 border-t border-[#e8dfce]">
                <div class="flex justify-between items-center text-xs font-bold text-stone-800">
                  <span>Raio Máximo:</span>
                  <span class="text-amber-800 font-extrabold font-mono">{{ ecosystem.maxDiscoveryRadiusKm() }} km</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="1"
                  [value]="ecosystem.maxDiscoveryRadiusKm()"
                  (input)="onRadiusChange($event)"
                  class="w-full accent-amber-600 h-2 bg-[#e3d7c3] rounded-lg cursor-pointer">
                <div class="flex justify-between text-[10px] font-mono text-stone-500 font-bold">
                  <span>1 km</span>
                  <span>15 km</span>
                  <span>30 km</span>
                </div>
              </div>

            </div>

            <!-- CARD 2: MODALIDADES DO BALCÃO -->
            <div class="bg-[#faf7f0] border border-[#ded4c2] rounded-2xl p-5 shadow-xl text-stone-900 space-y-3">
              <div class="flex items-center gap-2 font-serif font-black text-base text-stone-900 border-b border-[#e8dfce] pb-2">
                <mat-icon class="text-amber-700">tune</mat-icon>
                <span>Modalidades do Balcão</span>
              </div>

              <div class="space-y-2 pt-1 text-xs">
                @for (filter of filters; track filter.label) {
                  <label class="flex items-center gap-2.5 p-2 rounded-xl hover:bg-[#f0e7d8] cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      [checked]="filter.signal()"
                      (change)="filter.signal.set(!filter.signal())"
                      class="w-4 h-4 rounded border-stone-400 accent-amber-600">
                    <mat-icon class="text-amber-800 text-sm">{{ filter.icon }}</mat-icon>
                    <span class="font-medium text-stone-800">{{ filter.label }}</span>
                  </label>
                }
              </div>
            </div>

            <!-- CARD 3: PROMOÇÃO DO STORE OS PARA LOJISTAS & RESTAURANTES -->
            <div class="bg-gradient-to-br from-[#1d1008] to-[#120703] border-2 border-amber-600/60 rounded-2xl p-5 shadow-2xl text-stone-200 space-y-3 relative overflow-hidden">
              <div class="absolute -right-6 -bottom-6 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
              
              <div class="flex items-center justify-between border-b border-[#3d200f] pb-2">
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center font-black">
                    <mat-icon class="text-sm">storefront</mat-icon>
                  </div>
                  <span class="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">Espaço do Lojista</span>
                </div>
                <span class="text-[9px] font-mono bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-800 uppercase font-bold">
                  Desktop &amp; Tablet
                </span>
              </div>

              <div class="space-y-1.5">
                <h4 class="font-serif font-black text-white text-sm leading-snug">
                  Tem um restaurante ou comércio?
                </h4>
                <p class="text-[11px] text-stone-400 leading-relaxed">
                  Conheça o <strong>3EATCRU Store OS</strong>: Frente de Caixa PDV, Comandas KDS, Salão de Mesas e Estoque ERP completo para computadores e tablets.
                </p>
              </div>

              <div class="pt-2">
                <button
                  type="button"
                  (click)="router.navigate(['/para-lojistas'])"
                  class="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black py-2.5 px-3 rounded-xl shadow-lg flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider cursor-pointer active:scale-95 transition-all">
                  <mat-icon class="text-xs">business</mat-icon>
                  <span>Conhecer o 3eatcru OS</span>
                </button>
              </div>
            </div>

          </div>

          <!-- RIGHT AREA: CONTROL HEADER & VIEWS -->
          <div class="lg:col-span-8 space-y-6">
            
            <!-- TOP CONTROL PARCHMENT CONTAINER -->
            <div class="bg-[#faf7f0] border border-[#ded4c2] rounded-2xl p-5 shadow-xl text-stone-900 space-y-4">
              
              <!-- TOP ROW: BADGE & VIEW SWITCHER BUTTONS -->
              <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-[#e8dfce]">
                <div class="flex items-center gap-2.5">
                  <!-- Screws dots -->
                  <div class="flex gap-1 text-amber-900/40">
                    <span class="w-2 h-2 rounded-full bg-amber-900/30"></span>
                    <span class="w-2 h-2 rounded-full bg-amber-900/30"></span>
                  </div>
                  <span class="bg-[#3b1e0d] text-amber-300 font-mono font-bold text-[10px] px-2.5 py-1 rounded-lg uppercase tracking-wider">
                    GAVETA CATÁLOGO #01
                  </span>
                  <h3 class="font-serif font-bold text-stone-800 text-sm">Fichário Comercial do Ecossistema</h3>
                </div>

                <!-- VIEW MODE SWITCHER BUTTONS -->
                <div class="flex items-center gap-1 bg-[#eae1d0] p-1 rounded-xl border border-[#d6c7b0]">
                  <button
                    type="button"
                    (click)="viewMode.set('fichario')"
                    [class]="viewMode() === 'fichario' ? 'bg-[#3b1e0d] text-amber-300 font-bold shadow' : 'text-stone-700 hover:text-stone-950 font-medium'"
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer">
                    <mat-icon class="text-sm">grid_view</mat-icon>
                    <span>Fichário</span>
                  </button>

                  <button
                    type="button"
                    (click)="viewMode.set('livro-razao')"
                    [class]="viewMode() === 'livro-razao' ? 'bg-[#3b1e0d] text-amber-300 font-bold shadow' : 'text-stone-700 hover:text-stone-950 font-medium'"
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer">
                    <mat-icon class="text-sm">view_list</mat-icon>
                    <span>Livro-Razão</span>
                  </button>

                  <button
                    type="button"
                    (click)="viewMode.set('mesa-cartografica')"
                    [class]="viewMode() === 'mesa-cartografica' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-extrabold shadow' : 'text-stone-700 hover:text-stone-950 font-medium'"
                    class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer">
                    <mat-icon class="text-sm">explore</mat-icon>
                    <span>Mesa Cartográfica</span>
                  </button>
                </div>
              </div>

              <!-- SEARCH INPUT & SORT DROPDOWN -->
              <div class="flex flex-col sm:flex-row gap-3 items-center">
                <div class="relative flex-1 w-full">
                  <mat-icon class="absolute left-3 top-2.5 text-stone-400 text-base">search</mat-icon>
                  <input
                    type="text"
                    [value]="searchQuery()"
                    (input)="searchQuery.set($any($event.target).value)"
                    placeholder="Pesquisar fichas por nome, prato, especialidade..."
                    class="w-full bg-white border border-[#d6c7b0] rounded-xl pl-9 pr-4 py-2 text-xs text-stone-900 focus:outline-none focus:border-amber-600 font-medium placeholder:text-stone-400">
                </div>

                <div class="flex items-center gap-2 shrink-0">
                  <span class="text-[10px] font-mono font-bold text-stone-600 uppercase">CLASSIFICAR:</span>
                  <select
                    [value]="sortCriteria()"
                    (change)="sortCriteria.set($any($event.target).value)"
                    class="bg-white border border-[#d6c7b0] rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:border-amber-600 cursor-pointer">
                    <option value="rating">Melhor Avaliação ⭐</option>
                    <option value="distance">Menor Distância (km)</option>
                    <option value="name">Nome (A-Z)</option>
                    <option value="fee">Menor Taxa de Entrega</option>
                  </select>
                </div>
              </div>

              <!-- CATEGORY PILLS & OPEN/CLOSED STATUS FILTER -->
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-[#e8dfce]">
                <div class="flex flex-wrap items-center gap-2">
                  @for (cat of categories; track cat.id) {
                    <button
                      type="button"
                      (click)="selectedCategory.set(cat.id)"
                      [class]="selectedCategory() === cat.id ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-extrabold shadow' : 'bg-white border border-[#d6c7b0] text-stone-700 hover:bg-[#f0e7d8] font-bold'"
                      class="px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer">
                      @if (cat.icon) { <mat-icon class="text-xs">{{ cat.icon }}</mat-icon> }
                      <span>{{ cat.label }}</span>
                    </button>
                  }
                </div>

                <!-- FAST STATUS SEGMENTED CONTROL: TODOS / ABERTOS / FECHADOS -->
                <div class="inline-flex items-center gap-1 bg-[#ebdcc7] p-1 rounded-xl border border-[#d6c3aa] shadow-inner shrink-0 self-start sm:self-auto">
                  <button
                    type="button"
                    (click)="statusFilter.set('all')"
                    [class]="statusFilter() === 'all' ? 'bg-[#3b1e0d] text-amber-300 font-bold shadow' : 'text-stone-700 hover:text-stone-950 font-medium'"
                    class="px-2.5 py-1 rounded-lg text-[11px] transition-all cursor-pointer">
                    Todos ({{ totalStoresCount() }})
                  </button>

                  <button
                    type="button"
                    (click)="statusFilter.set('open')"
                    [class]="statusFilter() === 'open' ? 'bg-emerald-700 text-white font-black shadow' : 'text-emerald-900 hover:text-emerald-950 font-bold'"
                    class="px-2.5 py-1 rounded-lg text-[11px] transition-all cursor-pointer flex items-center gap-1">
                    <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Abertos ({{ openStoresCount() }})</span>
                  </button>

                  <button
                    type="button"
                    (click)="statusFilter.set('closed')"
                    [class]="statusFilter() === 'closed' ? 'bg-rose-800 text-white font-black shadow' : 'text-rose-900 hover:text-rose-950 font-bold'"
                    class="px-2.5 py-1 rounded-lg text-[11px] transition-all cursor-pointer flex items-center gap-1">
                    <span class="w-2 h-2 rounded-full bg-rose-400"></span>
                    <span>Fechados ({{ closedStoresCount() }})</span>
                  </button>
                </div>
              </div>

            </div>

            <!-- VIEW 1: FICHÁRIO (GRID OF PARCHMENT CARDS) -->
            @if (viewMode() === 'fichario') {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                @for (store of filteredTenants(); track store.id) {
                  <div
                    [class]="isSpotlight(store.id) ? 'bg-[#faf7f0] border-2 border-amber-600 ring-2 ring-amber-400/30' : 'bg-[#faf7f0] border border-[#ded4c2]'"
                    class="rounded-2xl p-5 shadow-xl relative flex flex-col justify-between text-stone-900 group hover:border-amber-500 transition-all">
                    
                    <!-- Paperclip Graphic at top left -->
                    <div class="absolute -top-3 left-6 w-5 h-8 rounded-full border-2 border-stone-400 bg-transparent opacity-80 pointer-events-none flex items-center justify-center">
                      <div class="w-2 h-5 rounded-full border-2 border-stone-400"></div>
                    </div>

                    <div>
                      <!-- Card Header -->
                      <div class="flex justify-between items-start mb-4">
                        <div class="flex items-center gap-3">
                          <img [src]="store.logo || store.coverImage" [alt]="store.name" class="w-12 h-12 rounded-xl object-cover border border-[#d6c7b0] shadow shrink-0" referrerpolicy="no-referrer">
                          <div>
                            @if (isSpotlight(store.id)) {
                              <span class="bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-black text-[9px] px-2 py-0.5 rounded-full shadow flex items-center gap-1 w-fit mb-1 border border-amber-300">
                                <mat-icon class="text-[11px]">star</mat-icon> Escolha do HQ
                              </span>
                            }
                            <span class="border border-dashed border-amber-700 text-amber-800 bg-amber-100 px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase tracking-wider block mb-0.5">
                              {{ store.badgeCategory || store.category }} • FICHA #{{ store.fichaCode || '001' }}
                            </span>
                            <h3 class="font-serif font-black text-stone-900 text-base leading-tight">{{ store.name }}</h3>
                            <div class="text-[10px] text-stone-500 font-medium">{{ store.tagline || 'Alimentos & Bebidas' }}</div>
                            
                            <!-- OPEN / CLOSED STATUS BADGE -->
                            <div class="flex flex-wrap items-center gap-1.5 mt-1.5">
                              @if (store.isOpen) {
                                <span class="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[9px] font-mono px-2 py-0.5 rounded-full shadow-xs">
                                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  <span>ABERTO AGORA</span>
                                </span>
                              } @else {
                                <span class="inline-flex items-center gap-1 bg-stone-200 text-stone-700 border border-stone-300 font-bold text-[9px] font-mono px-2 py-0.5 rounded-full shadow-xs">
                                  <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                  <span>FECHADO NO MOMENTO</span>
                                </span>
                              }
                            </div>
                          </div>
                        </div>

                        <div class="flex gap-1">
                          <button 
                            type="button" 
                            (click)="ecosystem.sendWhatsAppMessage('Compartilhar', '999', 'Veja que legal essa loja no 3EAT: ' + store.name)"
                            class="w-8 h-8 rounded-xl bg-emerald-950/20 hover:bg-emerald-900/30 text-emerald-500 flex items-center justify-center border border-emerald-500/20 transition-all cursor-pointer" 
                            title="Compartilhar via WhatsApp">
                            <mat-icon class="text-sm">share</mat-icon>
                          </button>
                          <button type="button" class="w-8 h-8 rounded-xl bg-[#ebdcc7] hover:bg-[#decbb4] text-stone-800 flex items-center justify-center border border-[#d6c3aa]" title="Favoritar">
                            <mat-icon class="text-sm">star_border</mat-icon>
                          </button>
                        </div>
                      </div>

                      <!-- Address & Info Box -->
                      <div class="bg-[#f5ebd9] border border-[#e6d8be] rounded-xl p-3 space-y-1 my-3 text-xs">
                        <div class="flex justify-between text-[10px] font-mono text-amber-900 font-bold uppercase">
                          <span>LOCAL</span>
                          <span>DISTÂNCIA: {{ ecosystem.calculateDistanceToUser(store.lat, store.lng) }} km</span>
                        </div>
                        <div class="text-stone-700 text-xs font-medium truncate">
                          {{ store.address.street }}, {{ store.address.number }} - {{ store.address.neighborhood }}
                        </div>
                        <!-- Delivery Rules Pills -->
                        <div class="flex flex-wrap items-center gap-2 pt-1 border-t border-[#e0d0b6] text-[10px] font-mono font-bold">
                          <span class="text-amber-900">
                            Entrega: {{ (store.deliveryFee ?? 0) === 0 ? 'Grátis' : 'R$ ' + (store.deliveryFee || 0).toFixed(2) }}
                          </span>
                          <span class="text-stone-600">•</span>
                          <span class="text-amber-900">
                            Min: R$ {{ (store.minOrderValue || 0).toFixed(2) }}
                          </span>
                          <span class="text-stone-600">•</span>
                          <span [class]="store.deliveryFleetType === 'own' ? 'text-emerald-800' : 'text-purple-800'">
                            {{ store.deliveryFleetType === 'own' ? '🛵 Frota Própria' : '⚡ Frota 3EAT' }}
                          </span>
                        </div>
                      </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="grid grid-cols-2 gap-2 pt-2 border-t border-[#e8dfce]">
                      <button
                        type="button"
                        (click)="inspectFicha(store)"
                        class="bg-[#ebdcc7] hover:bg-[#decbb4] text-stone-800 font-bold py-2.5 px-3 rounded-xl border border-[#d6c3aa] text-xs transition-all text-center cursor-pointer">
                        Examinar
                      </button>

                      <button
                        type="button"
                        (click)="ecosystem.openStorefront(store.id)"
                        class="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-extrabold py-2.5 px-3 rounded-xl shadow-md border border-amber-400/50 text-xs transition-all text-center cursor-pointer flex items-center justify-center gap-1">
                        <span>Abrir Vitrine</span>
                        <mat-icon class="text-xs">arrow_forward</mat-icon>
                      </button>
                    </div>

                  </div>
                }
              </div>
            }

            <!-- VIEW 2: LIVRO-RAZÃO (EXACT REPLICATION OF screenshot marketplace 3eatcru.jpg) -->
            @if (viewMode() === 'livro-razao') {
              <div class="bg-[#fcfaf4] border border-[#ded4c2] rounded-2xl p-5 shadow-xl text-stone-900 space-y-4 relative overflow-hidden"
                   style="background-image: radial-gradient(#e5dbc9 1px, transparent 1px); background-size: 16px 16px;">
                
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-[#dcd0bb]">
                  <div>
                    <div class="flex items-center gap-2">
                      <mat-icon class="text-amber-800 text-base">menu_book</mat-icon>
                      <h3 class="font-serif font-black text-stone-900 text-sm uppercase tracking-wider">
                        LIVRO-RAZÃO DOS NEGÓCIOS CREDENCIADOS
                      </h3>
                      <span class="border border-dashed border-amber-600 text-amber-800 bg-amber-100 px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase">
                        EXERCÍCIO CORRENTE
                      </span>
                    </div>
                    <p class="text-[11px] text-stone-600 font-serif italic mt-0.5">
                      Registro oficial descentralizado de estabelecimentos, raios geodésicos e disponibilidade operacional.
                    </p>
                  </div>

                  <div class="text-xs font-mono font-bold text-stone-700 bg-[#eee5d3] px-3 py-1 rounded-lg border border-[#ded0b8]">
                    Total Registrado: {{ filteredTenants().length }} fichas
                  </div>
                </div>

                <!-- TABLE OF REGISTERED TENANTS -->
                <div class="overflow-x-auto">
                  <table class="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr class="border-b-2 border-[#d0c2a8] text-[10px] font-mono font-bold uppercase tracking-wider text-amber-950">
                        <th class="py-2.5 px-3">Nº FICHA</th>
                        <th class="py-2.5 px-3">ESTABELECIMENTO</th>
                        <th class="py-2.5 px-3">RAMO / CATEGORIA</th>
                        <th class="py-2.5 px-3">DISTÂNCIA</th>
                        <th class="py-2.5 px-3">EXPEDIENTE</th>
                        <th class="py-2.5 px-3">MODALIDADES</th>
                        <th class="py-2.5 px-3">NOTA</th>
                        <th class="py-2.5 px-3 text-right">AÇÕES</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-[#e8dfce]">
                      @for (store of filteredTenants(); track store.id) {
                        <tr class="hover:bg-[#f2e8d5] transition-colors">
                          <td class="py-3 px-3 font-mono font-bold text-amber-900">
                            #{{ store.fichaCode || '001' }}
                          </td>

                          <td class="py-3 px-3">
                            <div class="flex items-center gap-3">
                              <img [src]="store.logo || store.coverImage" [alt]="store.name" class="w-8 h-8 rounded-lg object-cover border border-[#d6c7b0]" referrerpolicy="no-referrer">
                              <div>
                                <div class="font-bold text-stone-900">{{ store.name }}</div>
                                <div class="text-[10px] text-stone-500">{{ store.address.street }}, {{ store.address.number }} - {{ store.address.neighborhood }}</div>
                              </div>
                            </div>
                          </td>

                          <td class="py-3 px-3">
                            <span class="border border-dashed border-amber-700 text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase">
                              {{ store.badgeCategory || 'RESTAURANTES' }}
                            </span>
                          </td>

                          <td class="py-3 px-3 font-mono font-bold text-stone-800">
                            {{ ecosystem.calculateDistanceToUser(store.lat, store.lng) }} km
                          </td>

                          <td class="py-3 px-3">
                            <span [class]="store.isOpen ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'" class="text-[11px] flex items-center gap-1">
                              <span [class]="store.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'" class="w-2 h-2 rounded-full inline-block"></span>
                              {{ store.isOpen ? 'Aberto Agora' : 'Fechado' }}
                            </span>
                          </td>

                          <td class="py-3 px-3">
                            <div class="flex items-center gap-1.5 text-stone-700">
                              @if (store.supportsDelivery) { <mat-icon class="text-sm" title="Delivery">delivery_dining</mat-icon> }
                              @if (store.supportsTakeout) { <mat-icon class="text-sm" title="Balcão">storefront</mat-icon> }
                            </div>
                          </td>

                          <td class="py-3 px-3 font-bold text-amber-700 flex items-center gap-1">
                            <mat-icon class="text-xs text-amber-500">star</mat-icon>
                            {{ store.rating }}
                          </td>

                          <td class="py-3 px-3 text-right">
                            <div class="flex justify-end gap-1.5">
                              <button
                                type="button"
                                (click)="inspectFicha(store)"
                                class="bg-[#ebdcc7] hover:bg-[#decbb4] text-stone-800 font-bold px-2.5 py-1 rounded-lg border border-[#d6c3aa] text-[11px] cursor-pointer">
                                Ficha
                              </button>
                              <button
                                type="button"
                                (click)="ecosystem.openStorefront(store.id)"
                                class="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-extrabold px-3 py-1 rounded-lg border border-amber-400/50 text-[11px] shadow cursor-pointer">
                                Entrar →
                              </button>
                            </div>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            }

            <!-- VIEW 3: MESA CARTOGRÁFICA (TACTICAL MAP IN PARCHMENT STYLE) -->
            @if (viewMode() === 'mesa-cartografica') {
              <div class="bg-[#faf7f0] border border-[#ded4c2] rounded-2xl p-5 shadow-xl text-stone-900 space-y-4">
                <div class="flex items-center justify-between border-b border-[#e8dfce] pb-3">
                  <div class="flex items-center gap-2">
                    <mat-icon class="text-amber-700">explore</mat-icon>
                    <h3 class="font-serif font-black text-stone-900 text-base">Mesa Cartográfica - Projeção Geodésica</h3>
                  </div>
                  <span class="text-xs font-mono font-bold text-stone-600">Raio: {{ ecosystem.maxDiscoveryRadiusKm() }} km</span>
                </div>

                <div class="relative w-full h-[450px] bg-[#f5ebd9] rounded-xl border border-[#e6d8be] overflow-hidden shadow-inner">
                  <div #mapContainer class="w-full h-full grayscale sepia contrast-[1.1] opacity-90"></div>
                  
                  <!-- Tactical Legend Overlay -->
                  <div class="absolute top-4 right-4 z-[1000] bg-[#faf7f0]/90 backdrop-blur border border-[#ded4c2] p-3 rounded-xl shadow-lg pointer-events-none">
                    <div class="flex items-center gap-2 mb-2">
                       <div class="w-2 h-2 rounded-full bg-amber-600 animate-pulse"></div>
                       <span class="text-[9px] font-black uppercase text-amber-900 tracking-widest">Triangulação Ativa</span>
                    </div>
                    <div class="space-y-1.5">
                       <div class="flex items-center gap-2 text-[8px] font-bold text-stone-600">
                          <span class="w-3 h-3 rounded-full bg-amber-500 border border-stone-800"></span>
                          <span>BALCÃO COMERCIAL</span>
                       </div>
                       <div class="flex items-center gap-2 text-[8px] font-bold text-stone-600">
                          <span class="w-3 h-3 rounded-full bg-amber-600 border border-stone-900 flex items-center justify-center text-white"><mat-icon class="text-[6px]">my_location</mat-icon></span>
                          <span>VOCÊ (ORIGEM)</span>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            }

          </div>

        </div>

        <!-- DISCRETE FOOTER CTA FOR MERCHANTS / PARTNERS -->
        <div class="mt-8 bg-gradient-to-r from-[#1b0d06] via-[#241208] to-[#1b0d06] border border-[#482814] rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-3.5 text-left">
            <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <mat-icon class="text-xl">storefront</mat-icon>
            </div>
            <div>
              <h4 class="font-serif font-black text-white text-sm">Você tem um negócio? Conheça o 3eatcru OS</h4>
              <p class="text-xs text-stone-400 leading-tight">
                PDV Frente de Caixa, Comandas KDS, Controle de Estoque NFe e Cardápio Integrado ao Marketplace da Região.
              </p>
            </div>
          </div>
          <button
            type="button"
            (click)="router.navigate(['/para-lojistas'])"
            class="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95 whitespace-nowrap shrink-0">
            <span>Apresentação Comercial &amp; Cadastro</span>
            <mat-icon class="text-xs">arrow_forward</mat-icon>
          </button>
        </div>

      </div>

      <!-- INSPECT FICHA MODAL (PARCHMENT STYLE) -->
      @if (inspectedStore(); as store) {
        <div class="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-[#faf7f0] border border-[#ded4c2] rounded-3xl max-w-xl w-full p-6 text-stone-900 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div class="flex justify-between items-start pb-3 border-b border-[#e8dfce]">
              <div class="flex items-center gap-3">
                <img [src]="store.logo || store.coverImage" [alt]="store.name" class="w-14 h-14 rounded-2xl object-cover border border-[#d6c7b0]" referrerpolicy="no-referrer">
                <div>
                  <span class="border border-dashed border-amber-700 text-amber-800 bg-amber-100 px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase">
                    {{ store.badgeCategory || store.category }} • FICHA #{{ store.fichaCode || '001' }}
                  </span>
                  <h3 class="font-serif font-black text-xl text-stone-900 mt-1">{{ store.name }}</h3>
                  <div class="text-xs text-stone-500 font-medium">{{ store.tagline || (store.badgeCategory || store.category) }}</div>
                </div>
              </div>
              <button type="button" (click)="inspectedStore.set(null)" class="text-stone-400 hover:text-stone-800 font-bold text-lg">✕</button>
            </div>

            <div class="space-y-2 text-xs">
              <!-- Aberto / Fechado status in Inspect Modal -->
              <div class="bg-[#f5ebd9] border border-[#e6d8be] rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div class="font-bold text-amber-900">Expediente Operacional:</div>
                  <div class="flex items-center gap-1.5 mt-0.5 font-bold" [class]="store.isOpen ? 'text-emerald-800' : 'text-rose-800'">
                    <span class="w-2 h-2 rounded-full" [class]="store.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'"></span>
                    <span>{{ store.isOpen ? 'ABERTO AGORA PARA PEDIDOS' : 'FECHADO NO MOMENTO' }}</span>
                  </div>
                </div>
              </div>

              <div class="bg-[#f5ebd9] border border-[#e6d8be] rounded-xl p-3 space-y-1">
                <div class="font-bold text-amber-900">Endereço &amp; Localização:</div>
                <div>{{ store.address.street }}, {{ store.address.number }} - {{ store.address.neighborhood }}</div>
                <div class="text-stone-500">Distância calculada: {{ ecosystem.calculateDistanceToUser(store.lat, store.lng) }} km</div>
              </div>

              <div class="bg-[#f5ebd9] border border-[#e6d8be] rounded-xl p-3 space-y-1">
                <div class="font-bold text-amber-900">Atendimento &amp; Telefone:</div>
                <div>Horário: {{ store.openingHours }}</div>
                <div>Telefone: {{ store.phone }}</div>
              </div>
            </div>

            <div class="flex gap-3 pt-2 border-t border-[#e8dfce]">
              <button
                type="button"
                (click)="inspectedStore.set(null)"
                class="flex-1 bg-[#ebdcc7] hover:bg-[#decbb4] text-stone-800 font-bold py-3 rounded-xl border border-[#d6c3aa] text-xs">
                Fechar
              </button>

              <button
                type="button"
                (click)="openStoreFromModal(store.id)"
                class="flex-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-extrabold py-3 rounded-xl shadow-lg border border-amber-400/50 text-xs flex items-center justify-center gap-1">
                <span>Abrir Vitrine Pública</span>
                <mat-icon class="text-sm">arrow_forward</mat-icon>
              </button>
            </div>
          </div>
        </div>
      }

      <!-- REUSABLE CONSUMER PROFILE & AUTH MODAL -->
      @if (showConsumerModal()) {
        <div class="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div class="w-full max-w-xl max-h-[92vh] overflow-y-auto">
            <app-consumer-profile [isModal]="true" (closeProfile)="showConsumerModal.set(false)"></app-consumer-profile>
          </div>
        </div>
      }

    </div>
  `
})
export class RegionalMarketplaceComponent {
  readonly ecosystem = inject(EcosystemService);
  private readonly fb = inject(FormBuilder);
  readonly router = inject(Router);
  readonly Math = Math;

  // Map state
  private readonly mapContainer = viewChild<ElementRef>('mapContainer');
  private map: any = null;
  private markersLayer: any = null;
  private L: any = null;

  constructor() {
    this.ecosystem.syncMarketplaceFromBackend();
    afterNextRender(async () => {
      this.L = (await import('leaflet')).default;
      this.initMap();
    });

    effect(() => {
      const mode = this.viewMode();
      this.filteredTenants(); // Access to trigger effect dependency
      if (mode === 'mesa-cartografica' && this.map && this.L) {
        setTimeout(() => {
          this.map?.invalidateSize();
          this.updateMapMarkers();
        }, 100);
      }
    });
  }

  private initMap() {
    const container = this.mapContainer()?.nativeElement;
    if (!container || !this.L) return;

    const tileUrl = 'https://tiles.openfreemap.org/styles/liberty/{z}/{x}/{y}.png';

    this.map = this.L.map(container, {
      center: [-23.5651, -46.6521], // Avenida Paulista, SP
      zoom: 14,
      zoomControl: false,
      attributionControl: false
    });

    this.L.tileLayer(tileUrl).addTo(this.map);
    this.markersLayer = this.L.layerGroup().addTo(this.map);
  }

  private updateMapMarkers() {
    if (!this.map || !this.L) return;
    this.markersLayer.clearLayers();

    const bounds: any[] = [];

    // Reference Point
    const refIcon = this.L.divIcon({
      className: 'ref-icon',
      html: `<div class="w-7 h-7 rounded-full bg-amber-600 border-2 border-stone-900 flex items-center justify-center text-white shadow-lg animate-pulse"><i class="material-icons text-base">my_location</i></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
    const refLatLng: [number, number] = [-23.5651, -46.6521];
    this.L.marker(refLatLng, { icon: refIcon }).addTo(this.markersLayer);
    bounds.push(refLatLng);

    // Store markers
    this.filteredTenants().forEach(store => {
      if (store.lat && store.lng) {
        const storeLatLng: [number, number] = [store.lat, store.lng];
        const icon = this.L.divIcon({
          className: 'store-marker-icon',
          html: `
            <div class="relative group">
              <div class="w-10 h-10 rounded-2xl bg-[#faf7f0] border-2 border-amber-600 shadow-xl flex items-center justify-center overflow-hidden transform hover:scale-110 transition-transform">
                <img src="${store.logo || store.coverImage}" class="w-full h-full object-cover" referrerpolicy="no-referrer">
              </div>
              <div class="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border border-stone-900 rounded-full"></div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });

        const marker = this.L.marker(storeLatLng, { icon }).addTo(this.markersLayer);
        marker.on('click', () => this.inspectFicha(store));
        bounds.push(storeLatLng);
      }
    });

    if (bounds.length > 1) {
      this.map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      this.map.setView(refLatLng, 14);
    }
  }

  readonly viewMode = signal<CatalogViewMode>('fichario');
  readonly selectedCategory = signal<string>('all');
  readonly searchQuery = signal<string>('');
  readonly sortCriteria = signal<SortOption>('rating');
  readonly statusFilter = signal<'all' | 'open' | 'closed'>('all');

  readonly totalStoresCount = computed(() => this.ecosystem.tenants().length);
  readonly openStoresCount = computed(() => this.ecosystem.tenants().filter(t => t.isOpen).length);
  readonly closedStoresCount = computed(() => this.ecosystem.tenants().filter(t => !t.isOpen).length);

  readonly searchAddressValue = signal<string>('');
  readonly isAcquiringGps = signal<boolean>(false);

  readonly filterDelivery = signal<boolean>(false);
  readonly filterTakeout = signal<boolean>(false);
  readonly filterReservation = signal<boolean>(false);
  readonly filterOpenNow = signal<boolean>(false);

  readonly inspectedStore = signal<CompanyTenant | null>(null);
  readonly showConsumerModal = signal<boolean>(false);
  readonly consumerModalTab = signal<'select' | 'register'>('select');

  readonly consumerForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required]],
    cpf: [''],
    primaryAddress: ['', [Validators.required]],
    neighborhood: ['', [Validators.required]],
    city: ['São Paulo', [Validators.required]]
  });

  readonly filters = [
    { label: 'Suporta Entrega (Delivery)', icon: 'delivery_dining', signal: this.filterDelivery },
    { label: 'Suporta Retirada no Balcão', icon: 'storefront', signal: this.filterTakeout },
    { label: 'Aceita Agendamento de Mesa / Horário', icon: 'event_available', signal: this.filterReservation },
    { label: 'Aberto Agora (Funcionamento Ativo)', icon: 'schedule', signal: this.filterOpenNow }
  ];

  readonly categories = [
    { id: 'all', label: 'Todos', icon: '' },
    { id: 'restaurant', label: 'Restaurantes', icon: 'restaurant' },
    { id: 'retail', label: 'Varejo', icon: 'shopping_bag' },
    { id: 'services', label: 'Serviços', icon: 'handyman' },
    { id: 'other', label: 'Outros', icon: 'folder' }
  ];

  filteredTenants = computed(() => {
    let list = this.ecosystem.tenants();
    const cat = this.selectedCategory();
    const query = this.searchQuery().toLowerCase().trim();
    const maxRadius = this.ecosystem.maxDiscoveryRadiusKm();

    if (cat !== 'all') {
      if (cat === 'other') {
        list = list.filter(t => t.category !== 'restaurant' && t.category !== 'retail' && t.category !== 'services');
      } else {
        list = list.filter(t => t.category === cat);
      }
    }

    if (query) {
      list = list.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.legalName.toLowerCase().includes(query) ||
        t.tagline?.toLowerCase().includes(query) ||
        t.address.neighborhood.toLowerCase().includes(query)
      );
    }

    list = list.filter(t => {
      const dist = this.ecosystem.calculateDistanceToUser(t.lat, t.lng);
      return dist <= maxRadius;
    });

    if (this.filterDelivery()) list = list.filter(t => t.supportsDelivery);
    if (this.filterTakeout()) list = list.filter(t => t.supportsTakeout);
    if (this.filterReservation()) list = list.filter(t => t.supportsReservation);
    if (this.filterOpenNow()) list = list.filter(t => t.isOpen);

    const sFilter = this.statusFilter();
    if (sFilter === 'open') {
      list = list.filter(t => t.isOpen);
    } else if (sFilter === 'closed') {
      list = list.filter(t => !t.isOpen);
    }

    const sort = this.sortCriteria();
    return [...list].sort((a, b) => {
      if (sort === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sort === 'distance') return this.ecosystem.calculateDistanceToUser(a.lat, a.lng) - this.ecosystem.calculateDistanceToUser(b.lat, b.lng);
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'fee') return (a.deliveryFee || 0) - (b.deliveryFee || 0);
      return 0;
    });
  });

  readonly isMerchant = computed(() => {
    const role = this.ecosystem.currentSession()?.role;
    return role === 'operator' || role === 'tenant_owner' || role === 'waiter';
  });

  onRadiusChange(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.ecosystem.maxDiscoveryRadiusKm.set(parseInt(val, 10));
  }

  async useLiveGps() {
    this.isAcquiringGps.set(true);
    await this.ecosystem.requestRealUserLocation();
    this.isAcquiringGps.set(false);
  }

  applyAddressSearch(val: string) {
    if (!val) return;
    this.ecosystem.userReferenceAddress.set(val);
    this.ecosystem.notify(`Endereço de referência atualizado: ${val}`, 'info');
  }

  inspectFicha(store: CompanyTenant) {
    this.inspectedStore.set(store);
  }

  openStoreFromModal(tenantId: string) {
    this.inspectedStore.set(null);
    this.ecosystem.openStorefront(tenantId);
  }

  isSpotlight(tenantId: string): boolean {
    return this.ecosystem.regionalConfig().featuredTenantIds.includes(tenantId);
  }

  submitConsumerRegistration() {
    if (this.consumerForm.invalid) {
      this.consumerForm.markAllAsTouched();
      return;
    }
    const val = this.consumerForm.value;
    this.ecosystem.registerConsumer({
      name: val.name!,
      email: val.email!,
      phone: val.phone!,
      cpf: val.cpf || '000.000.000-00',
      primaryAddress: val.primaryAddress!,
      neighborhood: val.neighborhood!,
      city: val.city!
    });
    this.consumerForm.reset({ city: 'São Paulo' });
    this.showConsumerModal.set(false);
  }

  selectActiveConsumer(account: ConsumerAccount) {
    this.ecosystem.activeConsumer.set(account);
    this.ecosystem.notify(`Conta de consumidor alterada para: ${account.name}`, 'info');
    this.showConsumerModal.set(false);
  }

  logoutConsumer() {
    this.ecosystem.activeConsumer.set(null);
    this.ecosystem.notify('Sessão do consumidor encerrada.', 'info');
  }
}



