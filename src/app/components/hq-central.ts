import { ChangeDetectionStrategy, Component, effect, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { EcosystemService } from '../services/ecosystem.service';
import { SecurityService } from '../services/security.service';
import { CompanyTenant } from '../models/ecosystem.model';

// Sub-modules
import { HqRegionalManagerComponent } from './hq/hq-regional-manager';
import { HqAppsPreviewComponent } from './hq/hq-apps-preview';
import { HqTenantGovernanceModalComponent } from './hq/hq-tenant-governance-modal';
import { HqDocumentationModalComponent } from './hq/hq-documentation-modal';
import { HqPlansPricingComponent } from './hq/hq-plans-pricing';
import { HqTenantsListComponent } from './hq/hq-tenants-list';
import { HqDevicesListComponent } from './hq/hq-devices-list';
import { HqLedgerComponent } from './hq/hq-ledger';
import { HqAuditComponent } from './hq/hq-audit';
import { HqSystemConfigComponent } from './hq/hq-system-config';
import { HqCrmComponent } from './hq/hq-crm';
import { HqBillingComponent } from './hq/hq-billing';

import { HqEappsCatalogComponent } from './hq/hq-eapps-catalog';

export type HQSubTab = 'tenants' | 'eapps' | 'devices' | 'apps_preview' | 'ledger' | 'regional' | 'consumers' | 'audit' | 'system' | 'plans' | 'billing';

interface CommandItem {
  id: HQSubTab;
  label: string;
  icon: string;
  sub: string;
  group: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-hq-central',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    HqRegionalManagerComponent,
    HqEappsCatalogComponent,
    HqAppsPreviewComponent,
    HqTenantGovernanceModalComponent,
    HqDocumentationModalComponent,
    HqPlansPricingComponent,
    HqTenantsListComponent,
    HqDevicesListComponent,
    HqLedgerComponent,
    HqAuditComponent,
    HqSystemConfigComponent,
    HqCrmComponent,
    HqBillingComponent
  ],
  host: {
    '(window:keydown)': 'onWindowKeydown($event)'
  },
  template: `
    <!-- SMARTPHONE MOBILE WARNING BARRIER (EXCLUSIVO PARA DESKTOP & TABLET) -->
    @if (!bypassMobileWarning()) {
      <div class="block md:hidden min-h-screen bg-[#0e0805] text-stone-200 p-5 font-sans flex flex-col justify-between">
        <div class="space-y-6 max-w-md mx-auto pt-4">
          <div class="flex items-center justify-between border-b border-[#3d200f] pb-4">
            <div class="flex items-center gap-2.5">
              <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-600 to-amber-600 text-white flex items-center justify-center font-black shadow-lg">
                <mat-icon class="text-xl">security</mat-icon>
              </div>
              <div>
                <div class="font-serif font-black text-rose-400 text-sm tracking-wider">HQ CENTRAL</div>
                <div class="text-[9px] font-mono text-stone-400 font-bold uppercase tracking-widest">GOVERNANÇA DO ECOSSISTEMA</div>
              </div>
            </div>
            <span class="bg-rose-950/80 text-rose-300 border border-rose-700/60 text-[9px] font-mono px-2.5 py-1 rounded-full uppercase font-bold">
              Desktop &amp; Tablet
            </span>
          </div>

          <div class="bg-[#1b0d06] border-2 border-rose-600/70 rounded-3xl p-5 shadow-2xl relative overflow-hidden space-y-4">
            <div class="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <mat-icon class="text-3xl">desktop_windows</mat-icon>
            </div>
            <div class="space-y-2">
              <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400 block">
                DIRETRIZ DE ARQUITETURA
              </span>
              <h2 class="font-serif font-black text-xl text-white leading-tight">
                HQ Central Exclusivo para Computadores e Tablets
              </h2>
              <p class="text-xs text-stone-300 leading-relaxed font-sans">
                O <strong>HQ Central</strong> é o console de governança do ecossistema: tenants, planos, inventário de dispositivos e preparação do futuro processo de entregas da plataforma.
              </p>
              <p class="text-[11px] text-stone-400 leading-relaxed font-sans">
                Devido à alta densidade analítica e governança crítica, a interface completa exige telas a partir de <strong>768px (Tablets em modo paisagem e Computadores Desktop)</strong>.
              </p>
            </div>
          </div>

          <div class="space-y-2.5">
            <button
              type="button"
              (click)="router.navigate(['/home'])"
              class="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black py-4 px-5 rounded-2xl shadow-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer active:scale-95 transition-all">
              <mat-icon class="text-base">storefront</mat-icon>
              <span>Ir para o Portal do Consumidor (/home)</span>
            </button>

            <button
              type="button"
              (click)="router.navigate(['/para-lojistas'])"
              class="w-full bg-[#201007] hover:bg-[#2e170b] text-amber-300 border border-[#482814] font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs cursor-pointer transition-all">
              <mat-icon class="text-sm text-amber-400">business</mat-icon>
              <span>Conhecer o 3eatcru OS para Lojistas</span>
            </button>

            <button
              type="button"
              (click)="bypassMobileWarning.set(true)"
              class="w-full bg-stone-900/60 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-800 text-[10px] font-mono py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer">
              <mat-icon class="text-xs">visibility</mat-icon>
              <span>Acessar Console mesmo em Smartphone (Modo Emergência)</span>
            </button>
          </div>
        </div>
      </div>
    }

    <!-- DESKTOP / TABLET CONSOLE (OU MODO BYPASS) -->
    <div [class]="bypassMobileWarning() ? 'block' : 'hidden md:block'" class="min-h-screen bg-[#0e0e10] text-[#edeeef] p-4 sm:p-6 font-geist selection:bg-amber-600 selection:text-white relative overflow-x-hidden">
      
      <div class="max-w-[1680px] mx-auto grid grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)] gap-5 xl:gap-7 relative z-10">

        <aside class="hidden lg:block min-w-0" aria-label="Menu lateral do HQ Central">
          <div class="sticky top-5 max-h-[calc(100vh-2.5rem)] overflow-y-auto rounded-2xl border border-white/10 bg-[#141417] p-4 shadow-xl custom-scrollbar">
            <div class="flex items-center gap-3 border-b border-white/10 pb-4">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-stone-950">
                <mat-icon>security</mat-icon>
              </div>
              <div class="min-w-0">
                <p class="font-syne text-sm font-extrabold uppercase tracking-wide text-white">HQ Central</p>
                <p class="mt-0.5 text-[10px] text-stone-400">Governança da plataforma</p>
              </div>
            </div>

            <nav class="mt-5 space-y-5" aria-label="Áreas administrativas">
              @for (group of navigationGroups; track group.label) {
                <section>
                  <h2 class="mb-2 px-2 text-[9px] font-bold uppercase tracking-[0.16em] text-stone-500">{{ group.label }}</h2>
                  <div class="space-y-1">
                    @for (tab of group.items; track tab.id) {
                      <button
                        type="button"
                        (click)="activeSubTab.set(tab.id)"
                        [attr.aria-current]="activeSubTab() === tab.id ? 'page' : null"
                        [class]="activeSubTab() === tab.id ? 'bg-amber-500 text-stone-950 shadow-lg' : 'text-stone-300 hover:bg-white/5 hover:text-white'"
                        class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
                        <mat-icon class="shrink-0 text-base">{{ tab.icon }}</mat-icon>
                        <span class="min-w-0 flex-1 truncate">{{ tab.label }}</span>
                        @if (tab.id === 'ledger') {
                          <span class="rounded bg-stone-950/10 px-1.5 py-0.5 text-[8px] font-bold uppercase">Em breve</span>
                        }
                      </button>
                    }
                  </div>
                </section>
              }
            </nav>

            <div class="mt-5 rounded-xl border border-white/10 bg-black/20 p-3 text-[10px] text-stone-400">
              <span class="font-bold text-stone-300">Atalho de navegação</span>
              <span class="mt-1 block"><kbd class="rounded border border-white/10 px-1.5 py-0.5 text-stone-300">Ctrl</kbd> + <kbd class="rounded border border-white/10 px-1.5 py-0.5 text-stone-300">K</kbd> abre a busca de áreas.</span>
            </div>
          </div>
        </aside>

        <main class="min-w-0 space-y-5">
        
        <!-- HEADER COMMAND BANNER (VARIATION 8 MASTER CONSOLE) -->
        <header class="bg-[#16161a] border border-white/10 rounded-2xl p-5 lg:p-6 shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
          <div class="flex items-center gap-4 relative z-10">
            <div class="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center text-stone-950 font-bold shadow-lg">
              <mat-icon class="text-2xl">security</mat-icon>
            </div>
            <div>
              <div class="flex items-center gap-2 mb-1">
                <h1 class="text-2xl sm:text-3xl font-syne font-extrabold uppercase tracking-tight text-white leading-none">
                  HQ Central
                </h1>
                <span class="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-mono-code font-bold uppercase">
                  GABINETE MASTER
                </span>
              </div>
              <p class="text-stone-400 text-xs font-geist max-w-xl">
                Governança multi-tenant, planos, inventário de dispositivos e configuração do recurso futuro de entregas da plataforma.
              </p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-3 relative z-10">
            <div [class]="security.isRealMode() ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'" class="border px-3 py-2 rounded-lg text-[11px] font-mono-code font-bold flex items-center gap-2 shadow">
              <mat-icon class="text-sm">{{ security.isRealMode() ? 'cloud_done' : 'science' }}</mat-icon>
              <span>{{ security.isRealMode() ? 'MODO REAL (PRODUÇÃO)' : 'SIMULAÇÃO (EM MEMÓRIA)' }}</span>
            </div>

            <button
              type="button"
              (click)="toggleExecutionMode()"
              [disabled]="isChangingExecutionMode()"
              class="bg-white/5 border border-white/10 text-stone-200 hover:bg-white/10 font-mono-code text-xs font-bold py-2.5 px-3.5 rounded-lg flex items-center gap-2 cursor-pointer transition-all shadow disabled:cursor-wait disabled:opacity-50">
              <mat-icon class="text-sm">sync_alt</mat-icon>
              <span>{{ isChangingExecutionMode() ? 'TROCANDO MODO…' : security.isRealMode() ? 'ATIVAR SIMULAÇÃO' : 'ATIVAR MODO REAL' }}</span>
            </button>

            <button
              type="button"
              (click)="showDocModal.set(true)"
              class="bg-white/5 hover:bg-white/10 text-stone-200 font-mono-code text-xs font-bold py-2.5 px-3 rounded-lg border border-white/10 flex items-center gap-1.5 cursor-pointer transition-all">
              <mat-icon class="text-sm">menu_book</mat-icon>
              <span>MANUAL</span>
            </button>

            <button
              type="button"
              (click)="openNewTenantModal()"
              class="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold py-2.5 px-5 rounded-lg shadow-lg flex items-center gap-2 text-xs font-geist transition-all cursor-pointer">
              <mat-icon class="text-base">add_business</mat-icon>
              <span>PROVISIONAR LOJA</span>
            </button>
          </div>
        </header>

        <!-- ARCHITECTURAL PILLAR CLARITY BANNER -->
        <div class="bg-[#111114] border border-amber-500/30 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div class="flex items-center gap-2 text-amber-300 font-mono-code">
            <mat-icon class="text-amber-400 text-sm">security</mat-icon>
            <span><strong>PILAR 1 ATIVO: HQ CENTRAL (GABINETE SAAS)</strong> — Governança global de lojistas; comissão de entregas da plataforma em breve.</span>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              (click)="router.navigate(['/os'])"
              class="bg-white/5 hover:bg-white/10 text-stone-200 border border-white/10 px-3 py-1.5 rounded-lg text-[10px] font-mono-code font-bold flex items-center gap-1 cursor-pointer">
              <mat-icon class="text-xs text-amber-400">desktop_windows</mat-icon>
              <span>Pilar 2 (Store OS)</span>
            </button>
            <button
              type="button"
              (click)="router.navigate(['/home'])"
              class="bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 px-3 py-1.5 rounded-lg text-[10px] font-mono-code font-bold flex items-center gap-1 cursor-pointer">
              <mat-icon class="text-xs text-emerald-400">storefront</mat-icon>
              <span>Pilar 3 (Marketplace)</span>
            </button>
          </div>
        </div>

        <nav class="lg:hidden flex items-center gap-2 overflow-x-auto rounded-xl border border-white/10 bg-[#16161a] p-2 no-scrollbar" aria-label="Áreas administrativas do HQ Central">
          @for (tab of subTabs; track tab.id) {
            <button
              type="button"
              (click)="activeSubTab.set(tab.id)"
              [attr.aria-current]="activeSubTab() === tab.id ? 'page' : null"
              [title]="tab.sub"
              [class]="activeSubTab() === tab.id ? 'bg-amber-500 text-stone-950' : 'bg-white/5 text-stone-300 hover:text-white border border-white/10'"
              class="shrink-0 rounded-lg px-3 py-2 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
              <mat-icon class="mr-1 align-middle text-sm">{{ tab.icon }}</mat-icon>{{ tab.label }}
            </button>
          }
        </nav>

        <!-- QUICK EXECUTIVE METRICS (VARIATION 8 STATS GRID) -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="bg-[#16161a] border border-white/10 rounded-xl p-5 shadow-lg">
            <span class="font-mono-code text-[10px] uppercase tracking-widest text-stone-400 block mb-1">Lojas ativas</span>
            <div class="font-syne text-2xl sm:text-3xl font-extrabold text-white my-1">{{ ecosystem.hqOverview()?.activeTenantsCount ?? '—' }}</div>
            <div class="font-mono-code text-[10px] text-emerald-400 flex items-center gap-1">
              <span>Contagem retornada pelo servidor</span>
            </div>
          </div>

          <div class="bg-[#16161a] border border-white/10 rounded-xl p-5 shadow-lg">
            <span class="font-mono-code text-[10px] uppercase tracking-widest text-stone-400 block mb-1">Comissão da plataforma</span>
            <div class="font-syne text-2xl sm:text-3xl font-extrabold text-emerald-400 my-1">
              {{ hqCommissionDisplay() }}
            </div>
            <div class="font-mono-code text-[10px] text-stone-400">
              @if (ecosystem.hqOverview()?.platformDeliveryCommissionStatus === 'coming_soon') {
                Recurso em breve; depende da rede própria de entregadores e da inteligência de operação.
              } @else {
                {{ ecosystem.hqOverview()?.platformDeliveryOrdersCount ?? 0 }} entrega(s) elegíveis; taxa atual {{ ecosystem.hqOverview()?.defaultCommissionPercent ?? '—' }}%
              }
            </div>
          </div>

          <div class="bg-[#16161a] border border-white/10 rounded-xl p-5 shadow-lg">
            <span class="font-mono-code text-[10px] uppercase tracking-widest text-stone-400 block mb-1">Cadastros marcados online</span>
            <div class="font-syne text-2xl sm:text-3xl font-extrabold text-white my-1">
              {{ ecosystem.hqOverview()?.deviceRecordsMarkedOnline ?? '—' }} <span class="text-stone-500 text-sm font-normal">/ {{ ecosystem.hqOverview()?.totalDevices ?? '—' }}</span>
            </div>
            <div class="font-mono-code text-[10px] text-amber-400">
              Estado salvo; não há telemetria de hardware
            </div>
          </div>

          <div class="bg-[#16161a] border border-white/10 rounded-xl p-5 shadow-lg">
            <span class="font-mono-code text-[10px] uppercase tracking-widest text-stone-400 block mb-1">Pedidos reais elegíveis</span>
            <div class="font-syne text-2xl sm:text-3xl font-extrabold text-white my-1">{{ ecosystem.hqOverview()?.totalOrders ?? '—' }}</div>
            <div class="font-mono-code text-[10px] text-stone-400">
              Soma de pedidos pagos ou concluídos
            </div>
          </div>
        </div>

        <!-- MAIN CONTROL CENTER: SUB-TABS (VARIATION 8 CONSOLE PANEL) -->
        <section class="min-h-[600px] rounded-2xl border border-white/10 bg-[#16161a] p-5 lg:p-6 shadow-2xl" aria-labelledby="hq-active-section-title">
          <header class="mb-5 flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p class="mb-1 text-[9px] font-bold uppercase tracking-[0.16em] text-amber-400">{{ activeTabInfo()?.group }}</p>
              <h2 id="hq-active-section-title" class="font-syne text-xl font-extrabold text-white">{{ activeTabInfo()?.label }}</h2>
              <p class="mt-1 max-w-3xl text-xs leading-relaxed text-stone-400">{{ activeTabInfo()?.sub }}</p>
            </div>
            <span class="shrink-0 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[9px] font-mono-code font-bold uppercase tracking-wider text-stone-400">Área administrativa</span>
          </header>

          @switch (activeSubTab()) {
            @case ('tenants') {
              <app-hq-tenants-list (openGovernance)="openTenantGovernance($event)" (inspectRemote)="inspectRemoteStoreOs($event)" />
            }
            @case ('eapps') {
              <app-hq-eapps-catalog />
            }
            @case ('apps_preview') {
              <app-hq-apps-preview />
            }
            @case ('plans') {
              <app-hq-plans-pricing />
            }
            @case ('billing') {
              <app-hq-billing />
            }
            @case ('devices') {
              <app-hq-devices-list (openRegisterModal)="showRegisterDeviceModal.set(true)" />
            }
            @case ('ledger') {
              <app-hq-ledger />
            }
            @case ('regional') {
              <app-hq-regional-manager />
            }
            @case ('consumers') {
              <app-hq-crm />
            }
            @case ('system') {
              <app-hq-system-config />
            }
            @case ('audit') {
              <app-hq-audit />
            }
          }

        </section>

        </main>
      </div>

      <!-- COMMAND PALETTE (CTRL+K) -->
      @if (showCommandPalette()) {
        <div class="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-start justify-center pt-24 p-4">
          <section class="bg-[#1d1008] border-2 border-amber-600/50 rounded-3xl max-w-xl w-full p-5 text-stone-200 space-y-4 shadow-2xl animate-in zoom-in-95" role="dialog" aria-modal="true" aria-labelledby="hq-command-title">
            <div class="flex items-center gap-3 bg-[#2b160b] border border-[#482814] rounded-2xl px-4 py-3">
              <mat-icon class="text-amber-500">search</mat-icon>
              <label for="hq-command-search" class="sr-only">Buscar área do HQ</label>
              <input 
                id="hq-command-search"
                [value]="commandSearchQuery()"
                (input)="commandSearchQuery.set($any($event.target).value)"
                type="text" 
                placeholder="Buscar lojas, cobrança, auditoria..."
                class="bg-transparent w-full text-sm text-white placeholder-stone-500 focus:outline-none">
              <button type="button" aria-label="Fechar busca" (click)="showCommandPalette.set(false)" class="text-[10px] font-mono bg-[#1a0e07] text-stone-400 px-2 py-1 rounded border border-[#4d2813] hover:text-white">ESC</button>
            </div>

            <div class="space-y-1.5 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
              <h2 id="hq-command-title" class="text-[10px] font-mono font-bold text-amber-500 uppercase px-2 pb-1">Navegação do HQ</h2>
              @for (cmd of filteredCommands(); track cmd.id) {
                <button (click)="selectCommand(cmd.id)" class="w-full text-left px-4 py-3 rounded-xl hover:bg-[#2b160b] flex items-center justify-between text-xs transition-all cursor-pointer border-none">
                  <div class="flex items-center gap-3">
                    <mat-icon class="text-amber-400 text-sm">{{ cmd.icon }}</mat-icon>
                    <span class="font-bold text-white">{{ cmd.label }}</span>
                  </div>
                  <span class="ml-3 font-mono text-[9px] text-stone-500">{{ cmd.group }}</span>
                </button>
              } @empty {
                <p class="rounded-xl px-4 py-6 text-center text-xs text-stone-400">Nenhuma área corresponde a essa busca.</p>
              }
            </div>
          </section>
        </div>
      }

      <!-- MODAL PROVISIONAR NOVA EMPRESA -->
      @if (showModal()) {
        <div class="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-[#faf7f0] border border-[#ded4c2] rounded-3xl max-w-lg w-full p-6 text-stone-950 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div class="flex justify-between items-center pb-3 border-b border-[#e8dfce]">
              <h3 class="font-serif font-black text-lg text-stone-900 flex items-center gap-2">
                <mat-icon class="text-amber-700">add_business</mat-icon> Provisionar Nova Unidade (Tenant)
              </h3>
              <button type="button" (click)="showModal.set(false)" class="text-stone-400 hover:text-stone-800 font-bold cursor-pointer">✕</button>
            </div>

            <div class="space-y-3 text-xs font-sans">
              <div>
                <label for="tName" class="block font-bold text-stone-800 mb-1 uppercase text-[10px]">Nome da Empresa / Razão Social</label>
                <input id="tName" [value]="newTenantName()" (input)="newTenantName.set($any($event.target).value)" type="text" placeholder="Ex: Padaria Estrela LTDA" class="w-full bg-white border border-[#d6c7b0] rounded-xl px-3 py-2 text-stone-950 focus:outline-none focus:border-amber-600 font-medium">
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="tCat" class="block font-bold text-stone-800 mb-1 uppercase text-[10px]">Segmento</label>
                  <select id="tCat" [value]="newTenantCategory()" (change)="newTenantCategory.set($any($event.target).value)" class="w-full bg-white border border-[#d6c7b0] rounded-xl px-3 py-2 text-stone-950 focus:outline-none cursor-pointer">
                    <option value="restaurant">Gastronomia</option>
                    <option value="retail">Varejo</option>
                    <option value="services">Serviços</option>
                  </select>
                </div>
                <div>
                  <label for="tPlan" class="block font-bold text-stone-800 mb-1 uppercase text-[10px]">Plano SaaS</label>
                  <select id="tPlan" [value]="newTenantPlan()" (change)="newTenantPlan.set($any($event.target).value)" class="w-full bg-white border border-[#d6c7b0] rounded-xl px-3 py-2 text-stone-950 focus:outline-none cursor-pointer font-bold text-amber-800">
                    <option value="Starter">Starter</option>
                    <option value="Professional">Professional</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>
              </div>

              <div>
                <label for="tCnpj" class="block font-bold text-stone-800 mb-1 uppercase text-[10px]">CNPJ Fiscal</label>
                <input id="tCnpj" [value]="newTenantCnpj()" (input)="newTenantCnpj.set($any($event.target).value)" type="text" placeholder="00.000.000/0001-00" class="w-full bg-white border border-[#d6c7b0] rounded-xl px-3 py-2 text-stone-950 focus:outline-none font-mono">
              </div>
            </div>

            <div class="flex gap-3 pt-4 border-t border-[#e8dfce]">
              <button (click)="showModal.set(false)" class="flex-1 bg-[#ebdcc7] text-stone-800 font-bold py-3 rounded-xl border border-[#d6c3aa] text-xs transition-all cursor-pointer">Cancelar</button>
              <button type="button" (click)="createTenant()" [disabled]="isProvisioningTenant() || !newTenantName().trim() || newTenantCnpjDigits().length !== 14" class="flex-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-stone-950 font-black py-3 rounded-xl shadow-lg text-xs uppercase transition-all active:scale-95 cursor-pointer disabled:opacity-50">{{ isProvisioningTenant() ? 'Salvando...' : 'Criar em período de teste' }}</button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL REGISTRAR DISPOSITIVO -->
      @if (showRegisterDeviceModal()) {
        <div class="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-[#faf7f0] border border-[#ded4c2] rounded-3xl max-w-lg w-full p-6 text-stone-950 space-y-4 shadow-2xl animate-in zoom-in-95">
             <div class="flex justify-between items-center pb-3 border-b border-[#e8dfce]">
               <h3 class="font-serif font-black text-lg text-stone-900 flex items-center gap-2">
                 <mat-icon class="text-amber-700">developer_board</mat-icon> Registro no inventário
               </h3>
               <button (click)="showRegisterDeviceModal.set(false)" class="text-stone-400 hover:text-stone-800 font-bold text-lg cursor-pointer">✕</button>
             </div>
             <div class="space-y-3 text-xs">
                <div>
                   <label for="devTargetTenant" class="block font-bold text-stone-800 mb-1 uppercase text-[10px]">Destino do Terminal</label>
                   <select id="devTargetTenant" [value]="newDeviceTenantId()" (change)="newDeviceTenantId.set($any($event.target).value)" class="w-full bg-white border border-[#d6c7b0] rounded-xl px-3 py-2 font-medium cursor-pointer">
                      <option value="">Selecione o destino</option>
                      <option value="hq">Infraestrutura HQ Central (inventário)</option>
                      @for (t of ecosystem.tenants(); track t.id) {
                        <option [value]="t.id">🏪 Loja: {{ t.name }}</option>
                      }
                   </select>
                </div>
                <div>
                   <label for="devNameInput" class="block font-bold text-stone-800 mb-1 uppercase text-[10px]">Nome do Terminal</label>
                   <input id="devNameInput" [value]="newDeviceName()" (input)="newDeviceName.set($any($event.target).value)" type="text" required class="w-full bg-white border border-[#d6c7b0] rounded-xl px-3 py-2">
                </div>
                <div>
                   <label for="devSerialInput" class="block font-bold text-stone-800 mb-1 uppercase text-[10px]">Serial (S/N)</label>
                   <input id="devSerialInput" [value]="newDeviceSerial()" (input)="newDeviceSerial.set($any($event.target).value)" type="text" required class="w-full bg-white border border-[#d6c7b0] rounded-xl px-3 py-2 font-mono">
                </div>
             </div>
             <p class="text-[10px] text-amber-900">Este cadastro não pareia o hardware nem valida o serial com o fabricante.</p>
             <button type="button" (click)="registerDevice()" [disabled]="!newDeviceTenantId() || !newDeviceName().trim() || !newDeviceSerial().trim()" class="w-full bg-amber-600 text-stone-950 font-black py-3 rounded-xl shadow-lg text-xs uppercase mt-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50">Registrar no inventário</button>
          </div>
        </div>
      }

      @if (selectedTenantForGovernance()) {
        <app-hq-tenant-governance-modal
          [tenant]="selectedTenantForGovernance()!"
          (dismiss)="selectedTenantForGovernance.set(null)"
        />
      }

      @if (showDocModal()) {
        <app-hq-documentation-modal
          (dismiss)="showDocModal.set(false)"
        />
      }

    </div>
  `
})
export class HQCentralComponent implements OnInit {
  readonly ecosystem = inject(EcosystemService);
  readonly security = inject(SecurityService);
  readonly router = inject(Router);

