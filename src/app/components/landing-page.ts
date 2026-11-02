import { ChangeDetectionStrategy, Component, inject, signal, ElementRef, viewChild, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { EcosystemService } from '../services/ecosystem.service';
import { animate, inView } from "motion";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-landing-page',
  imports: [CommonModule, MatIconModule, RouterModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen bg-[#0a0a0a] text-slate-200 font-sans selection:bg-amber-600 selection:text-white overflow-x-hidden">
      
      <!-- TOP BAR CONTRACT (3-ZONE) -->
      <header #header class="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between gap-8 px-6 py-4 border-b border-white/5 transition-all duration-500 bg-black/40 backdrop-blur-md">
        <!-- Zone 1: Brand -->
        <a href="/" class="text-xl font-black tracking-tighter text-white whitespace-nowrap shrink-0 flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-black shadow-lg text-[0px]">
            <mat-icon class="text-base">settings</mat-icon>
          </div>
          <span>3EATCRU OS</span>
        </a>

        <!-- Zone 2: Nav Links -->
        <nav class="hidden md:flex items-center gap-8 text-sm font-bold text-slate-400">
          <a href="#features" (click)="smoothScroll($event, 'features')" class="hover:text-white transition-colors whitespace-nowrap shrink-0">Funcionalidades</a>
          <a href="#sectors" (click)="smoothScroll($event, 'sectors')" class="hover:text-white transition-colors whitespace-nowrap shrink-0">Ecossistema</a>
          <a href="#proof" (click)="smoothScroll($event, 'proof')" class="hover:text-white transition-colors whitespace-nowrap shrink-0">Como funciona</a>
          <a href="#contact" (click)="smoothScroll($event, 'contact')" class="hover:text-white transition-colors whitespace-nowrap shrink-0">Suporte</a>
        </nav>

        <!-- Zone 3: Primary Action -->
        <div class="flex items-center gap-4 shrink-0">
          @if (ecosystem.currentSession(); as session) {
            <span class="hidden sm:block text-[10px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">
              {{ session.name }}
            </span>
            <button (click)="router.navigate([session.role === 'hq_admin' ? '/hq' : '/os'])" class="px-5 py-2.5 text-xs font-black text-black bg-amber-500 rounded-xl hover:bg-amber-400 transition-all active:scale-95 whitespace-nowrap shrink-0 shadow-[0_0_20px_rgba(245,158,11,0.3)] cursor-pointer">
              Meu Painel
            </button>
          } @else {
            <button (click)="router.navigate(['/os/login'])" class="hidden sm:block text-xs font-bold text-slate-400 hover:text-white transition-colors px-4 py-2 cursor-pointer">
              Entrar
            </button>
            <button (click)="scrollToSignup()" class="px-5 py-2.5 text-xs font-black text-black bg-amber-500 rounded-xl hover:bg-amber-400 transition-all active:scale-95 whitespace-nowrap shrink-0 shadow-[0_0_20px_rgba(245,158,11,0.3)] cursor-pointer">
              Começar Agora
            </button>
          }
        </div>
      </header>

      <!-- HERO SECTION: THEMATIC FOCAL CARRIER -->
      <section class="relative min-h-screen flex items-center pt-24 overflow-hidden">
        <div class="absolute inset-0 z-0">
          <img 
            src="/src/assets/images/hero_gastronomic_command_center_1793305588335.jpg" 
            alt="Command Center" 
            class="w-full h-full object-cover opacity-30 grayscale-[0.5] scale-105"
            referrerpolicy="no-referrer"
          >
          <div class="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/90 to-transparent"></div>
          <div class="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-transparent to-transparent"></div>
        </div>

        <div class="container mx-auto px-6 relative z-10 grid lg:grid-cols-12 gap-12 items-center">
          <div class="lg:col-span-8 space-y-8 animate-hero">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <mat-icon class="text-xs text-amber-500">bolt</mat-icon>
              <span>Gestão comercial para lojas</span>
            </div>
            
            <h1 class="text-6xl lg:text-[100px] font-black tracking-tighter text-white leading-[0.85] text-wrap-balance">
              Operação <br> <span class="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600">Alta Performance</span>
            </h1>

            <p class="text-xl lg:text-2xl text-slate-400 leading-relaxed font-medium max-w-2xl">
              Uma plataforma web com gestão central no HQ, ferramentas operacionais para a loja e uma vitrine pública para pedidos e descoberta.
            </p>

            <div class="flex flex-wrap items-center gap-4 pt-6">
              @if (ecosystem.currentSession(); as session) {
                <button (click)="router.navigate([session.role === 'hq_admin' ? '/hq' : '/os'])" class="px-10 py-5 text-sm font-black text-black bg-amber-500 rounded-2xl hover:bg-amber-400 transition-all active:scale-95 shadow-[0_20px_40px_rgba(245,158,11,0.2)] flex items-center gap-2 cursor-pointer">
                  <span>Ir para meu Painel</span>
                  <mat-icon>dashboard</mat-icon>
                </button>
              } @else {
                <button (click)="scrollToSignup()" class="px-10 py-5 text-sm font-black text-black bg-amber-500 rounded-2xl hover:bg-amber-400 transition-all active:scale-95 shadow-[0_20px_40px_rgba(245,158,11,0.2)] flex items-center gap-2 cursor-pointer">
                  <span>Provisionar Minha Unidade</span>
                  <mat-icon>arrow_forward</mat-icon>
                </button>
              }
              <button (click)="router.navigate(['/regional'])" class="px-10 py-5 text-sm font-black text-white bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all active:scale-95 backdrop-blur-md cursor-pointer">
                Ver Marketplace
              </button>
            </div>
          </div>
          
          <!-- Tactical Side Card -->
          <div class="lg:col-span-4 hidden lg:block animate-hero-card">
            <div class="bg-white/5 border border-white/10 rounded-[3rem] p-8 backdrop-blur-2xl space-y-6">
              <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Disponibilidade dos módulos</div>
              <div class="space-y-3 text-sm">
                <div class="flex justify-between gap-4"><span class="text-slate-300">Store OS e gestão da loja</span><span class="text-emerald-400">Disponível</span></div>
                <div class="flex justify-between gap-4"><span class="text-slate-300">Vitrine e pedidos públicos</span><span class="text-emerald-400">Disponível</span></div>
                <div class="flex justify-between gap-4"><span class="text-slate-300">Entregas da plataforma</span><span class="text-amber-400">Em breve</span></div>
              </div>
              <p class="text-[10px] text-slate-500">Recursos dependem de configuração e disponibilidade do serviço.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- KPI STRIP -->
      <section id="sectors" class="py-12 bg-[#0d0d0d] border-y border-white/5 overflow-hidden">
        <div class="container mx-auto px-6">
           <div class="grid grid-cols-2 md:grid-cols-4 gap-8 items-center">
             <div class="flex flex-col items-center gap-1"><span class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Acesso ao OS</span><span class="text-lg font-black text-white">Completo em todos os planos</span></div>
             <div class="flex flex-col items-center gap-1"><span class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Planos HQ</span><span class="text-lg font-black text-white">Assinatura do lojista</span></div>
             <div class="flex flex-col items-center gap-1"><span class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Dispositivos</span><span class="text-lg font-black text-white">Cota por plano</span></div>
             <div class="flex flex-col items-center gap-1"><span class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Entregadores 3EAT</span><span class="text-lg font-black text-amber-400">Em breve</span></div>
           </div>
        </div>
      </section>

      <!-- BENTO GRID CAPABILITIES -->
      <section id="features" class="py-32">
        <div class="container mx-auto px-6 space-y-20">
          <div class="max-w-3xl space-y-6">
            <h2 class="text-4xl lg:text-6xl font-black tracking-tighter text-white leading-none">Arquitetura de <br> <span class="text-amber-500 italic">Dominação Local</span></h2>
            <p class="text-xl text-slate-400 font-medium leading-relaxed">O HQ administra a plataforma, o lojista controla a operação da própria loja e o consumidor acessa as vitrines públicas.</p>
          </div>

          <div class="grid lg:grid-cols-12 gap-6 items-stretch">
            <!-- HQ CENTRAL -->
            <div class="lg:col-span-8 group relative rounded-[3rem] overflow-hidden border border-white/5 bg-[#111] hover:border-amber-500/30 transition-all duration-500 reveal-item opacity-0">
              <div class="absolute inset-0 z-0 text-[0px]">
                <img src="/src/assets/images/feature_hq_gabinete_1793305588521.jpg" alt="HQ Dash" class="w-full h-full object-cover opacity-20 group-hover:scale-105 transition-transform duration-1000" referrerpolicy="no-referrer">
                <div class="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
              </div>
              <div class="relative z-10 p-12 h-full flex flex-col justify-end space-y-6">
                <div class="w-14 h-14 rounded-2xl bg-rose-600/20 border border-rose-600/30 flex items-center justify-center text-rose-500 shadow-xl text-[0px]">
                  <mat-icon class="text-3xl">security</mat-icon>
                </div>
                <div class="space-y-2">
                  <h3 class="text-4xl font-black text-white tracking-tighter">01. Gabinete HQ Central</h3>
                  <p class="text-slate-400 max-w-lg font-medium leading-relaxed text-lg">
                    Governe lojas e planos, consulte o inventário e acompanhe os agregados operacionais. A comissão da rede própria de entregadores está em breve; o HQ não processa split ou repasses.
                  </p>
                </div>
                <div class="flex flex-wrap gap-3">
                  <span class="text-[11px] font-bold text-slate-300 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">Governança de lojas</span>
                  <span class="text-[11px] font-bold text-slate-300 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">Comissão da plataforma · Em breve</span>
                  <span class="text-[11px] font-bold text-slate-300 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">Inventário de dispositivos</span>
                </div>
              </div>
            </div>

            <!-- STORE OS -->
            <div class="lg:col-span-4 group relative rounded-[3rem] overflow-hidden border border-white/5 bg-[#111] hover:border-amber-500/30 transition-all duration-500 reveal-item opacity-0">
              <div class="absolute inset-0 z-0 text-[0px]">
                <img src="/src/assets/images/feature_os_terminal_1793305589822.jpg" alt="Store OS" class="w-full h-full object-cover opacity-30 group-hover:scale-105 transition-transform duration-1000" referrerpolicy="no-referrer">
                <div class="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
              </div>
              <div class="relative z-10 p-10 h-full flex flex-col justify-end space-y-4">
                <div class="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-lg text-[0px]">
                  <mat-icon>point_of_sale</mat-icon>
                </div>
                <h3 class="text-3xl font-black text-white tracking-tighter">02. Store OS (Web App)</h3>
                <p class="text-slate-400 font-medium leading-relaxed">
                  Sistema web para o lojista operar vendas, pedidos, produtos e módulos disponíveis no Store OS. A disponibilidade de cada fluxo deve ser conferida no ambiente da loja.
                </p>
                <div class="inline-flex items-center gap-1.5 text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg w-fit font-bold">
                  <mat-icon class="text-xs">laptop_mac</mat-icon>
                  <span>100% Web • Desktop, Laptops & Tablets</span>
                </div>
              </div>
            </div>

            <!-- MARKETPLACE -->
            <div class="lg:col-span-4 group relative rounded-[3rem] overflow-hidden border border-white/5 bg-[#111] hover:border-emerald-500/30 transition-all duration-500 reveal-item opacity-0">
              <div class="absolute inset-0 z-0 text-[0px]">
                <img src="/src/assets/images/feature_marketplace_mobile_1793305589350.jpg" alt="Market" class="w-full h-full object-cover opacity-30 group-hover:scale-105 transition-transform duration-1000" referrerpolicy="no-referrer">
                <div class="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
              </div>
              <div class="relative z-10 p-10 h-full flex flex-col justify-end space-y-4">
                <div class="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-lg text-[0px]">
                  <mat-icon>storefront</mat-icon>
                </div>
                <h3 class="text-3xl font-black text-white tracking-tighter">03. Marketplace</h3>
                <p class="text-slate-400 font-medium leading-relaxed">
                  Mostra lojas e catálogos públicos. O PIX é direcionado à loja com confirmação manual; cartão está indisponível até a integração de cada loja.
                </p>
              </div>
            </div>

            <!-- SYNC TECHNOLOGY -->
            <div class="lg:col-span-8 group relative rounded-[3rem] overflow-hidden border border-white/5 bg-[#0f0f0f] hover:border-indigo-500/30 transition-all duration-500 reveal-item opacity-0">
              <div class="absolute inset-0 z-0 text-[0px]">
                 <img src="/src/assets/images/feature_integration_sync_1793306671785.jpg" alt="Sync" class="w-full h-full object-cover opacity-10 group-hover:opacity-20 transition-opacity" referrerpolicy="no-referrer">
              </div>
              <div class="relative z-10 p-12 flex flex-col md:flex-row items-center gap-12 h-full">
                <div class="flex-1 space-y-6">
                  <div class="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-500 shadow-xl text-[0px]">
                    <mat-icon class="text-3xl">hub</mat-icon>
                  </div>
                  <h3 class="text-4xl font-black text-white tracking-tighter">Integrações por módulo</h3>
                  <p class="text-slate-400 font-medium leading-relaxed text-lg">
                    Os módulos compartilham contratos de API. A atualização de dados e a operação offline variam conforme o fluxo; não há garantia pública de latência ou disponibilidade.
                  </p>
                  <ul class="grid grid-cols-2 gap-4 pt-4">
                    <li class="flex items-center gap-2 text-xs font-bold text-slate-300">
                      <mat-icon class="text-emerald-500 text-sm">check</mat-icon> APIs por domínio
                    </li>
                    <li class="flex items-center gap-2 text-xs font-bold text-slate-300">
                      <mat-icon class="text-emerald-500 text-sm">check</mat-icon> Fila offline no PDV
                    </li>
                    <li class="flex items-center gap-2 text-xs font-bold text-slate-300">
                      <mat-icon class="text-emerald-500 text-sm">check</mat-icon> Validação de pedidos no servidor
                    </li>
                    <li class="flex items-center gap-2 text-xs font-bold text-slate-300">
                      <mat-icon class="text-emerald-500 text-sm">check</mat-icon> Aplicação web responsiva
                    </li>
                  </ul>
                </div>
                <div class="hidden md:block w-px h-full bg-white/5"></div>
                <div class="md:w-1/3 text-center md:text-left space-y-4">
                  <div class="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Operação da plataforma</div>
                  <div class="text-2xl font-black text-white">Por módulo</div>
                  <div class="text-xs text-slate-500 font-bold uppercase">Verifique os limites documentados</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- REGIONAL DISCOVERY: LIVE ECOSYSTEM -->
      <section id="discovery" class="py-32 bg-[#0a0a0a] relative overflow-hidden">
        <div class="container mx-auto px-6 space-y-20">
          <div class="flex flex-col lg:flex-row justify-between items-end gap-8 reveal-item opacity-0">
            <div class="max-w-2xl space-y-6">
              <h2 class="text-4xl lg:text-6xl font-black tracking-tighter text-white leading-none">Presença <span class="text-emerald-500 italic">Regional</span></h2>
              <p class="text-xl text-slate-400 font-medium leading-relaxed">As vitrines públicas permitem descobrir lojas e consultar catálogos. A entrega do pedido é organizada e paga diretamente pela loja.</p>
            </div>
            <button (click)="router.navigate(['/regional'])" class="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 text-white font-black text-xs uppercase tracking-widest transition-all cursor-pointer">
              Explorar Marketplace Completo
            </button>
          </div>

          @if (ecosystem.tenantsService.isSimulation()) {
            <p class="text-xs font-bold text-amber-400">Demonstração: os estabelecimentos abaixo são dados simulados.</p>
          }
          @if (ecosystem.publicStorefrontsStatus() === 'loading' || ecosystem.publicStorefrontsStatus() === 'idle') {
            <p class="text-sm text-slate-400">Carregando estabelecimentos publicados…</p>
          } @else if (ecosystem.publicStorefrontsStatus() === 'error') {
            <p class="text-sm text-amber-300">Não foi possível carregar as vitrines públicas.</p>
          } @else if (ecosystem.publicStorefronts().length === 0) {
            <p class="text-sm text-slate-400">Nenhum estabelecimento publicado no momento.</p>
          }
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (tenant of ecosystem.publicStorefronts().slice(0, 3); track tenant.id) {
              <div class="group relative bg-[#111] border border-white/5 rounded-[2.5rem] overflow-hidden hover:border-emerald-500/30 transition-all duration-500 reveal-item opacity-0">
                <div class="h-48 overflow-hidden relative">
                  <img [src]="tenant.coverImage || tenant.logo" [alt]="tenant.name" class="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000" referrerpolicy="no-referrer">
                  <div class="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent"></div>
                  <div class="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    {{ tenant.isOpen === undefined ? 'Status não informado' : tenant.isOpen ? 'Aberta' : 'Fechada' }}
                  </div>
                </div>
                <div class="p-8 space-y-4">
                  <div class="space-y-1">
                    <h3 class="text-xl font-black text-white tracking-tighter uppercase">{{ tenant.name }}</h3>
                    <p class="text-xs text-slate-500 font-bold leading-relaxed line-clamp-1">{{ tenant.tagline }}</p>
                  </div>
                  <div class="flex items-center gap-4 text-[10px] font-mono font-bold text-slate-400">
                    <span class="flex items-center gap-1"><mat-icon class="text-sm text-indigo-500">place</mat-icon> {{ tenant.address.neighborhood || tenant.address.city || 'Localização não informada' }}</span>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Marketplace status -->
          <div class="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 reveal-item opacity-0">
             <div class="flex items-center gap-4">
               <div class="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                 <mat-icon>analytics</mat-icon>
               </div>
               <div class="space-y-0.5">
                 <div class="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Entrega dos pedidos</div>
                 <div class="text-sm font-bold text-white leading-none">Responsabilidade da loja</div>
               </div>
             </div>
             <div class="flex items-center gap-8 overflow-hidden max-w-lg">
                <div class="flex items-center gap-2 text-xs font-bold text-slate-400 whitespace-nowrap"><span class="w-1 h-1 rounded-full bg-emerald-500"></span>A loja define o motorista e a remuneração</div>
                <div class="flex items-center gap-2 text-xs font-bold text-slate-400 whitespace-nowrap"><span class="w-1 h-1 rounded-full bg-amber-500"></span>O entregador pode usar o app para acompanhar rotas</div>
                <div class="flex items-center gap-2 text-xs font-bold text-slate-400 whitespace-nowrap"><span class="w-1 h-1 rounded-full bg-indigo-500"></span>Rede de entregadores da plataforma: em breve</div>
             </div>
          </div>
        </div>
      </section>

      <!-- PRICING SECTION -->
      <section id="pricing" class="py-32 border-t border-white/5">
        <div class="container mx-auto px-6 space-y-16">
          <div class="text-center space-y-4 reveal-item opacity-0">
            <h2 class="text-4xl lg:text-6xl font-black tracking-tighter text-white">Planos de <span class="text-amber-500">Expansão</span></h2>
            <p class="text-slate-400 font-medium max-w-2xl mx-auto">
              Todos os planos liberam acesso ao <strong>Store OS completo</strong>; a diferença comercial é a cota de dispositivos. Integrações e funções ainda em desenvolvimento permanecem pendentes para todos os lojistas.
            </p>
            @if (ecosystem.hqService.licensePlansSource() === 'demo') {
              <p class="text-xs font-bold text-amber-400">Valores de demonstração.</p>
            } @else if (ecosystem.hqService.licensePlansSource() === 'defaults' || ecosystem.hqService.licensePlansSource() === 'mixed') {
              <p class="text-xs font-bold text-amber-400">Catálogo publicado com valores padrão e/ou valores configurados no HQ.</p>
            }
          </div>

          <div class="grid md:grid-cols-3 gap-8">
            @if (ecosystem.hqService.licensePlansStatus() === 'loaded') {
            @for (plan of ecosystem.licensePlans(); track plan.id) {
              <div class="group relative bg-[#0f0f0f] border border-white/5 p-10 rounded-[3rem] hover:border-amber-500/40 transition-all duration-500 flex flex-col reveal-item opacity-0">
                @if (plan.id === 'Professional') {
                  <div class="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest rounded-full shadow-xl">Mais Popular</div>
                }
                
                <div class="space-y-6 flex-1">
                  <div class="space-y-1">
                    <h3 class="text-2xl font-black text-white tracking-tighter uppercase">{{ plan.name }}</h3>
                    <p class="text-xs text-slate-500 font-bold leading-relaxed">{{ plan.description }}</p>
                  </div>
                  
                  <div class="flex items-baseline gap-1">
                    <span class="text-xs font-bold text-slate-400">R$</span>
                    <span class="text-5xl font-black text-white tracking-tighter">{{ plan.priceMonthly }}</span>
                    <span class="text-xs font-bold text-slate-500">/mês</span>
                  </div>

                  <div class="space-y-4 pt-6 border-t border-white/5">
                    <div class="flex items-center gap-2 text-xs font-black text-white uppercase tracking-tighter">
                      <mat-icon class="text-amber-500 text-base">devices</mat-icon>
                      Até {{ plan.maxDevices }} dispositivos
                    </div>
                    <div class="flex items-center gap-2 text-xs font-bold text-slate-400">
                      <mat-icon class="text-emerald-500 text-sm">check_circle</mat-icon>
                      Acesso completo ao Store OS
                    </div>
                  </div>
                </div>

                <div class="pt-10">
                  <button (click)="scrollToSignup()" class="w-full py-4 rounded-2xl border border-white/10 text-xs font-black uppercase tracking-widest text-white group-hover:bg-amber-500 group-hover:text-black group-hover:border-amber-500 transition-all active:scale-95 cursor-pointer">
                    Contratar Plano
                  </button>
                </div>
              </div>
            }
            } @else if (ecosystem.hqService.licensePlansStatus() === 'loading' || ecosystem.hqService.licensePlansStatus() === 'idle') {
              <p class="md:col-span-3 text-center text-sm text-slate-400">Carregando catálogo de planos…</p>
            } @else {
              <p class="md:col-span-3 text-center text-sm text-amber-300">Não foi possível carregar os valores dos planos. Tente novamente mais tarde.</p>
            }
          </div>
        </div>
      </section>

      <!-- CURRENT OPERATING MODEL -->
      <section id="proof" class="py-32 bg-black/40">
        <div class="container mx-auto px-6 space-y-20">
          <div class="text-center max-w-2xl mx-auto space-y-4">
             <h2 class="text-3xl lg:text-5xl font-black tracking-tighter text-white">Como a plataforma opera</h2>
             <p class="text-slate-400 font-medium">Responsabilidades e pagamentos seguem o modelo atual do ecossistema.</p>
          </div>

          <div class="grid md:grid-cols-3 gap-8">
            <div class="bg-[#111] border border-white/5 p-8 rounded-[2.5rem] space-y-6 reveal-item opacity-0">
              <mat-icon class="text-amber-500">store</mat-icon>
              <h3 class="text-lg font-black text-white">Receita da loja</h3>
              <p class="text-slate-300 text-sm leading-relaxed">O pagamento da venda é direcionado à conta de pagamento configurada pela própria loja. O HQ não recebe nem divide o valor do pedido.</p>
            </div>

            <div class="bg-[#111] border border-white/5 p-8 rounded-[2.5rem] space-y-6 reveal-item opacity-0">
              <mat-icon class="text-emerald-500">two_wheeler</mat-icon>
              <h3 class="text-lg font-black text-white">Motoristas da loja</h3>
              <p class="text-slate-300 text-sm leading-relaxed">A loja escolhe seus motoristas e combina diretamente com eles o pagamento. O app de motorista ajuda na operação e no acompanhamento de rotas.</p>
            </div>

            <div class="bg-[#111] border border-white/5 p-8 rounded-[2.5rem] space-y-6 reveal-item opacity-0">
              <mat-icon class="text-indigo-400">hub</mat-icon>
              <h3 class="text-lg font-black text-white">Assinatura HQ</h3>
              <p class="text-slate-300 text-sm leading-relaxed">A loja paga a assinatura para usar o Store OS completo. Os planos diferem pela quantidade de dispositivos; a tarifa de 8% só se aplica à futura rede própria de entregadores, ainda em breve.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- SIGNUP CONVERSION -->
      <section id="signup" class="py-40 relative overflow-hidden">
        <div class="container mx-auto px-6 grid lg:grid-cols-2 gap-20 items-center">
          <div class="space-y-12">
            <div class="space-y-6 reveal-item opacity-0">
              <h2 class="text-5xl lg:text-[80px] font-black tracking-tighter text-white leading-[0.85]">
                Comece <br> <span class="text-amber-500">sua loja.</span>
              </h2>
              <p class="text-xl text-slate-400 leading-relaxed font-medium max-w-md">
                O cadastro inicia a criação da loja e uma avaliação. Consulte os valores e limites do plano antes de contratar.
              </p>
            </div>
            
            <div class="space-y-8 reveal-item opacity-0">
              <div class="flex items-start gap-5">
                <div class="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-500 shrink-0 text-[0px]">
                  <mat-icon>cloud_done</mat-icon>
                </div>
                <div>
                  <h4 class="font-black text-white uppercase tracking-tighter text-sm">Conta da loja</h4>
                  <p class="text-slate-500 text-xs font-bold leading-relaxed">A loja configura seus dados, meios de pagamento e disponibilidade de atendimento.</p>
                </div>
              </div>
              <div class="flex items-start gap-5">
                <div class="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-500 shrink-0 text-[0px]">
                  <mat-icon>support_agent</mat-icon>
                </div>
                <div>
                  <h4 class="font-black text-white uppercase tracking-tighter text-sm">Plano e dispositivos</h4>
                  <p class="text-slate-500 text-xs font-bold leading-relaxed">Todos os planos incluem o Store OS completo; a cota de dispositivos varia por plano.</p>
                </div>
              </div>
            </div>
          </div>

          <!-- SIGNUP FORM -->
          <div class="relative group reveal-item opacity-0">
            <div class="absolute -inset-1 bg-gradient-to-r from-amber-500 to-orange-600 rounded-[3rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
            <div class="relative bg-[#0d0d0d] border border-white/10 rounded-[3rem] p-10 lg:p-16 shadow-2xl space-y-10">
              <div class="flex justify-between items-start">
                <div class="space-y-1">
                  <h3 class="text-3xl font-black text-white tracking-tighter">Novo Registro</h3>
                  <p class="text-xs font-bold text-slate-500 uppercase tracking-widest">Protocolo de Provisionamento de Tenant</p>
                </div>
                <div class="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-600 text-[0px]">
                  <mat-icon>verified_user</mat-icon>
                </div>
              </div>

              <form [formGroup]="signupForm" (ngSubmit)="onSignup()" class="space-y-6">
                <div class="grid sm:grid-cols-2 gap-6">
                  <div class="space-y-2">
                    <label for="companyName" class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome da Empresa</label>
                    <input id="companyName" type="text" formControlName="companyName" placeholder="Ex: Burger Artisan Co." class="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-slate-700 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all font-medium text-sm">
                  </div>
                  <div class="space-y-2">
                    <label for="document" class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">CNPJ (14 dígitos)</label>
                    <input id="document" type="text" formControlName="document" placeholder="12.345.678/0001-90" class="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-slate-700 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all font-medium text-sm">
                  </div>
                </div>

                <div class="grid sm:grid-cols-2 gap-6">
                  <div class="space-y-2">
                    <label for="email" class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">E-mail Corporativo</label>
                    <input id="email" type="email" formControlName="email" placeholder="gestor@empresa.com.br" class="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-slate-700 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all font-medium text-sm">
                  </div>
                  <div class="space-y-2">
                    <label for="phone" class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Telefone Comercial</label>
                    <input id="phone" type="tel" formControlName="phone" placeholder="(11) 98765-4321" class="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-slate-700 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all font-medium text-sm">
                  </div>
                </div>

                <div class="grid sm:grid-cols-3 gap-4">
                  <div class="sm:col-span-2 space-y-2">
                    <label for="street" class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Logradouro</label>
                    <input id="street" type="text" formControlName="street" placeholder="Avenida Paulista" class="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder:text-slate-700 focus:outline-none focus:border-amber-500 transition-all font-medium text-sm">
                  </div>
                  <div class="space-y-2">
                    <label for="number" class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Número</label>
                    <input id="number" type="text" formControlName="number" placeholder="1000" class="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder:text-slate-700 focus:outline-none focus:border-amber-500 transition-all font-medium text-sm">
                  </div>
                </div>

                <div class="grid sm:grid-cols-4 gap-4">
                  <div class="space-y-2">
                    <label for="neighborhood" class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Bairro</label>
                    <input id="neighborhood" type="text" formControlName="neighborhood" placeholder="Bela Vista" class="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder:text-slate-700 focus:outline-none focus:border-amber-500 transition-all font-medium text-sm">
                  </div>
                  <div class="space-y-2">
                    <label for="city" class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Cidade</label>
                    <input id="city" type="text" formControlName="city" placeholder="São Paulo" class="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder:text-slate-700 focus:outline-none focus:border-amber-500 transition-all font-medium text-sm">
                  </div>
                  <div class="space-y-2">
                    <label for="state" class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">UF</label>
                    <input id="state" type="text" maxlength="2" formControlName="state" placeholder="SP" class="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white uppercase placeholder:text-slate-700 focus:outline-none focus:border-amber-500 transition-all font-medium text-sm">
                  </div>
                  <div class="space-y-2">
                    <label for="zipCode" class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">CEP</label>
                    <input id="zipCode" type="text" formControlName="zipCode" placeholder="01310-100" class="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder:text-slate-700 focus:outline-none focus:border-amber-500 transition-all font-medium text-sm">
                  </div>
                </div>

                <div class="space-y-2">
                  <label for="password" class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Senha Mestre de Acesso</label>
                  <input id="password" type="password" formControlName="password" placeholder="••••••••" class="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-slate-700 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all font-medium text-sm">
                </div>

                <div class="pt-6 space-y-4">
                  <button type="submit" [disabled]="signupForm.invalid || isSubmitting()" class="w-full py-6 text-sm font-black text-black bg-amber-500 rounded-2xl hover:bg-amber-400 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3 shadow-xl shadow-amber-500/10 cursor-pointer">
                    @if (isSubmitting()) {
                      <mat-icon class="animate-spin">sync</mat-icon>
                      <span>Provisionando...</span>
                    } @else {
                      <span>Iniciar Implantação OS</span>
                      <mat-icon class="text-base">rocket_launch</mat-icon>
                    }
                  </button>

                  <div class="flex items-center gap-4 py-2">
                    <div class="h-px flex-1 bg-white/5"></div>
                    <span class="text-[9px] font-black text-slate-600 uppercase tracking-widest">Ou continue com</span>
                    <div class="h-px flex-1 bg-white/5"></div>
                  </div>

                  <button type="button" (click)="onGoogleSignup()" [disabled]="isSubmitting()" class="w-full py-5 rounded-2xl border border-white/10 hover:bg-white/5 text-white text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 cursor-pointer">
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" class="w-5 h-5" alt="Google">
                    <span>Provisionar com Google</span>
                  </button>
                </div>

                <p class="text-center text-[10px] text-slate-600 leading-relaxed font-bold uppercase tracking-widest pt-4">
                  O cadastro não confirma a ativação de integrações ou serviços que ainda estejam em desenvolvimento.
                </p>
              </form>
            </div>
          </div>
        </div>

        <!-- Ambient Blurs -->
        <div class="absolute -bottom-64 -right-64 w-[800px] h-[800px] bg-amber-600/5 blur-[160px] rounded-full pointer-events-none"></div>
        <div class="absolute top-1/4 -left-64 w-[800px] h-[800px] bg-indigo-600/5 blur-[160px] rounded-full pointer-events-none"></div>
      </section>

      <!-- SUPPORT SECTION -->
      <section id="contact" class="py-32 border-t border-white/5">
        <div class="container mx-auto px-6">
          <div class="bg-gradient-to-br from-[#111] to-[#0a0a0a] rounded-[3rem] p-10 lg:p-20 border border-white/5 flex flex-col lg:flex-row items-center gap-16 reveal-item opacity-0">
            <div class="flex-1 space-y-8">
               <div class="w-16 h-16 rounded-[2rem] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-xl text-[0px]">
                <mat-icon class="text-3xl">support_agent</mat-icon>
              </div>
              <h2 class="text-4xl lg:text-6xl font-black tracking-tighter text-white leading-none">Fale com a <span class="italic text-amber-500">equipe</span></h2>
              <p class="text-xl text-slate-400 font-medium leading-relaxed">Os canais oficiais de atendimento ainda não estão configurados nesta página.</p>
              <p class="text-xs text-slate-500">Consulte os documentos e avisos disponíveis no ambiente do produto.</p>
            </div>
            <div class="flex-1 w-full lg:w-auto h-80 lg:h-96 rounded-[3rem] overflow-hidden border border-white/10 relative shadow-2xl text-[0px]">
               <img src="/src/assets/images/feature_support_hq_1793306671162.jpg" alt="Support" class="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-700" referrerpolicy="no-referrer">
               <div class="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- QUIET FOOTER -->
      <footer class="py-20 bg-black border-t border-white/5">
        <div class="container mx-auto px-6 space-y-16">
          <div class="flex flex-col lg:flex-row justify-between gap-16 items-start">
            <div class="space-y-8 max-w-xs">
              <a href="/" class="text-2xl font-black tracking-tighter text-white flex items-center gap-2">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-black shadow-lg text-[0px]">
                  <mat-icon>settings</mat-icon>
                </div>
                <span>3EATCRU OS</span>
              </a>
              <p class="text-xs text-slate-500 font-bold leading-relaxed uppercase tracking-wider">
                Ferramentas web para gestão da loja, administração central e descoberta pública de estabelecimentos.
              </p>
              <div class="flex items-center gap-4 text-slate-400">
                <a href="#" class="hover:text-white transition-colors text-[0px]"><mat-icon>facebook</mat-icon></a>
                <a href="#" class="hover:text-white transition-colors text-[0px]"><mat-icon>camera_alt</mat-icon></a>
                <a href="#" class="hover:text-white transition-colors text-[0px]"><mat-icon>alternate_email</mat-icon></a>
              </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 gap-16">
              <div class="space-y-6">
                <h4 class="text-[10px] font-black text-white uppercase tracking-[0.2em] opacity-50">Plataforma</h4>
                <nav class="flex flex-col gap-4 text-xs text-slate-400 font-bold">
                  <a href="/hq/login" class="hover:text-amber-500 transition-colors">HQ Dashboard</a>
                  <a href="/os/login" class="hover:text-amber-500 transition-colors">Store Operating System</a>
                  <a href="/home" class="hover:text-amber-500 transition-colors">Marketplace público</a>
                  <a href="/hq/login" class="hover:text-amber-500 transition-colors">Dispositivos no HQ</a>
                </nav>
              </div>
              <div class="space-y-6">
                <h4 class="text-[10px] font-black text-white uppercase tracking-[0.2em] opacity-50">Sessões</h4>
                <nav class="flex flex-col gap-4 text-xs text-slate-400 font-bold">
                  <a href="#features" (click)="smoothScroll($event, 'features')" class="hover:text-amber-500 transition-colors">Funcionalidades</a>
                  <a href="#sectors" (click)="smoothScroll($event, 'sectors')" class="hover:text-amber-500 transition-colors">Ecossistema</a>
                  <a href="#pricing" (click)="smoothScroll($event, 'pricing')" class="hover:text-amber-500 transition-colors">Preços & Planos</a>
                  <a href="#contact" (click)="smoothScroll($event, 'contact')" class="hover:text-amber-500 transition-colors">Central de Ajuda</a>
                </nav>
              </div>
              <div class="space-y-6">
                <h4 class="text-[10px] font-black text-white uppercase tracking-[0.2em] opacity-50">Legal</h4>
                <nav class="flex flex-col gap-4 text-xs text-slate-400 font-bold">
                  <a href="#" class="hover:text-amber-500 transition-colors">Privacidade</a>
                  <a href="#" class="hover:text-amber-500 transition-colors">Termos de Uso</a>
                </nav>
              </div>
            </div>
          </div>

          <div class="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-mono text-slate-600 font-bold tracking-widest">
            <div>© 2026 3EATCRU</div>
            <div class="flex items-center gap-8"><span>Store OS • HQ • Marketplace</span></div>
          </div>
        </div>
      </footer>

    </div>
  `,
  styles: [`
    :host { display: block; scroll-behavior: smooth; }
    .text-wrap-balance { text-wrap: balance; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `]
})
export class LandingPageComponent {
  readonly ecosystem = inject(EcosystemService);
  readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  
  header = viewChild<ElementRef<HTMLElement>>('header');
  isSubmitting = signal(false);

  readonly signupForm = this.fb.group({
    companyName: ['', [Validators.required, Validators.minLength(3)]],
    document: ['', [Validators.required, Validators.pattern(/^[0-9./-]{14,18}$/)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.minLength(10)]],
    street: ['', [Validators.required, Validators.minLength(2)]],
    number: ['', [Validators.required]],
    neighborhood: ['', [Validators.required, Validators.minLength(2)]],
    city: ['', [Validators.required, Validators.minLength(2)]],
    state: ['SP', [Validators.required, Validators.minLength(2), Validators.maxLength(2)]],
    zipCode: ['', [Validators.required, Validators.pattern(/^\d{5}-?\d{3}$/)]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  constructor() {
    afterNextRender(() => {
      this.initAnimations();
      this.initHeaderScroll();
      void this.ecosystem.syncMarketplaceFromBackend();
      void this.ecosystem.hqService.fetchPlans();
    });
  }

  initAnimations() {
    // Hero Animations
    animate(".animate-hero", { opacity: [0, 1], y: [40, 0] }, { duration: 1, ease: "easeOut" });
    animate(".animate-hero-card", { opacity: [0, 1], x: [40, 0] }, { delay: 0.3, duration: 1, ease: "easeOut" });

    // Scroll Reveal Animations
    const revealItems = document.querySelectorAll(".reveal-item");
    revealItems.forEach(el => {
      inView(el, () => {
        animate(el, { opacity: [0, 1], y: [50, 0] }, { duration: 0.8, ease: "easeOut" });
      });
    });
  }

  initHeaderScroll() {
    window.addEventListener('scroll', () => {
      const headerEl = this.header()?.nativeElement;
      if (!headerEl) return;
      
      if (window.scrollY > 50) {
        headerEl.classList.add('bg-black/90', 'py-3', 'shadow-2xl');
        headerEl.classList.remove('bg-black/40', 'py-4');
      } else {
        headerEl.classList.remove('bg-black/90', 'py-3', 'shadow-2xl');
        headerEl.classList.add('bg-black/40', 'py-4');
      }
    });
  }

  smoothScroll(event: Event, targetId: string) {
    event.preventDefault();
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  scrollToSignup() {
    const el = document.getElementById('signup');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  async onGoogleSignup() {
    if (this.isSubmitting()) return;
    if (this.signupForm.get('document')?.invalid || this.signupForm.get('street')?.invalid) {
      this.router.navigate(['/auth/merchant']);
      return;
    }
    this.isSubmitting.set(true);
    try {
      const session = await this.ecosystem.security.loginWithGoogle();
      if (session) {
        await this.provisionTenant(this.signupForm.get('companyName')?.value || session.name || 'Nova Loja');
      }
    } catch (err) {
      this.ecosystem.notify('Falha na autenticação: ' + err, 'warning');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async onSignup() {
    if (this.signupForm.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    const { companyName } = this.signupForm.value;

    try {
      await this.provisionTenant(companyName!);
    } catch (err) {
      this.ecosystem.notify('Erro no protocolo: ' + err, 'warning');
      this.isSubmitting.set(false);
    }
  }

  private async provisionTenant(name: string) {
    this.ecosystem.notify(`Protocolo de provisionamento iniciado para ${name}.`, 'info');

    if (!this.ecosystem.firebase.auth?.currentUser) {
      await this.ecosystem.security.loginWithGoogle();
    }

    const v = this.signupForm.getRawValue();
    const result = await this.ecosystem.security.registerMerchant({
      storeName: name,
      cnpj: (v.document || '').trim(),
      phone: (v.phone || '').trim(),
      category: 'restaurant',
      address: {
        street: (v.street || '').trim(),
        number: (v.number || '').trim(),
        neighborhood: (v.neighborhood || '').trim(),
        city: (v.city || '').trim(),
        state: (v.state || 'SP').trim().toUpperCase(),
        zipCode: (v.zipCode || '').trim()
      }
    });

    this.ecosystem.currentTenantId.set(result.tenantId);
    this.ecosystem.currentView.set('os');
    this.ecosystem.notify(`Estabelecimento ${name} provisionado em homologação (trial).`, 'success');
    this.isSubmitting.set(false);
    this.router.navigate(['/os']);
  }
}
