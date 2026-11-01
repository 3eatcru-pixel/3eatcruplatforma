/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChangeDetectionStrategy, Component, inject, signal, computed, ElementRef, viewChild, afterNextRender, effect, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { SecurityService } from '../services/security.service';
import { EcosystemService } from '../services/ecosystem.service';
import { DeliveryRoute, DeliveryWaypoint } from '../models/ecosystem.model';

type DriverScreenTab = 'active_route' | 'available_routes' | 'delivery_details' | 'financial' | 'profile' | 'proof_summary';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-driver-app',
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="min-h-screen bg-[#070110] text-slate-100 font-sans selection:bg-purple-600 selection:text-white relative overflow-hidden">
      
      <!-- NEON DECORATION -->
      <div class="absolute -top-24 -left-24 w-96 h-96 bg-purple-600/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div class="absolute -bottom-24 -right-24 w-96 h-96 bg-magenta-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div class="max-w-md md:max-w-5xl mx-auto min-h-screen flex flex-col relative z-10 shadow-[0_0_100px_rgba(168,85,247,0.1)] border-x border-white/5 bg-[#070110]">
        
        <!-- TOP STATUS BAR (MOBILE NATIVE PREVIEW) -->
        <div class="flex justify-between items-center px-6 py-4 text-[11px] font-bold text-slate-400">
          <span>{{ currentTime() }}</span>
          <div class="flex items-center gap-1.5">
            <mat-icon class="text-[14px] w-4 h-4">signal_cellular_4_bar</mat-icon>
            <mat-icon class="text-[14px] w-4 h-4">wifi</mat-icon>
            <mat-icon class="text-[14px] w-4 h-4">battery_full</mat-icon>
          </div>
        </div>

        <!-- HEADER / NAVIGATION -->
        <div class="px-6 pb-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
               @if (activeTab() !== 'active_route' && activeTab() !== 'available_routes' && activeTab() !== 'financial' && activeTab() !== 'profile') {
                 <button (click)="goBack()" class="p-2 -ml-2 text-slate-400 hover:text-white transition-colors cursor-pointer">
                   <mat-icon>arrow_back</mat-icon>
                 </button>
               } @else {
                 <div class="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                   <mat-icon class="text-white">two_wheeler</mat-icon>
                 </div>
               }
               <div>
                 <h1 class="text-lg font-black tracking-tight text-white flex items-center gap-1">
                   <span>3eat</span>
                   <span class="text-purple-500 italic">Entregas</span>
                 </h1>
               </div>
            </div>
            
            <button (click)="goToOSWorkstation()" class="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all cursor-pointer">
              <mat-icon class="text-lg">desktop_windows</mat-icon>
            </button>
          </div>
        </div>

        <!-- MAIN CONTENT AREA -->
        <div class="flex-1 overflow-y-auto custom-scrollbar px-6 pb-24">
          
          <!-- SCREEN 1: ACTIVE ROUTE / MAP -->
          @if (activeDriverProfile()?.status === 'offline') {
            <div class="flex flex-col items-center justify-center py-20 text-center animate-in zoom-in duration-500">
               <div class="w-24 h-24 rounded-[2rem] bg-purple-600/10 border border-purple-500/30 flex items-center justify-center text-purple-500 mb-6 shadow-[0_0_40px_rgba(168,85,247,0.15)] relative overflow-hidden group">
                  <div class="absolute inset-0 bg-purple-500/5 animate-pulse"></div>
                  <mat-icon class="text-6xl z-10 group-hover:scale-110 transition-transform">qr_code_2</mat-icon>
               </div>
               <h3 class="text-xl font-black text-white uppercase tracking-tight mb-2">Entrada Obrigatória</h3>
               <p class="text-[10px] text-slate-500 uppercase tracking-widest max-w-xs mx-auto mb-10 leading-relaxed">
                 Você está offline. Para começar a receber rotas, realize o <strong>Clock-in</strong> escaneando o código de entrada na loja.
               </p>
               
               <button (click)="openShiftScanModal()" class="w-full py-5 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-[0_10px_30px_rgba(168,85,247,0.3)] transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-3">
                  <mat-icon>qr_code_scanner</mat-icon>
                  Escanear Entrada (Clock-in)
               </button>
            </div>
          } @else if (activeTab() === 'active_route') {
            @if (currentActiveRoute(); as route) {
              <div class="space-y-6 animate-in fade-in duration-500">
                <!-- Status & Route Code -->
                <div class="flex items-center justify-between bg-white/5 border border-white/10 rounded-3xl p-4">
                   <div class="flex items-center gap-3">
                      @if (route.status === 'at_store') {
                        <div class="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                        <span class="text-[10px] font-black uppercase text-amber-500 tracking-widest">Na Loja (Coleta)</span>
                      } @else if (route.status === 'accepted') {
                        <div class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
                        <span class="text-[10px] font-black uppercase text-indigo-500 tracking-widest">Ido para a Loja</span>
                      } @else {
                        <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        <span class="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Em Rota</span>
                      }
                      <span class="text-sm font-black text-white uppercase">{{ route.routeCode }}</span>
                   </div>
                   <span class="text-[10px] font-black text-slate-500 uppercase">{{ completedWaypointsCount(route) }}/{{ route.waypoints.length }} Entregas</span>
                </div>

                <!-- FLOW CONTROL BUTTONS (PICKUP) -->
                @if (route.status === 'at_store') {
                  <div class="bg-purple-950/20 border border-purple-500/30 rounded-3xl p-6 text-center space-y-4 animate-in slide-in-from-top duration-300">
                    <div class="flex flex-col items-center gap-2">
                       <mat-icon class="text-4xl text-purple-400">inventory_2</mat-icon>
                       <h4 class="text-sm font-black text-white uppercase">Aguardando Coleta dos Pedidos</h4>
                       <p class="text-[10px] text-slate-400 uppercase tracking-widest">A loja está preparando os pacotes desta rota.</p>
                    </div>

                    <button (click)="confirmPickup(route.id)" class="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer">
                      <mat-icon>check_circle</mat-icon>
                      Confirmar Coleta dos Pedidos
                    </button>
                  </div>
                }

                <!-- Next Stop Card -->
                @if (nextWaypoint(route); as wp) {
                  <button (click)="selectWaypoint(wp)" class="w-full text-left bg-white/5 border border-white/10 rounded-3xl p-5 group hover:bg-white/10 transition-all cursor-pointer relative overflow-hidden">
                    <div class="absolute top-0 right-0 p-3">
                      <mat-icon class="text-slate-600 group-hover:text-purple-500 transition-colors">chevron_right</mat-icon>
                    </div>
                    <div class="flex items-start gap-4">
                      <div class="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black text-lg shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                        {{ wp.sequenceNumber }}
                      </div>
                      <div class="flex-1 min-w-0">
                        <span class="text-[9px] font-black text-purple-400 uppercase tracking-widest block mb-1">Próxima Parada</span>
                        <h4 class="text-sm font-black text-white uppercase truncate">{{ wp.customerName }}</h4>
                        <div class="flex items-center gap-1.5 mt-1 text-slate-400">
                          <mat-icon class="text-xs">place</mat-icon>
                          <span class="text-[10px] font-bold truncate">{{ wp.address }}</span>
                        </div>
                        <div class="flex items-center gap-4 mt-3">
                          <div class="flex items-center gap-1">
                            <mat-icon class="text-[10px] text-slate-500">near_me</mat-icon>
                            <span class="text-[10px] font-black text-slate-300 uppercase">{{ wp.distanceKm }} km</span>
                          </div>
                          <div class="flex items-center gap-1">
                            <mat-icon class="text-[10px] text-slate-500">schedule</mat-icon>
                            <span class="text-[10px] font-black text-slate-300 uppercase">{{ wp.etaMinutes }} min</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                }

                <!-- Real Map Container -->
                <div class="relative h-[320px] rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl bg-slate-900 group">
                   <div #mapContainer class="w-full h-full grayscale-[0.8] contrast-[1.2] invert-[0.9] hue-rotate-[180deg]"></div>
                   
                   <!-- GPS Info Overlay -->
                   <div class="absolute top-4 left-4 z-[1000] bg-slate-950/80 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl flex items-center gap-2">
                      <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span class="text-[9px] font-black uppercase text-white tracking-widest">GPS Geodésico Ativo</span>
                   </div>

                   <!-- Geodetic Navigation Controls -->
                   <div class="absolute bottom-4 left-4 z-[1000] flex gap-2">
                      @if (route.status === 'in_progress') {
                        <button (click)="toggleGpsNavigation()" class="px-3 py-2 rounded-xl bg-purple-600 text-white text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-purple-500 transition-all cursor-pointer">
                          {{ isGpsActive() ? '⏸️ Pausar GPS' : '▶️ Iniciar Navegação GPS' }}
                        </button>
                      } @else if (route.status === 'accepted') {
                        <button (click)="arriveAtStore(route.id)" class="px-3 py-2 rounded-xl bg-amber-600 text-white text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-amber-500 transition-all cursor-pointer">
                          📍 Já cheguei na Loja
                        </button>
                      }
                   </div>
                </div>

                <!-- Bottom Stats -->
                <div class="grid grid-cols-3 gap-3">
                   <div class="bg-white/5 border border-white/10 rounded-3xl p-4 text-center">
                    <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Distância</span>
                    <strong class="text-sm font-black text-white">{{ route.totalDistanceKm }} km</strong>
                  </div>
                  <div class="bg-white/5 border border-white/10 rounded-3xl p-4 text-center">
                    <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Tempo Total</span>
                    <strong class="text-sm font-black text-white">{{ route.estimatedDuration }}</strong>
                  </div>
                  <div class="bg-white/5 border border-white/10 rounded-3xl p-4 text-center">
                    <span class="text-[8px] font-black text-purple-400 uppercase tracking-widest block mb-1">Ganhos</span>
                    <strong class="text-sm font-black text-purple-500">R$ {{ route.totalEarnings.toFixed(2) }}</strong>
                  </div>
                </div>
              </div>
            } @else {
              <div class="flex flex-col items-center justify-center py-20 text-center animate-in zoom-in duration-500">
                <div class="w-24 h-24 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center text-slate-700 mb-6 shadow-inner">
                  <mat-icon class="text-6xl">sensors</mat-icon>
                </div>
                <h3 class="text-lg font-black text-white uppercase tracking-tight mb-2">Nenhuma rota ativa</h3>
                <p class="text-[10px] text-slate-500 uppercase tracking-widest max-w-xs mx-auto mb-8 leading-relaxed">
                  Consulte a aba de rotas disponíveis para aceitar uma nova corrida na região.
                </p>
                <button (click)="activeTab.set('available_routes')" class="px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-[0_10px_30px_rgba(168,85,247,0.3)] transition-all active:scale-95 cursor-pointer">
                  Ver Rotas Disponíveis
                </button>
              </div>
            }
          }

          <!-- SCREEN 2: AVAILABLE ROUTES -->
          @if (activeTab() === 'available_routes') {
            <div class="space-y-6 animate-in slide-in-from-bottom duration-500">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-black text-white uppercase tracking-tight">Rotas Disponíveis</h3>
                <button class="p-2 text-slate-400"><mat-icon>filter_list</mat-icon></button>
              </div>

              <div class="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
                <button class="px-4 py-1.5 rounded-full bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest shrink-0">Hoje</button>
                <button class="px-4 py-1.5 rounded-full bg-white/5 text-slate-400 text-[10px] font-black uppercase tracking-widest shrink-0">Amanhã</button>
                <button class="px-4 py-1.5 rounded-full bg-white/5 text-slate-400 text-[10px] font-black uppercase tracking-widest shrink-0">Todos</button>
              </div>

              <div class="space-y-4">
                @for (route of availableRoutes(); track route.id) {
                  <div class="bg-white/5 border border-white/10 rounded-[2rem] p-6 space-y-4 group hover:bg-white/10 transition-all">
                    <div class="flex justify-between items-start">
                      <div>
                        <h4 class="text-sm font-black text-white uppercase">{{ route.routeCode }}</h4>
                        <div class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{{ route.totalDistanceKm }} km • {{ route.estimatedDuration }}</div>
                        <div class="text-[10px] text-purple-400 font-black uppercase tracking-widest mt-1">{{ route.waypoints.length }} Entregas</div>
                      </div>
                      <div class="text-right">
                        <strong class="text-lg font-black text-white">R$ {{ route.totalEarnings.toFixed(2) }}</strong>
                      </div>
                    </div>
                    <button (click)="acceptRoute(route.id)" class="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-purple-600 hover:border-purple-500 transition-all cursor-pointer">
                      Ver detalhes
                    </button>
                  </div>
                }
              </div>
            </div>
          }

          <!-- SCREEN 3: DELIVERY DETAILS -->
          @if (activeTab() === 'delivery_details') {
            @if (activeWaypoint(); as wp) {
              <div class="space-y-6 animate-in slide-in-from-right duration-500">
                <div class="flex items-center justify-between">
                  <h3 class="text-lg font-black text-white uppercase tracking-tight">Detalhes da entrega</h3>
                </div>

                <div class="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 space-y-6 relative overflow-hidden">
                   <div class="flex items-center gap-4">
                      <div class="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black text-xl shadow-lg">
                        {{ wp.sequenceNumber }}
                      </div>
                      <div class="flex-1 min-w-0">
                         <h4 class="text-base font-black text-white uppercase truncate">{{ wp.customerName }}</h4>
                         <span class="bg-purple-900/50 text-purple-400 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest border border-purple-500/30">Em andamento</span>
                      </div>
                   </div>

                   <div class="space-y-4">
                      <div class="flex items-start gap-3">
                         <mat-icon class="text-purple-500 mt-1">place</mat-icon>
                         <div>
                            <p class="text-xs font-bold text-white uppercase">{{ wp.address }}</p>
                            <p class="text-[10px] text-slate-500 uppercase font-black tracking-widest">{{ wp.cityState }}</p>
                         </div>
                      </div>
                      <div class="flex items-center gap-8 pl-9">
                         <div class="flex items-center gap-2">
                            <mat-icon class="text-sm text-slate-500">near_me</mat-icon>
                            <span class="text-xs font-black text-white">{{ wp.distanceKm }} km</span>
                         </div>
                         <div class="flex items-center gap-2">
                            <mat-icon class="text-sm text-slate-500">schedule</mat-icon>
                            <span class="text-xs font-black text-white">{{ wp.etaMinutes }} min</span>
                         </div>
                      </div>
                   </div>

                   <div class="pt-6 border-t border-white/5 space-y-3">
                      <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Produtos</p>
                      <div class="flex items-start gap-3">
                         <mat-icon class="text-slate-600">inventory_2</mat-icon>
                         <div>
                            <p class="text-xs font-bold text-white uppercase">{{ wp.productSummary }}</p>
                            @if (wp.weightKg) { <p class="text-[10px] text-slate-500 font-black uppercase tracking-widest">Peso: {{ wp.weightKg }} kg</p> }
                         </div>
                      </div>
                   </div>

                   @if (wp.notes) {
                     <div class="pt-6 border-t border-white/5 space-y-2">
                        <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Observações</p>
                        <p class="text-[11px] text-slate-300 font-bold uppercase leading-relaxed">{{ wp.notes }}</p>
                     </div>
                   }

                   <div class="pt-8 space-y-3">
                      <button (click)="openProofModal(wp)" class="w-full py-5 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-[0_10px_30px_rgba(168,85,247,0.3)] transition-all active:scale-95 cursor-pointer">
                        Chegar no destino
                      </button>
                      <button (click)="openChatModal(wp)" class="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-magenta-500 hover:bg-white/10 transition-all cursor-pointer">
                        Mensagem ao cliente
                      </button>
                   </div>
                </div>
              </div>
            }
          }

          <!-- SCREEN 4: FINANCIAL -->
          @if (activeTab() === 'financial') {
            <div class="space-y-6 animate-in slide-in-from-left duration-500">
               <div class="flex items-center justify-between">
                <h3 class="text-lg font-black text-white uppercase tracking-tight">Financeiro</h3>
              </div>

              <div class="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
                <button class="px-6 py-1.5 rounded-full bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest shrink-0">Hoje</button>
                <button class="px-6 py-1.5 rounded-full bg-white/5 text-slate-400 text-[10px] font-black uppercase tracking-widest shrink-0">Semana</button>
                <button class="px-6 py-1.5 rounded-full bg-white/5 text-slate-400 text-[10px] font-black uppercase tracking-widest shrink-0">Mês</button>
              </div>

              <div class="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-4">
                 <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ganhos do dia</p>
                 <div class="flex items-center justify-between">
                    <strong class="text-4xl font-black text-emerald-500">R$ {{ driverEarningsTotal().toFixed(2) }}</strong>
                    <div class="flex items-center gap-1 text-emerald-500 font-black">
                       <mat-icon class="text-sm">arrow_upward</mat-icon>
                       <span class="text-xs">12%</span>
                    </div>
                 </div>
                 <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{{ driverCompletedCount() }} Entregas concluídas</p>
                 
                  <div class="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                    <div class="space-y-1">
                       <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest">Por rota</span>
                       <p class="text-sm font-black text-white">R$ {{ avgEarningsPerRoute().toFixed(2) }}</p>
                    </div>
                    <div class="space-y-1">
                       <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest">Por entrega</span>
                       <p class="text-sm font-black text-white">R$ {{ avgEarningsPerDelivery().toFixed(2) }}</p>
                    </div>
                  </div>
              </div>

              <div class="space-y-4">
                 <h4 class="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Histórico de ganhos</h4>
                 @for (route of routesForSelectedDriver(); track route.id) {
                   <div class="flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-3xl group hover:bg-white/10 transition-all">
                      <div class="flex items-center gap-4">
                         <div class="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-slate-500 group-hover:text-purple-500 transition-colors">
                           <mat-icon>two_wheeler</mat-icon>
                         </div>
                         <div>
                            <h5 class="text-xs font-black text-white uppercase">{{ route.routeCode }}</h5>
                            <p class="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{{ route.totalDeliveredCount }} Entregas • {{ route.totalDistanceKm }} km</p>
                         </div>
                      </div>
                      <div class="text-right">
                         <p class="text-xs font-black text-emerald-500">R$ {{ route.totalEarnings.toFixed(2) }}</p>
                         <p class="text-[8px] text-slate-600 font-black uppercase tracking-widest">{{ formatRouteTimestamp(route.date) }}</p>
                      </div>
                   </div>
                 }
              </div>
            </div>
          }

          <!-- SCREEN 5: PROFILE -->
          @if (activeTab() === 'profile') {
             @if (activeDriverProfile(); as drv) {
               <div class="space-y-6 animate-in slide-in-from-top duration-500">
                  <div class="flex items-center justify-between">
                    <h3 class="text-lg font-black text-white uppercase tracking-tight">Perfil do motorista</h3>
                  </div>

                  <!-- SELETOR DE MOTORISTA APENAS EM PREVIEW/HOMOLOGAÇÃO -->
                  @if (canSwitchDriverPreview()) {
                    <div class="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-2">
                      <span class="text-[9px] font-black uppercase tracking-widest text-slate-400">Alternar Motorista (Preview):</span>
                      <select
                        [value]="selectedDriverId()"
                        (change)="selectedDriverId.set($any($event.target).value)"
                        class="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-bold outline-none cursor-pointer">
                        @for (d of ecosystem.drivers(); track d.id) {
                          <option [value]="d.id">{{ d.name }} ({{ d.status === 'offline' ? 'Offline' : d.status }})</option>
                        }
                      </select>
                    </div>
                  }

                  <div class="flex flex-col items-center py-6">
                     <div class="relative">
                        <img src="https://i.pravatar.cc/150?u=carlos" class="w-24 h-24 rounded-[2rem] border-4 border-purple-600 shadow-[0_0_30px_rgba(168,85,247,0.4)]" alt="avatar" referrerpolicy="no-referrer">
                        <div class="absolute -bottom-2 -right-2 bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border-2 border-slate-950 flex items-center gap-1">
                           <mat-icon class="text-[10px] w-3 h-3">verified</mat-icon> Verificado
                        </div>
                     </div>
                     <h4 class="text-xl font-black text-white uppercase mt-4">{{ drv.name }}</h4>
                     <div class="flex items-center gap-1 mt-1">
                        <mat-icon class="text-sm text-yellow-500">star</mat-icon>
                        <span class="text-sm font-black text-white">{{ drv.rating }}</span>
                        <span class="text-[10px] text-slate-500 font-bold uppercase ml-1">(124 avaliações)</span>
                     </div>
                  </div>

                  <div class="grid grid-cols-3 gap-3">
                     <div class="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                        <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Concluídas</span>
                        <strong class="text-sm font-black text-white">48</strong>
                     </div>
                     <div class="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                        <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Km rodados</span>
                        <strong class="text-sm font-black text-white">1.248</strong>
                     </div>
                     <div class="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                        <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Atividade</span>
                        <strong class="text-sm font-black text-white">12 dias</strong>
                     </div>
                  </div>

                  <div class="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
                     <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Meu veículo</p>
                     <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                           <mat-icon class="text-purple-500">two_wheeler</mat-icon>
                           <div>
                              <p class="text-xs font-black text-white uppercase">Honda CG 160</p>
                              <p class="text-[9px] text-slate-500 font-black uppercase tracking-widest">Placa: FGH-7J23</p>
                           </div>
                        </div>
                        <span class="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Ativo</span>
                     </div>
                  </div>

                  <div class="space-y-2">
                     <button class="w-full flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-3xl group hover:bg-white/10 transition-all cursor-pointer">
                        <div class="flex items-center gap-3">
                           <mat-icon class="text-slate-500 group-hover:text-purple-500 transition-colors">person_outline</mat-icon>
                           <span class="text-[11px] font-black text-white uppercase">Meus dados</span>
                        </div>
                        <mat-icon class="text-slate-700">chevron_right</mat-icon>
                     </button>
                     <button class="w-full flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-3xl group hover:bg-white/10 transition-all cursor-pointer">
                        <div class="flex items-center gap-3">
                           <mat-icon class="text-slate-500 group-hover:text-purple-500 transition-colors">description</mat-icon>
                           <span class="text-[11px] font-black text-white uppercase">Documentos</span>
                        </div>
                        <mat-icon class="text-slate-700">chevron_right</mat-icon>
                     </button>
                     <button class="w-full flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-3xl group hover:bg-white/10 transition-all cursor-pointer">
                        <div class="flex items-center gap-3">
                           <mat-icon class="text-slate-500 group-hover:text-purple-500 transition-colors">headset_mic</mat-icon>
                           <span class="text-[11px] font-black text-white uppercase">Suporte</span>
                        </div>
                        <mat-icon class="text-slate-700">chevron_right</mat-icon>
                     </button>
                     <button class="w-full flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-3xl group hover:bg-white/10 transition-all cursor-pointer">
                        <div class="flex items-center gap-3">
                           <mat-icon class="text-slate-500 group-hover:text-purple-500 transition-colors">settings</mat-icon>
                           <span class="text-[11px] font-black text-white uppercase">Configurações</span>
                        </div>
                        <mat-icon class="text-slate-700">chevron_right</mat-icon>
                     </button>
                  </div>
               </div>
             }
          }

          <!-- SCREEN 6: PROOF SUMMARY -->
          @if (activeTab() === 'proof_summary') {
            @if (lastCompletedRoute(); as completedRoute) {
              <div class="space-y-6 animate-in zoom-in duration-500">
                <div class="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-6 relative overflow-hidden">
                   <div class="absolute top-0 right-0 p-6">
                      <mat-icon class="text-6xl text-emerald-500/20">check_circle</mat-icon>
                   </div>
                   
                    <div>
                      <h3 class="text-xl font-black text-white uppercase tracking-tight">{{ completedRoute.routeCode || 'Rota Concluída' }}</h3>
                      <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{{ completedRoute.date || 'Hoje' }}</p>
                   </div>

                   <div class="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
                      <div class="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950">
                        <mat-icon class="text-xs">check</mat-icon>
                      </div>
                      <span class="text-[11px] font-black text-emerald-500 uppercase tracking-widest">{{ completedRoute.totalDeliveredCount || 0 }} Entregas concluídas</span>
                   </div>

                   <div class="grid grid-cols-2 gap-4">
                      <div class="space-y-1">
                         <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest">Distância total</span>
                         <p class="text-sm font-black text-white">{{ completedRoute.totalDistanceKm || 0 }} km</p>
                      </div>
                      <div class="space-y-1">
                         <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest">Tempo total</span>
                         <p class="text-sm font-black text-white">{{ completedRoute.estimatedDuration || '--' }}</p>
                      </div>
                   </div>

                   <div class="pt-6 border-t border-white/5 space-y-2">
                      <div class="flex justify-between items-center text-[11px] font-bold text-slate-400">
                         <span>Valor da rota</span>
                         <span>R$ {{ (completedRoute.totalEarnings || 0).toFixed(2) }}</span>
                      </div>
                      <div class="flex justify-between items-center text-[11px] font-bold text-slate-400">
                         <span>Adicionais</span>
                         <span>R$ 0,00</span>
                      </div>
                      <div class="flex justify-between items-center pt-2 mt-2 border-t border-white/5">
                         <span class="text-xs font-black text-white uppercase tracking-widest">Total recebido</span>
                         <span class="text-lg font-black text-emerald-500">R$ {{ (completedRoute.totalEarnings || 0).toFixed(2) }}</span>
                      </div>
                   </div>

                   <button class="w-full flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-2xl group hover:bg-white/10 transition-all cursor-pointer">
                      <span class="text-[10px] font-black text-white uppercase tracking-widest">Ver detalhes das entregas</span>
                      <mat-icon class="text-slate-700">keyboard_arrow_down</mat-icon>
                   </button>
                </div>

                <button (click)="activeTab.set('active_route')" class="w-full py-5 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-[0_10px_30px_rgba(168,85,247,0.3)] transition-all active:scale-95 cursor-pointer">
                  Ver comprovantes
                </button>
              </div>
            } @else {
              <div class="p-8 text-center text-slate-500 bg-white/5 border border-white/10 rounded-3xl">
                <mat-icon class="text-4xl text-slate-600 mb-2">local_shipping</mat-icon>
                <p class="text-xs font-bold uppercase">Nenhuma rota concluída registrada ainda.</p>
              </div>
            }
          }

        </div>

        <!-- BOTTOM TAB BAR (NATIVE MOBILE INTERFACE) -->
        <div class="absolute bottom-0 left-0 w-full bg-[#070110]/80 backdrop-blur-xl border-t border-white/5 px-6 py-4 flex justify-between items-center z-50">
          <button (click)="activeTab.set('active_route')" [class.text-purple-500]="activeTab() === 'active_route' || activeTab() === 'delivery_details'" class="flex flex-col items-center gap-1 text-slate-500 hover:text-white transition-all cursor-pointer">
             <mat-icon class="text-2xl">place</mat-icon>
             <span class="text-[8px] font-black uppercase tracking-widest">Rotas</span>
          </button>
          <button (click)="activeTab.set('available_routes')" [class.text-purple-500]="activeTab() === 'available_routes'" class="flex flex-col items-center gap-1 text-slate-500 hover:text-white transition-all cursor-pointer relative">
             <mat-icon class="text-2xl">inventory_2</mat-icon>
             <span class="text-[8px] font-black uppercase tracking-widest">Entregas</span>
             @if (availableRoutes().length > 0) {
               <div class="absolute -top-1 -right-1 w-3 h-3 bg-purple-600 rounded-full border-2 border-[#070110]"></div>
             }
          </button>
          <button (click)="activeTab.set('financial')" [class.text-purple-500]="activeTab() === 'financial'" class="flex flex-col items-center gap-1 text-slate-500 hover:text-white transition-all cursor-pointer">
             <mat-icon class="text-2xl">account_balance_wallet</mat-icon>
             <span class="text-[8px] font-black uppercase tracking-widest">Financeiro</span>
          </button>
          <button (click)="activeTab.set('profile')" [class.text-purple-500]="activeTab() === 'profile'" class="flex flex-col items-center gap-1 text-slate-500 hover:text-white transition-all cursor-pointer">
             <mat-icon class="text-2xl">person</mat-icon>
             <span class="text-[8px] font-black uppercase tracking-widest">Perfil</span>
          </button>
        </div>

        <!-- MODALS (CONFIRMATION / CHAT) -->
        @if (showProofModal()) {
           <div class="absolute inset-0 bg-[#070110]/95 backdrop-blur-md z-[100] flex flex-col justify-end p-6 animate-in slide-in-from-bottom duration-500">
              <div class="space-y-6 pb-12">
                 <div class="flex justify-between items-center">
                    <h3 class="text-xl font-black text-white uppercase tracking-tight">Confirmar entrega</h3>
                    <button (click)="showProofModal.set(false)" class="p-2 text-slate-500"><mat-icon>close</mat-icon></button>
                 </div>
                 
                 <div class="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
                    <div class="space-y-2">
                       <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Código do cliente</p>
                       <div class="flex gap-2">
                          @for (i of [1,2,3,4]; track i) {
                            <div class="flex-1 h-16 bg-slate-900 border border-white/10 rounded-2xl flex items-center justify-center">
                               <input type="text" maxLength="1" class="w-full h-full bg-transparent text-center text-2xl font-black text-purple-500 focus:outline-none">
                            </div>
                          }
                       </div>
                    </div>

                    <div class="space-y-2">
                       <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Recebedor</p>
                       <input type="text" placeholder="Nome do recebedor" class="w-full bg-slate-900 border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-white focus:outline-none focus:border-purple-500">
                    </div>

                    <div class="space-y-2">
                       <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Assinatura Digital</p>
                       <div class="w-full h-32 bg-slate-900 border border-white/10 rounded-2xl relative overflow-hidden flex items-center justify-center group">
                          <div class="absolute inset-0 opacity-10 bg-carbon-pattern"></div>
                          <mat-icon class="text-6xl text-white/5 group-hover:text-purple-500/10 transition-colors">gesture</mat-icon>
                          <p class="absolute bottom-2 text-[8px] text-slate-700 font-bold uppercase tracking-widest">Assinar na Tela</p>
                          <svg class="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <path d="M10,50 Q25,30 40,50 T70,50 T90,30" fill="none" stroke="#a855f7" stroke-width="0.5" class="opacity-0 group-active:opacity-100 transition-opacity" />
                          </svg>
                       </div>
                    </div>

                    <div class="w-full aspect-video bg-slate-900 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-slate-600">
                       <mat-icon class="text-4xl mb-2">add_a_photo</mat-icon>
                       <span class="text-[10px] font-black uppercase tracking-widest">Anexar foto do pacote</span>
                    </div>
                 </div>

                 <button (click)="confirmDeliveryProof()" class="w-full py-5 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-[0_10px_30px_rgba(168,85,247,0.3)] transition-all active:scale-95 cursor-pointer">
                    Finalizar entrega
                 </button>
              </div>
           </div>
        }

        @if (showChatModal()) {
           <div class="absolute inset-0 bg-[#070110]/95 backdrop-blur-md z-[100] flex flex-col p-6 animate-in slide-in-from-bottom duration-500">
              <div class="flex justify-between items-center mb-6">
                 <div class="flex items-center gap-3">
                    <img [src]="modalWaypoint()?.customerName ? 'https://i.pravatar.cc/100?u=' + modalWaypoint()?.customerName : ''" class="w-10 h-10 rounded-2xl border border-white/10" alt="avatar" referrerpolicy="no-referrer">
                    <div>
                       <h4 class="text-sm font-black text-white uppercase">{{ modalWaypoint()?.customerName }}</h4>
                       <span class="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Online</span>
                    </div>
                 </div>
                 <button (click)="showChatModal.set(false)" class="p-2 text-slate-500"><mat-icon>close</mat-icon></button>
              </div>

              <div class="flex-1 overflow-y-auto space-y-4 py-4 custom-scrollbar">
                 <div class="flex justify-start">
                    <div class="max-w-[80%] bg-white/5 border border-white/10 p-4 rounded-3xl rounded-tl-sm text-xs text-slate-300 font-bold uppercase leading-relaxed">
                       Olá! Algum problema com a entrega?
                    </div>
                 </div>
                 <div class="flex justify-end">
                    <div class="max-w-[80%] bg-purple-600 p-4 rounded-3xl rounded-tr-sm text-xs text-white font-black uppercase tracking-tight">
                       Estou chegando no seu endereço em 5 minutos! 🛵
                    </div>
                 </div>
              </div>

              <div class="flex items-center gap-3 pt-4">
                 <div class="flex-1 bg-slate-900 border border-white/10 rounded-2xl px-6 py-4">
                    <input type="text" placeholder="Digite sua mensagem..." class="w-full bg-transparent text-xs font-bold text-white focus:outline-none">
                 </div>
                 <button class="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center text-slate-950 shadow-lg">
                    <mat-icon>send</mat-icon>
                 </button>
              </div>
           </div>
        }

         @if (showScanModal()) {
             <div class="absolute inset-0 bg-[#070110]/95 backdrop-blur-md z-[100] flex flex-col p-6 animate-in slide-in-from-bottom duration-500">
               <div class="flex justify-between items-center mb-10">
                  <h3 class="text-xl font-black text-white uppercase tracking-tight">Escanear QR Code</h3>
                  <button (click)="showScanModal.set(false)" class="p-2 text-slate-500"><mat-icon>close</mat-icon></button>
               </div>

               <div class="flex-1 flex flex-col items-center justify-center space-y-12">
                  <!-- AUDIT SCANNER VIEWFINDER -->
                  <div class="w-64 h-64 border-2 border-purple-500 rounded-[3rem] relative overflow-hidden flex items-center justify-center group">
                     <div class="absolute inset-0 bg-purple-500/5 animate-pulse"></div>
                     <!-- Laser line animation -->
                     <div class="absolute top-0 left-0 w-full h-1 bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.8)] animate-[scan_2s_infinite_linear]"></div>
                     
                     <mat-icon class="text-7xl text-purple-500/20">qr_code_2</mat-icon>
                  </div>

                  <div class="text-center space-y-2">
                     <h4 class="text-base font-black text-white uppercase">Aponte para o QR Code da Loja</h4>
                     <p class="text-[10px] text-slate-500 uppercase tracking-[0.2em] max-w-[200px]">Posicione o código no centro do marcador para realizar o Clock-in.</p>
                  </div>

                  <button (click)="confirmScanSuccess()" class="w-full py-5 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl transition-all active:scale-95 cursor-pointer">
                    Confirmar Entrada na Loja (Clock-In)
                  </button>
               </div>
            </div>
         }

      </div>
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 0px; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes scan { 0% { top: 0; } 100% { top: 100%; } }
    .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
    .leaflet-container { background: transparent !important; }
  `]
})
export class DriverAppComponent implements OnInit, OnDestroy {
  readonly ecosystem = inject(EcosystemService);
  private readonly security = inject(SecurityService);
  private readonly router = inject(Router);

  readonly currentTime = computed(() => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  readonly selectedDriverId = signal<string>('drv-3');
  readonly activeTab = signal<DriverScreenTab>('active_route');
  readonly selectedWaypoint = signal<DeliveryWaypoint | null>(null);
  
  // Modals state
  readonly showProofModal = signal<boolean>(false);
  readonly showChatModal = signal<boolean>(false);
  readonly showScanModal = signal<boolean>(false);
  readonly modalWaypoint = signal<DeliveryWaypoint | null>(null);
  
  // Real-time Navigation state
  readonly isGpsActive = signal<boolean>(false);
  private navigationTimer: any = null;

  // Map state
  private readonly mapContainer = viewChild<ElementRef>('mapContainer');
  private map: any = null;
  private markersLayer: any = null;
  private driverMarker: any = null;
  private L: any = null;

  readonly canSwitchDriverPreview = computed(() => {
    const session = this.ecosystem.currentSession();
    return !session || session.role !== 'driver';
  });

  readonly activeDriverProfile = computed(() => {
    return this.ecosystem.drivers().find(d => d.id === this.selectedDriverId());
  });

  readonly routesForSelectedDriver = computed(() => {
    const driverId = this.selectedDriverId();
    return this.ecosystem.deliveryRoutes().filter(r => r.driverId === driverId);
  });

  readonly currentActiveRoute = computed(() => {
    return this.routesForSelectedDriver().find(r => r.status === 'in_progress' || r.status === 'at_store' || r.status === 'accepted');
  });

  readonly availableRoutes = computed(() => {
    const drv = this.activeDriverProfile();
    return this.ecosystem.deliveryRoutes().filter(r => {
      if (r.status !== 'available') return false;
      if (drv?.tenantId) {
        return r.tenantId === drv.tenantId;
      }
      if (r.tenantId) {
        const tenant = this.ecosystem.tenants().find(t => t.id === r.tenantId);
        if (tenant?.deliveryFleetType === 'own') return false;
      }
      return true;
    });
  });

  readonly driverEarningsTotal = computed(() => {
    return this.routesForSelectedDriver().reduce((sum, r) => sum + r.totalEarnings, 0);
  });

  readonly driverCompletedCount = computed(() => {
    return this.routesForSelectedDriver().filter(r => r.status === 'completed').reduce((sum, r) => sum + r.totalDeliveredCount, 0);
  });

  readonly avgEarningsPerRoute = computed(() => {
    const routes = this.routesForSelectedDriver();
    return routes.length > 0 ? this.driverEarningsTotal() / routes.length : 0;
  });

  readonly avgEarningsPerDelivery = computed(() => {
    const deliveries = this.routesForSelectedDriver().reduce((sum, r) => sum + Math.max(1, r.waypoints.length), 0);
    return deliveries > 0 ? this.driverEarningsTotal() / deliveries : 0;
  });

  readonly lastCompletedRoute = computed(() => {
    return (
      this.routesForSelectedDriver().find(r => r.status === 'completed') ||
      this.routesForSelectedDriver()[0] ||
      null
    );
  });

  readonly activeWaypoint = computed(() => this.selectedWaypoint());

  ngOnInit() {
    this.security.setPillar('driver');
  }

  constructor() {
    // Enforce authenticated driver identity when role === 'driver'
    effect(() => {
      const session = this.ecosystem.currentSession();
      if (session?.role === 'driver' && session.id) {
        this.selectedDriverId.set(session.id);
        return;
      }
      const current = this.selectedDriverId();
      const drivers = this.ecosystem.drivers();
      if (drivers.length > 0 && !drivers.some(d => d.id === current)) {
        this.selectedDriverId.set(drivers[0].id);
      }
    });

    // Invalidate map size and update markers when active route tab is selected
    effect(() => {
      const tab = this.activeTab();
      if (tab === 'active_route' && this.map) {
        setTimeout(() => {
          this.map?.invalidateSize();
          this.updateMarkers();
        }, 150);
      }
    });

    // React to route changes for markers
    afterNextRender(async () => {
      this.L = (await import('leaflet')).default;
      this.initMap();
    });
  }

  ngOnDestroy() {
    if (this.navigationTimer) {
      clearInterval(this.navigationTimer);
      this.navigationTimer = null;
    }
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  formatRouteTimestamp(dateStr?: string): string {
    if (!dateStr) return '--';
    if (dateStr.includes(',')) {
      return dateStr.split(',')[1]?.trim() || dateStr;
    }
    return dateStr;
  }

  private initMap() {
    const container = this.mapContainer()?.nativeElement;
    if (!container || !this.L) return;

    // Use OpenFreeMap public tiles
    const tileUrl = 'https://tiles.openfreemap.org/styles/liberty/{z}/{x}/{y}.png';
    
    this.map = this.L.map(container, {
      center: [-23.5651, -46.6521], // São Paulo center
      zoom: 14,
      zoomControl: false,
      attributionControl: false
    });

    this.L.tileLayer(tileUrl).addTo(this.map);
    this.markersLayer = this.L.layerGroup().addTo(this.map);

    this.updateMarkers();
  }

  private updateMarkers() {
    if (!this.map) return;
    this.markersLayer.clearLayers();

    const route = this.currentActiveRoute();
    if (!route) return;

    const bounds: any[] = [];

    // Add Store Marker if in pickup phase
    if (route.status === 'at_store') {
      const tenant = this.ecosystem.tenants().find(t => t.id === route.tenantId);
      if (tenant && tenant.lat && tenant.lng) {
        const storeIcon = this.L.divIcon({
          className: 'store-pickup-icon',
          html: `<div class="w-10 h-10 rounded-2xl bg-white border-4 border-amber-600 flex items-center justify-center text-amber-600 shadow-xl"><i class="material-icons text-xl">store</i></div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });
        this.L.marker([tenant.lat, tenant.lng], { icon: storeIcon }).addTo(this.markersLayer);
        bounds.push([tenant.lat, tenant.lng]);
      }
    }

    // Add Waypoint markers
    route.waypoints.forEach(wp => {
      const lat = wp.lat || -23.56 + (wp.sequenceNumber * 0.005);
      const lng = wp.lng || -46.65 + (wp.sequenceNumber * 0.005);
      
      const icon = this.L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="w-6 h-6 rounded-full bg-purple-600 border-2 border-white text-white text-[10px] font-black flex items-center justify-center shadow-lg">${wp.sequenceNumber}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      this.L.marker([lat, lng], { icon }).addTo(this.markersLayer);
      bounds.push([lat, lng]);
    });

    // Add Driver marker
    const driverIcon = this.L.divIcon({
      className: 'driver-icon',
      html: `<div class="w-8 h-8 rounded-full bg-white border-4 border-purple-600 flex items-center justify-center text-purple-600 shadow-xl animate-pulse"><i class="material-icons text-sm">navigation</i></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    this.driverMarker = this.L.marker([-23.5651, -46.6521], { icon: driverIcon }).addTo(this.markersLayer);
    bounds.push([-23.5651, -46.6521]);

    if (bounds.length > 0) {
      this.map.fitBounds(bounds as any, { padding: [40, 40] });
    }
  }

  nextWaypoint(route: DeliveryRoute): DeliveryWaypoint | null {
    return route.waypoints.find(w => w.status === 'pending' || w.status === 'in_transit') || null;
  }

  completedWaypointsCount(route: DeliveryRoute): number {
    return route.waypoints.filter(w => w.status === 'completed').length;
  }

  acceptRoute(routeId: string) {
    this.ecosystem.acceptDeliveryRoute(routeId, this.selectedDriverId());
    this.activeTab.set('active_route');
    setTimeout(() => this.updateMarkers(), 100);
  }

  selectWaypoint(wp: DeliveryWaypoint) {
    this.selectedWaypoint.set(wp);
    this.activeTab.set('delivery_details');
  }

  openProofModal(wp: DeliveryWaypoint) {
    this.modalWaypoint.set(wp);
    this.showProofModal.set(true);
  }

  openChatModal(wp: DeliveryWaypoint) {
    this.modalWaypoint.set(wp);
    this.showChatModal.set(true);
  }

  confirmDeliveryProof() {
    const wp = this.modalWaypoint();
    const route = this.currentActiveRoute();
    if (wp && route) {
      this.ecosystem.advanceWaypointStatus(route.id, wp.id, 'completed');
      
      // Notify via WhatsApp automatically on completion
      this.ecosystem.sendWhatsAppMessage(wp.customerName, wp.customerPhone || '', `Sua entrega ${route.routeCode} foi concluída com sucesso por ${this.activeDriverProfile()?.name}! Obrigado por usar a 3EAT. ⭐`);
      
      this.showProofModal.set(false);
      
      // If all done, show summary
      const updatedRoute = this.ecosystem.deliveryRoutes().find(r => r.id === route.id);
      if (updatedRoute && updatedRoute.status === 'completed') {
        this.activeTab.set('proof_summary');
      } else {
        this.activeTab.set('active_route');
        this.updateMarkers();
      }
    }
  }

  arriveAtStore(routeId: string) {
    this.ecosystem.markArrivedAtStore(routeId);
  }

  openShiftScanModal() {
    this.showScanModal.set(true);
  }

  confirmScanSuccess() {
    const driverId = this.selectedDriverId();
    this.ecosystem.clockInDriver(driverId);
    this.showScanModal.set(false);
    setTimeout(() => this.updateMarkers(), 100);
  }

  confirmPickup(routeId: string) {
    if (!routeId) return;
    this.ecosystem.confirmPickup(routeId);
    setTimeout(() => this.updateMarkers(), 100);
  }

  toggleGpsNavigation() {
    if (this.isGpsActive()) {
      this.isGpsActive.set(false);
      if (this.navigationTimer) {
        clearInterval(this.navigationTimer as any);
        this.navigationTimer = null;
      }
    } else {
      this.isGpsActive.set(true);
      this.navigationTimer = setInterval(() => {
        if (this.driverMarker && this.map) {
          const route = this.currentActiveRoute();
          const nextWp = route ? this.nextWaypoint(route) : null;
          
          const pos = this.driverMarker.getLatLng();
          let nextLat = pos.lat;
          let nextLng = pos.lng;
          
          if (nextWp && nextWp.lat && nextWp.lng) {
            // Move 10% of the way to the next waypoint per second
            nextLat += (nextWp.lat - pos.lat) * 0.1;
            nextLng += (nextWp.lng - pos.lng) * 0.1;
            
            // Check if "arrived" (very close, e.g. < 50 meters)
            const dist = this.ecosystem.mapTools.calculateDistance(
              { lat: nextLat, lng: nextLng },
              { lat: nextWp.lat, lng: nextWp.lng }
            ).meters;
            
            if (dist < 50 && nextWp.status !== 'arrived') {
               this.ecosystem.advanceWaypointStatus(route!.id, nextWp.id, 'arrived');
               this.ecosystem.notify('Destino alcançado! Confirme a entrega.', 'success');
            }
          } else {
            // Drift slightly if no target
            nextLat += (Math.random() - 0.5) * 0.0005;
            nextLng += (Math.random() - 0.5) * 0.0005;
          }

          this.driverMarker.setLatLng([nextLat, nextLng]);
          this.map.panTo([nextLat, nextLng]);
        }
      }, 1000);
    }
  }

  goBack() {
    this.activeTab.set('active_route');
    this.selectedWaypoint.set(null);
  }

  goToOSWorkstation() {
    this.ecosystem.currentView.set('os');
    this.router.navigate(['/os']);
  }
}