  readonly bypassMobileWarning = signal<boolean>(false);
  readonly isChangingExecutionMode = signal(false);
  readonly activeSubTab = signal<HQSubTab>('tenants');
  readonly showModal = signal<boolean>(false);
  readonly showRegisterDeviceModal = signal<boolean>(false);
  readonly showCommandPalette = signal<boolean>(false);
  readonly showDocModal = signal<boolean>(false);
  readonly selectedTenantForGovernance = signal<CompanyTenant | null>(null);

  readonly commandSearchQuery = signal<string>('');

  readonly newTenantName = signal<string>('');
  readonly newTenantCategory = signal<string>('restaurant');
  readonly newTenantCnpj = signal<string>('');
  readonly newTenantPlan = signal<string>('Professional');
  readonly newTenantCnpjDigits = computed(() => this.newTenantCnpj().replace(/\D/g, ''));
  readonly isProvisioningTenant = signal(false);

  readonly newDeviceTenantId = signal<string>('');
  readonly newDeviceName = signal<string>('');
  readonly newDeviceSerial = signal<string>('');
  readonly subTabs: CommandItem[] = [
    { id: 'tenants', label: 'Portfólio de lojas', icon: 'business', sub: 'Provisionamento, responsáveis e parâmetros administrativos das lojas.', group: 'Operação' },
    { id: 'devices', label: 'Dispositivos', icon: 'developer_board', sub: 'Inventário cadastrado; os estados não representam conexão física.', group: 'Operação' },
    { id: 'plans', label: 'Planos e preços', icon: 'payments', sub: 'Catálogo SaaS: preço mensal e cota; todos incluem o mesmo Store OS.', group: 'Financeiro' },
    { id: 'billing', label: 'Cobranças SaaS', icon: 'account_balance', sub: 'Assinaturas, checkouts e faturas confirmadas por webhook.', group: 'Financeiro' },
    { id: 'ledger', label: 'Comissão da plataforma', icon: 'schedule', sub: 'Comissão de entregas da rede da plataforma; processo em breve.', group: 'Financeiro' },
    { id: 'eapps', label: 'Catálogo de módulos', icon: 'apps', sub: 'Catálogo dos módulos do Store OS; não controla acesso por plano.', group: 'Ecossistema' },
    { id: 'apps_preview', label: 'Prévia de aplicativos', icon: 'smartphone', sub: 'Prévia simulada, sem operar dispositivos ou aplicativos reais.', group: 'Ecossistema' },
    { id: 'regional', label: 'Marketplace da plataforma', icon: 'public', sub: 'Portal público da plataforma: banner, praça, avisos, raio e destaques. A vitrine individual é editada pela loja em Minha Loja.', group: 'Ecossistema' },
    { id: 'consumers', label: 'Consumidores', icon: 'people', sub: 'Diretório limitado aos perfis retornados pelo servidor; sem métricas de vendas.', group: 'Ecossistema' },
    { id: 'system', label: 'Configurações globais', icon: 'settings_input_component', sub: 'Aviso global, manutenção visual e proteção da comissão futura.', group: 'Governança' },
    { id: 'audit', label: 'Auditoria estrutural', icon: 'security', sub: 'Varredura sob demanda de dados estruturais no escopo documentado.', group: 'Governança' }
  ];
  readonly navigationGroups: { label: string; items: CommandItem[] }[] = [
    { label: 'Lojas e operação', items: this.subTabs.filter((item) => item.group === 'Operação') },
    { label: 'Financeiro', items: this.subTabs.filter((item) => item.group === 'Financeiro') },
    { label: 'Ecossistema', items: this.subTabs.filter((item) => item.group === 'Ecossistema') },
    { label: 'Governança', items: this.subTabs.filter((item) => item.group === 'Governança') }
  ];
  readonly activeTabInfo = computed(() => this.subTabs.find((item) => item.id === this.activeSubTab()));
  readonly filteredCommands = computed(() => {
    const query = this.commandSearchQuery().trim().toLocaleLowerCase('pt-BR');
    if (!query) return this.subTabs;
    return this.subTabs.filter((item) =>
      `${item.label} ${item.group} ${item.sub}`.toLocaleLowerCase('pt-BR').includes(query)
    );
  });
  readonly hqCommissionDisplay = computed(() => {
    const overview = this.ecosystem.hqOverview();
    if (!overview) return '—';
    if (overview.platformDeliveryCommissionStatus === 'coming_soon') return 'Em breve';
    return overview.estimatedCommissionRevenue === null
      ? '—'
      : `R$ ${overview.estimatedCommissionRevenue.toFixed(2)}`;
  });

  constructor() {
    let lastRevision = this.security.executionModeRevision();
    effect(() => {
      const revision = this.security.executionModeRevision();
      if (revision === lastRevision) return;
      lastRevision = revision;
      this.showModal.set(false);
      this.showRegisterDeviceModal.set(false);
      this.showCommandPalette.set(false);
      this.showDocModal.set(false);
      this.selectedTenantForGovernance.set(null);
      this.commandSearchQuery.set('');
      this.newTenantName.set('');
      this.newTenantCnpj.set('');
      this.newTenantPlan.set('Professional');
      this.newDeviceTenantId.set('');
      this.newDeviceName.set('');
      this.newDeviceSerial.set('');
      this.isProvisioningTenant.set(false);
    });
  }

  ngOnInit() {
    this.security.setPillar('hq');
    const session = this.ecosystem.currentSession();
    if (!session || session.role !== 'hq_admin') {
      this.ecosystem.notify('Acesso restrito: O HQ Central é exclusivo do Dono do Aplicativo.', 'warning');
      this.router.navigate(['/hq/login']);
      return;
    }
    this.ecosystem.syncHqFromBackend();
  }

  async toggleExecutionMode() {
    if (this.isChangingExecutionMode()) return;
    this.isChangingExecutionMode.set(true);
    const targetMode = this.security.isRealMode() ? 'simulation' : 'real';
    try {
      const transition = this.security.setExecutionModeAndWait(
        targetMode,
        'hq_admin',
        'hq',
        '3EATCRU HQ Central'
      );
      this.ecosystem.resetForExecutionMode(targetMode === 'simulation');
      const session = await transition;
      this.security.setPillar('hq');

      if (targetMode === 'real' && session?.role !== 'hq_admin') {
        this.ecosystem.notify('Sua sessão real não tem acesso de administrador do HQ. Entre com uma conta hq_admin.', 'warning');
        this.router.navigate(['/hq/login']);
        return;
      }

      this.showCommandPalette.set(false);
      this.showModal.set(false);
      this.showRegisterDeviceModal.set(false);
      this.showDocModal.set(false);
      this.selectedTenantForGovernance.set(null);
      this.activeSubTab.set('tenants');

      const synced = await this.ecosystem.syncHqFromBackend();
      if (targetMode === 'real' && !synced) {
        this.ecosystem.notify('Modo real ativado, mas não foi possível carregar todos os dados do HQ.', 'error');
      } else {
        this.ecosystem.notify(
          targetMode === 'simulation'
            ? 'Modo de simulação do HQ ativado. Dados reais foram removidos da tela.'
            : 'Modo real ativado. Dados do HQ atualizados para a sessão autenticada.',
          targetMode === 'simulation' ? 'info' : 'success'
        );
      }
    } finally {
      this.isChangingExecutionMode.set(false);
    }
  }

  onWindowKeydown(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.showCommandPalette.update((isOpen) => {
        if (!isOpen) this.commandSearchQuery.set('');
        return !isOpen;
      });
    } else if (event.key === 'Escape') {
      this.showCommandPalette.set(false);
      this.showModal.set(false);
      this.showRegisterDeviceModal.set(false);
      this.showDocModal.set(false);
      this.selectedTenantForGovernance.set(null);
    }
  }

  selectCommand(tab: HQSubTab) {
    this.activeSubTab.set(tab);
    this.commandSearchQuery.set('');
    this.showCommandPalette.set(false);
  }

  inspectRemoteStoreOs(tenant: CompanyTenant) {
    this.ecosystem.currentTenantId.set(tenant.id);
    this.ecosystem.currentView.set('os');
    this.router.navigate(['/os']);
    this.ecosystem.notify(`Abrindo o Store OS de ${tenant.name} em modo de inspeção HQ.`, 'info');
  }

  openNewTenantModal() {
    this.showModal.set(true);
  }

  async createTenant() {
    const name = this.newTenantName().trim();
    const cnpj = this.newTenantCnpjDigits();
    if (!name || cnpj.length !== 14 || this.isProvisioningTenant()) {
      this.ecosystem.notify('Informe o nome da empresa e um CNPJ com 14 dígitos.', 'warning');
      return;
    }

    const modeRevision = this.security.executionModeRevision();
    this.isProvisioningTenant.set(true);
    try {
      await this.ecosystem.addTenant({
        name,
        cnpj,
        category: this.newTenantCategory() as 'restaurant' | 'retail' | 'services',
        plan: this.newTenantPlan() as 'Starter' | 'Professional' | 'Enterprise'
      });
      if (modeRevision !== this.security.executionModeRevision()) {
        this.ecosystem.notify('A solicitação começou no contexto anterior. Volte ao modo real para verificar se a loja foi criada.', 'warning');
        return;
      }
      this.showModal.set(false);
      this.newTenantName.set('');
      this.newTenantCnpj.set('');
      this.ecosystem.notify(
        this.security.isSimulated()
          ? 'Loja criada na simulação, em período de teste.'
          : 'Loja criada em período de teste. Complete o vínculo do responsável e o cadastro operacional antes de ativá-la.',
        'success'
      );
    } catch (err: unknown) {
      const message = (err as { error?: { error?: string } })?.error?.error;
      this.ecosystem.notify(message || 'Não foi possível criar a loja. Nenhum cadastro foi confirmado.', 'error');
    } finally {
      this.isProvisioningTenant.set(false);
    }
  }

  async registerDevice() {
    const tenantId = this.newDeviceTenantId();
    const deviceName = this.newDeviceName().trim();
    const serialNumber = this.newDeviceSerial().trim();
    if (!tenantId || !deviceName || !serialNumber) {
      this.ecosystem.notify('Selecione o destino e informe nome e serial do dispositivo.', 'warning');
      return;
    }

    const modeRevision = this.security.executionModeRevision();
    try {
      await this.ecosystem.addDevice({ tenantId, deviceName, type: 'terminal', serialNumber });
      if (modeRevision !== this.security.executionModeRevision()) {
        this.ecosystem.notify('A solicitação começou no contexto anterior. Volte ao modo real para verificar o inventário.', 'warning');
        return;
      }
      this.showRegisterDeviceModal.set(false);
      this.ecosystem.notify('Dispositivo registrado no inventário. A conexão física e a telemetria ainda não foram verificadas.', 'warning');
    } catch (err: unknown) {
      const deviceError = err as { error?: { error?: string }; message?: string };
      const message = deviceError?.error?.error || deviceError?.message;
      this.ecosystem.notify(message || 'Não foi possível registrar o dispositivo.', 'error');
    }
  }

  openTenantGovernance(tenant: CompanyTenant) {
    this.selectedTenantForGovernance.set(tenant);
  }
}
