/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChangeDetectionStrategy, Component, inject, signal, computed, ElementRef, viewChild, afterNextRender, effect, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { SecurityService } from '../services/security.service';
import { EcosystemService } from '../services/ecosystem.service';
import { DeliveryRoute, DeliveryWaypoint, StoreDriver } from '../models/ecosystem.model';
import { MapProviderService } from '../services/map-provider.service';

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
               <h3 class="text-xl font-black text-white uppercase tracking-tight mb-2">Inicie seu turno</h3>
               <p class="text-[10px] text-slate-500 uppercase tracking-widest max-w-xs mx-auto mb-10 leading-relaxed">
                 Seu turno não está ativo. Para começar a receber rotas, registre manualmente o início do turno. O leitor de QR não está conectado.
               </p>
               
               <button (click)="openShiftStartModal()" class="w-full py-5 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-[0_10px_30px_rgba(168,85,247,0.3)] transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-3">
                  <mat-icon>login</mat-icon>
                  Registrar início do turno
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
                            <span class="text-[10px] font-black text-slate-300 uppercase">{{ wp.distanceKm > 0 ? wp.distanceKm.toFixed(1) + ' km' : 'Não informada' }}</span>
                          </div>
                          <div class="flex items-center gap-1">
                            <mat-icon class="text-[10px] text-slate-500">schedule</mat-icon>
                            <span class="text-[10px] font-black text-slate-300 uppercase">{{ wp.etaMinutes > 0 ? wp.etaMinutes + ' min' : 'Não informado' }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                }

                @if (ecosystem.isSimulationMode() || route.status === 'in_progress') {
                  <div class="relative h-[320px] rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl bg-slate-900 group">
                     <div #mapContainer class="w-full h-full" [class.grayscale]="ecosystem.isSimulationMode()" [class.contrast-125]="ecosystem.isSimulationMode()" [class.invert]="ecosystem.isSimulationMode()" [class.hue-rotate-180]="ecosystem.isSimulationMode()"></div>
                     @if (ecosystem.isSimulationMode()) {
                       <div class="absolute top-4 left-4 z-[1000] bg-slate-950/90 backdrop-blur-md border border-amber-400/30 px-3 py-1.5 rounded-xl">
                          <span class="text-[9px] font-black uppercase text-amber-200 tracking-widest">Demonstração simulada · sem GPS ou navegação real</span>
                       </div>
                     } @else {
                       <div class="absolute top-4 left-4 z-[1000] max-w-[85%] bg-slate-950/95 backdrop-blur-md border border-white/15 px-3 py-2 rounded-xl space-y-2">
                         @if (canShareGps()) {
                           <button type="button" (click)="toggleGpsSharing()" [disabled]="isGpsStarting()" class="px-3 py-2 rounded-lg bg-purple-600 text-white text-[9px] font-black uppercase tracking-widest disabled:opacity-60">
                             {{ isGpsStarting() ? 'Obtendo GPS…' : isGpsSharing() ? 'Parar compartilhamento' : 'Compartilhar minha localização' }}
                           </button>
                           <p class="text-[9px] text-slate-300">A posição atual será enviada à sua loja enquanto esta tela estiver aberta. Não guardamos histórico.</p>
                           @if (gpsAccuracyMeters() !== null) { <p class="text-[9px] text-slate-400">Precisão informada pelo aparelho: {{ gpsAccuracyMeters() | number:'1.0-0' }} m</p> }
                           @if (gpsError()) { <p role="alert" class="text-[9px] text-rose-300">{{ gpsError() }}</p> }
                         } @else {
                           <p class="text-[9px] font-bold text-slate-300">O mapa do entregador aparece durante uma rota ativa. O compartilhamento exige o aparelho do entregador autenticado.</p>
                         }
                       </div>
                     }
                     @if (route.status === 'in_progress') {
                       @if (ecosystem.isSimulationMode()) { <button
                         (click)="toggleRoutePreview()"
                         class="absolute bottom-4 left-4 z-[1000] px-3 py-2 rounded-xl bg-purple-600 text-white text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-purple-500 transition-all cursor-pointer">
                         {{ isRoutePreviewActive() ? '⏸️ Pausar prévia' : '▶️ Iniciar prévia' }}
                       </button> }
                     }
                  </div>
                } @else {
                  <div class="rounded-[2.5rem] border border-white/10 bg-white/5 p-6 flex items-start gap-4">
                    <mat-icon class="text-amber-300">map_off</mat-icon>
                    <div>
                      <h4 class="text-xs font-black text-white uppercase">GPS disponível durante a entrega</h4>
                      <p class="text-[10px] text-slate-400 mt-1">Quando a rota estiver em andamento, o entregador poderá compartilhar sua posição atual com a loja. Endereços ainda não são geocodificados.</p>
                    </div>
                  </div>
                }

                @if (route.status === 'accepted') {
                  <button (click)="arriveAtStore(route.id)" class="w-full px-3 py-3 rounded-xl bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-amber-500 transition-all cursor-pointer">
                    📍 Registrar chegada à loja
                  </button>
                }

                <!-- Bottom Stats -->
                <div class="grid grid-cols-3 gap-3">
                   <div class="bg-white/5 border border-white/10 rounded-3xl p-4 text-center">
                    <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Distância</span>
                    <strong class="text-sm font-black text-white">{{ route.totalDistanceKm > 0 ? route.totalDistanceKm.toFixed(1) + ' km' : 'Não informada' }}</strong>
                  </div>
                  <div class="bg-white/5 border border-white/10 rounded-3xl p-4 text-center">
                    <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Tempo Total</span>
                    <strong class="text-sm font-black text-white">{{ route.estimatedDuration && route.estimatedDuration !== 'Não informado' ? route.estimatedDuration : 'Não informado' }}</strong>
                  </div>
                  <div class="bg-white/5 border border-white/10 rounded-3xl p-4 text-center">
                    <span class="text-[8px] font-black text-purple-400 uppercase tracking-widest block mb-1">Valor indicado pela loja</span>
                    @if (route.totalEarnings > 0) {
                      <strong class="text-sm font-black text-purple-500">R$ {{ route.totalEarnings.toFixed(2) }}</strong>
                    } @else {
                      <strong class="text-[10px] font-black text-amber-300">A combinar com a loja</strong>
                    }
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
                        <div class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{{ route.totalDistanceKm > 0 ? route.totalDistanceKm.toFixed(1) + ' km' : 'Distância não informada' }} • {{ route.estimatedDuration && route.estimatedDuration !== 'Não informado' ? route.estimatedDuration : 'Tempo não informado' }}</div>
                        <div class="text-[10px] text-purple-400 font-black uppercase tracking-widest mt-1">{{ route.waypoints.length }} Entregas</div>
                      </div>
                      <div class="text-right">
                        @if (route.totalEarnings > 0) {
                          <strong class="text-lg font-black text-white">R$ {{ route.totalEarnings.toFixed(2) }}</strong>
                        } @else {
                          <span class="text-[9px] font-black text-amber-300 uppercase">A combinar com a loja</span>
                        }
                      </div>
                    </div>
                    <button (click)="acceptRoute(route.id)" class="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-purple-600 hover:border-purple-500 transition-all cursor-pointer">
                      Aceitar rota
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
                            <span class="text-xs font-black text-white">{{ wp.distanceKm > 0 ? wp.distanceKm.toFixed(1) + ' km' : 'Não informada' }}</span>
                         </div>
                         <div class="flex items-center gap-2">
                            <mat-icon class="text-sm text-slate-500">schedule</mat-icon>
                            <span class="text-xs font-black text-white">{{ wp.etaMinutes > 0 ? wp.etaMinutes + ' min' : 'Não informado' }}</span>
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
                <h3 class="text-lg font-black text-white uppercase tracking-tight">Valores das rotas</h3>
              </div>

              <div class="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
                <button class="px-6 py-1.5 rounded-full bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest shrink-0">Hoje</button>
                <button class="px-6 py-1.5 rounded-full bg-white/5 text-slate-400 text-[10px] font-black uppercase tracking-widest shrink-0">Semana</button>
                <button class="px-6 py-1.5 rounded-full bg-white/5 text-slate-400 text-[10px] font-black uppercase tracking-widest shrink-0">Mês</button>
              </div>

              <div class="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-4">
                 <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Valores indicados em rotas concluídas</p>
                 <div class="flex items-center justify-between">
                    @if (driverDefinedRouteAmountTotal() > 0) {
                      <strong class="text-4xl font-black text-emerald-500">R$ {{ driverDefinedRouteAmountTotal().toFixed(2) }}</strong>
                    } @else {
                      <strong class="text-lg font-black text-amber-300">Nenhum valor definido</strong>
                    }
                 </div>
                 <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{{ driverCompletedCount() }} Entregas concluídas</p>
                 <p class="text-[10px] text-amber-300 font-bold">Este app não registra pagamentos. A loja combina e paga diretamente ao entregador.</p>
                 
                  <div class="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                    <div class="space-y-1">
                       <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest">Média indicada por rota</span>
                       @if (avgStoreDefinedValuePerRoute() > 0) {
                         <p class="text-sm font-black text-white">R$ {{ avgStoreDefinedValuePerRoute().toFixed(2) }}</p>
                       } @else {
                         <p class="text-sm font-black text-amber-300">A definir</p>
                       }
                    </div>
                    <div class="space-y-1">
                       <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest">Média indicada por entrega</span>
                       @if (avgStoreDefinedValuePerDelivery() > 0) {
                         <p class="text-sm font-black text-white">R$ {{ avgStoreDefinedValuePerDelivery().toFixed(2) }}</p>
                       } @else {
                         <p class="text-sm font-black text-amber-300">A definir</p>
                       }
                    </div>
                  </div>
              </div>

              <div class="space-y-4">
                 <h4 class="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Valores informados nas rotas</h4>
                 @for (route of routesForSelectedDriver(); track route.id) {
                   <div class="flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-3xl group hover:bg-white/10 transition-all">
                      <div class="flex items-center gap-4">
                         <div class="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-slate-500 group-hover:text-purple-500 transition-colors">
                           <mat-icon>two_wheeler</mat-icon>
                         </div>
                         <div>
                            <h5 class="text-xs font-black text-white uppercase">{{ route.routeCode }}</h5>
                            <p class="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{{ route.totalDeliveredCount }} Entregas • {{ route.totalDistanceKm > 0 ? route.totalDistanceKm.toFixed(1) + ' km' : 'Distância não informada' }}</p>
                         </div>
                      </div>
                      <div class="text-right">
                         @if (route.totalEarnings > 0) {
                           <p class="text-xs font-black text-emerald-500">R$ {{ route.totalEarnings.toFixed(2) }}</p>
                         } @else {
                           <p class="text-[9px] font-black text-amber-300 uppercase">A combinar com a loja</p>
                         }
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
                        <div class="w-24 h-24 rounded-[2rem] border-4 border-purple-600 shadow-[0_0_30px_rgba(168,85,247,0.4)] bg-slate-900 flex items-center justify-center text-2xl font-black text-white" aria-label="Iniciais do motorista">
                           {{ driverInitials(drv.name) }}
                        </div>
                        <div class="absolute -bottom-2 -right-2 text-slate-950 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border-2 border-slate-950 flex items-center gap-1"
                          [class.bg-emerald-500]="drv.complianceVerified"
                          [class.bg-amber-400]="!drv.complianceVerified">
                           <mat-icon class="text-[10px] w-3 h-3">{{ drv.complianceVerified ? 'fact_check' : 'pending' }}</mat-icon>
                           {{ drv.complianceVerified ? 'Conferência registrada' : 'Conferência não registrada' }}
                        </div>
                     </div>
                     <h4 class="text-xl font-black text-white uppercase mt-4">{{ drv.name }}</h4>
                     <p class="text-[10px] text-slate-500 font-bold uppercase mt-1">Avaliações ainda não disponíveis</p>
                  </div>

                  <div class="grid grid-cols-3 gap-3">
                     <div class="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                        <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Entregas registradas</span>
                        <strong class="text-sm font-black text-white">{{ driverCompletedCount() }}</strong>
                     </div>
                     <div class="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                        <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Rotas concluídas</span>
                        <strong class="text-sm font-black text-white">{{ driverCompletedRouteCount() }}</strong>
                     </div>
                     <div class="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                        <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Status</span>
                        <strong class="text-sm font-black text-white">{{ driverStatusLabel(drv.status) }}</strong>
                     </div>
                  </div>

                  <div class="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
                     <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Meu veículo</p>
                     <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                           <mat-icon class="text-purple-500">two_wheeler</mat-icon>
                           <div>
                              <p class="text-xs font-black text-white uppercase">{{ vehicleLabel(drv.vehicleType) }}</p>
                              <p class="text-[9px] text-slate-500 font-black uppercase tracking-widest">{{ drv.licensePlate ? 'Placa: ' + drv.licensePlate : 'Placa não cadastrada' }}</p>
                           </div>
                        </div>
                        <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest">{{ driverStatusLabel(drv.status) }}</span>
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
                         <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest">Distância informada</span>
                         <p class="text-sm font-black text-white">{{ completedRoute.totalDistanceKm > 0 ? completedRoute.totalDistanceKm.toFixed(1) + ' km' : 'Não informada' }}</p>
                      </div>
                      <div class="space-y-1">
                         <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest">Tempo informado</span>
                         <p class="text-sm font-black text-white">{{ completedRoute.estimatedDuration && completedRoute.estimatedDuration !== 'Não informado' ? completedRoute.estimatedDuration : 'Não informado' }}</p>
                      </div>
                   </div>

                   <div class="pt-6 border-t border-white/5 space-y-2">
                      <div class="flex justify-between items-center text-[11px] font-bold text-slate-400">
                         <span>Valor indicado pela loja</span>
                         @if (completedRoute.totalEarnings > 0) {
                           <span>R$ {{ completedRoute.totalEarnings.toFixed(2) }}</span>
                         } @else {
                           <span class="text-amber-300">A combinar com a loja</span>
                         }
                      </div>
                      <p class="pt-3 text-[10px] font-bold text-amber-300">Pagamento não registrado neste app. Combine e receba diretamente da loja.</p>
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
             <span class="text-[8px] font-black uppercase tracking-widest">Valores das rotas</span>
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
                    <h3 class="text-xl font-black text-white uppercase tracking-tight">Registrar baixa da entrega</h3>
                    <button (click)="showProofModal.set(false)" class="p-2 text-slate-500"><mat-icon>close</mat-icon></button>
                 </div>
                 
                 <div class="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
                    <p class="text-[10px] text-amber-300 leading-relaxed">
                      Código, recebedor, assinatura e foto são campos visuais neste fluxo. Eles não são validados nem salvos; a ação registra apenas o status da entrega.
                    </p>
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
                    Registrar baixa
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

         @if (showShiftStartModal()) {
             <div class="absolute inset-0 bg-[#070110]/95 backdrop-blur-md z-[100] flex flex-col p-6 animate-in slide-in-from-bottom duration-500">
               <div class="flex justify-between items-center mb-10">
                  <h3 class="text-xl font-black text-white uppercase tracking-tight">Iniciar turno</h3>
                  <button (click)="showShiftStartModal.set(false)" class="p-2 text-slate-500"><mat-icon>close</mat-icon></button>
               </div>

               <div class="flex-1 flex flex-col items-center justify-center space-y-12">
                  <div class="w-40 h-40 rounded-[3rem] border border-purple-500/40 bg-purple-500/10 flex items-center justify-center">
                     <mat-icon class="text-7xl text-purple-300">login</mat-icon>
                  </div>

                  <div class="text-center space-y-2">
                     <h4 class="text-base font-black text-white uppercase">Leitor de QR indisponível</h4>
                     <p class="text-[10px] text-slate-500 uppercase tracking-[0.2em] max-w-[200px]">Esta ação registra o início do turno sem ler nem validar um QR Code.</p>
                  </div>

                  <button (click)="registerShiftStart()" class="w-full py-5 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl transition-all active:scale-95 cursor-pointer">
                    Registrar início do turno
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
  private readonly mapProvider = inject(MapProviderService);

  readonly currentTime = computed(() => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  readonly selectedDriverId = signal<string>('drv-3');
  readonly preferredActiveRouteId = signal<string | null>(null);
  readonly activeTab = signal<DriverScreenTab>('active_route');
  readonly selectedWaypoint = signal<DeliveryWaypoint | null>(null);
  
  // Modals state
  readonly showProofModal = signal<boolean>(false);
  readonly showChatModal = signal<boolean>(false);
  readonly showShiftStartModal = signal<boolean>(false);
  readonly modalWaypoint = signal<DeliveryWaypoint | null>(null);
  
  readonly isRoutePreviewActive = signal<boolean>(false);
  private routePreviewTimer: ReturnType<typeof setInterval> | null = null;

  // Map state
  private readonly mapContainer = viewChild<ElementRef>('mapContainer');
  private map: any = null;
  private markersLayer: any = null;
  private driverMarker: any = null;
  private L: any = null;
  private maplibreGL: any = null;
  private readonly leafletReady = signal(false);
  readonly isGpsStarting = signal(false);
  readonly isGpsSharing = signal(false);
  readonly gpsError = signal<string | null>(null);
  readonly gpsAccuracyMeters = signal<number | null>(null);
  readonly liveLocation = signal<{ lat: number; lng: number } | null>(null);
  private gpsWatchId: number | null = null;
  private gpsWatchGeneration = 0;
  private gpsRouteId: string | null = null;
  private lastGpsSentAt = 0;
  private gpsPingInFlight = false;
  private gpsPingPromise: Promise<void> | null = null;
  private readonly onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') void this.stopGpsSharing();
  };

  readonly canSwitchDriverPreview = computed(() => {
    const session = this.ecosystem.currentSession();
    return !session || session.role !== 'driver';
  });

  readonly activeDriverProfile = computed(() => {
    return this.ecosystem.drivers().find(d => d.id === this.selectedDriverId());
  });

  readonly canShareGps = computed(() => {
    const session = this.ecosystem.currentSession();
    const driver = this.activeDriverProfile();
    const route = this.currentActiveRoute();
    return this.activeTab() === 'active_route' && session?.role === 'driver' &&
      session.id === driver?.id && driver?.driverType === 'private' &&
      Boolean(driver.tenantId && route?.tenantId === driver.tenantId && route.status === 'in_progress' && route.driverId === driver.id);
  });

  readonly routesForSelectedDriver = computed(() => {
    const driverId = this.selectedDriverId();
    return this.ecosystem.deliveryRoutes().filter(r => r.driverId === driverId);
  });

  readonly currentActiveRoute = computed(() => {
    const activeRoutes = this.routesForSelectedDriver().filter(r =>
      r.status === 'in_progress' || r.status === 'at_store' || r.status === 'accepted'
    );
    const preferredRoute = activeRoutes.find(r => r.id === this.preferredActiveRouteId());
    return preferredRoute || activeRoutes.find(r => r.status === 'in_progress') ||
      activeRoutes.find(r => r.status === 'at_store') || activeRoutes.find(r => r.status === 'accepted');
  });

  readonly availableRoutes = computed(() => {
    const drv = this.activeDriverProfile();
    return this.ecosystem.deliveryRoutes().filter(r => {
      if (r.status !== 'available') return false;
      return Boolean(drv?.tenantId && r.tenantId === drv.tenantId && drv.driverType === 'private');
    });
  });

  readonly driverDefinedRouteAmountTotal = computed(() => {
    return this.routesForSelectedDriver()
      .filter((route) => route.status === 'completed')
      .reduce((sum, route) => sum + Math.max(0, route.totalEarnings || 0), 0);
  });

  readonly driverCompletedCount = computed(() => {
    return this.routesForSelectedDriver().filter(r => r.status === 'completed').reduce((sum, r) => sum + r.totalDeliveredCount, 0);
  });

  readonly driverCompletedRouteCount = computed(() =>
    this.routesForSelectedDriver().filter((route) => route.status === 'completed').length
  );

  readonly avgStoreDefinedValuePerRoute = computed(() => {
    const routes = this.routesForSelectedDriver().filter((route) => route.status === 'completed');
    return routes.length > 0 ? this.driverDefinedRouteAmountTotal() / routes.length : 0;
  });

  readonly avgStoreDefinedValuePerDelivery = computed(() => {
    const completedRoutes = this.routesForSelectedDriver().filter((route) => route.status === 'completed');
    const deliveries = completedRoutes.reduce((sum, route) => sum + route.totalDeliveredCount, 0);
    return deliveries > 0 ? this.driverDefinedRouteAmountTotal() / deliveries : 0;
  });

  readonly lastCompletedRoute = computed(() => {
    return (
      this.routesForSelectedDriver().find(r => r.status === 'completed') ||
      this.routesForSelectedDriver()[0] ||
      null
    );
  });

  readonly activeWaypoint = computed(() => this.selectedWaypoint());

  driverInitials(name: string): string {
    return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || 'EN';
  }

  vehicleLabel(vehicleType: StoreDriver['vehicleType']): string {
    const labels: Record<StoreDriver['vehicleType'], string> = {
      moto: 'Moto',
      bike: 'Bicicleta',
      carro: 'Carro'
    };
    return labels[vehicleType] || 'Veículo não informado';
  }

  driverStatusLabel(status: StoreDriver['status']): string {
    const labels: Record<StoreDriver['status'], string> = {
      available: 'Disponível',
      delivering: 'Em rota',
      offline: 'Offline'
    };
    return labels[status] || 'Status indisponível';
  }

  ngOnInit() {
    this.security.setPillar('driver');
    void Promise.allSettled([
      this.ecosystem.logisticsService.fetchDrivers(),
      this.ecosystem.logisticsService.fetchDeliveryRoutes()
    ]);
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

    // Mount the demonstration map only while the simulated route screen exists.
    effect(() => {
      const tab = this.activeTab();
      const simulationMode = this.ecosystem.isSimulationMode();
      const route = this.currentActiveRoute();
      const container = this.mapContainer()?.nativeElement;
      const leafletReady = this.leafletReady();
      this.liveLocation();
      const routeMapReady = Boolean(route && (simulationMode || route.status === 'in_progress'));
      if (tab !== 'active_route' || !routeMapReady || !container || !leafletReady) {
        if (this.map) {
          this.map.remove();
          this.map = null;
          this.markersLayer = null;
          this.driverMarker = null;
        }
        if (this.routePreviewTimer) {
          clearInterval(this.routePreviewTimer);
          this.routePreviewTimer = null;
          this.isRoutePreviewActive.set(false);
        }
        return;
      }

      if (!this.map) {
        this.initMap();
        return;
      }
      setTimeout(() => {
        this.map?.invalidateSize();
        this.updateMarkers();
      }, 150);
    });

    effect(() => {
      const sharing = this.isGpsSharing() || this.isGpsStarting();
      const canShare = this.canShareGps();
      const routeId = this.currentActiveRoute()?.id || null;
      if (sharing && (!canShare || this.gpsRouteId !== routeId)) void this.stopGpsSharing();
    });

    // Load map code only in the browser; live GPS is opt-in and foreground only.
    afterNextRender(async () => {
      try {
        const libraries = await this.mapProvider.load();
        this.L = libraries.leaflet;
        this.maplibreGL = libraries.maplibreGL;
        this.leafletReady.set(true);
        document.addEventListener('visibilitychange', this.onVisibilityChange);
      } catch {
        this.gpsError.set('Não foi possível carregar o mapa. O compartilhamento GPS continua indisponível.');
      }
    });
  }

  ngOnDestroy() {
    if (this.routePreviewTimer) {
      clearInterval(this.routePreviewTimer);
      this.routePreviewTimer = null;
    }
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onVisibilityChange);
    void this.stopGpsSharing();
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
    if (!container || !this.L || !this.maplibreGL || this.map) return;

    const simulationMode = this.ecosystem.isSimulationMode();
    const location = this.liveLocation();
    
    this.map = this.L.map(container, {
      center: simulationMode ? [-23.5651, -46.6521] : location ? [location.lat, location.lng] : [0, 0],
      zoom: simulationMode ? 14 : location ? 15 : 2,
      zoomControl: false,
      attributionControl: true,
      minZoom: 1
    });

    this.mapProvider.addBaseLayer(this.maplibreGL, this.map);
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
    if (route.status === 'at_store' || (this.ecosystem.isSimulationMode() && route.status === 'in_progress')) {
      const tenant = this.ecosystem.tenants().find(t => t.id === route.tenantId);
      if (tenant && this.isValidCoordinate(tenant.lat, tenant.lng)) {
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
      const hasCoordinate = this.isValidCoordinate(wp.lat, wp.lng);
      if (!hasCoordinate && !this.ecosystem.isSimulationMode()) return;
      const lat = hasCoordinate ? wp.lat! : -23.56 + (wp.sequenceNumber * 0.005);
      const lng = hasCoordinate ? wp.lng! : -46.65 + (wp.sequenceNumber * 0.005);
      
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
    const driverLocation = this.ecosystem.isSimulationMode()
      ? { lat: -23.5651, lng: -46.6521 }
      : this.liveLocation();
    if (driverLocation) {
      const driverIcon = this.L.divIcon({
        className: 'driver-icon',
        html: `<div class="w-8 h-8 rounded-full bg-white border-4 border-purple-600 flex items-center justify-center text-purple-600 shadow-xl animate-pulse"><i class="material-icons text-sm">navigation</i></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
      this.driverMarker = this.L.marker([driverLocation.lat, driverLocation.lng], { icon: driverIcon }).addTo(this.markersLayer);
      bounds.push([driverLocation.lat, driverLocation.lng]);
    }

    if (bounds.length > 0) {
      this.map.fitBounds(bounds as any, { padding: [40, 40] });
    }
  }

  private isValidCoordinate(lat: number | undefined, lng: number | undefined): boolean {
    return typeof lat === 'number' && Number.isFinite(lat) && lat >= -90 && lat <= 90 &&
      typeof lng === 'number' && Number.isFinite(lng) && lng >= -180 && lng <= 180;
  }

  toggleGpsSharing() {
    if (this.isGpsSharing() || this.isGpsStarting()) {
      void this.stopGpsSharing();
      return;
    }
    this.startGpsSharing();
  }

  private startGpsSharing() {
    if (!this.canShareGps()) return;
    if (!navigator.geolocation) {
      this.gpsError.set('Este aparelho ou navegador não disponibiliza GPS.');
      return;
    }

    const route = this.currentActiveRoute();
    const driver = this.activeDriverProfile();
    if (!route || !driver) return;

    const generation = ++this.gpsWatchGeneration;
    this.gpsRouteId = route.id;
    this.lastGpsSentAt = 0;
    this.gpsError.set(null);
    this.isGpsStarting.set(true);
    this.gpsWatchId = navigator.geolocation.watchPosition(
      (position) => {
        if (generation !== this.gpsWatchGeneration) return;
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        if (!this.isValidCoordinate(location.lat, location.lng)) return;
        this.liveLocation.set(location);
        this.gpsAccuracyMeters.set(position.coords.accuracy);
        if (!this.gpsPingInFlight && Date.now() - this.lastGpsSentAt >= 15000) {
          this.gpsPingInFlight = true;
          this.gpsPingPromise = this.ecosystem.logisticsService.pingDriverGps(driver.id, {
            sharing: true,
            routeId: route.id,
            ...location,
            accuracyMeters: position.coords.accuracy
          }).then(() => {
            if (generation !== this.gpsWatchGeneration) return;
            this.lastGpsSentAt = Date.now();
            this.isGpsStarting.set(false);
            this.isGpsSharing.set(true);
            this.gpsError.set(null);
          }).catch(() => {
            if (generation !== this.gpsWatchGeneration) return;
            this.gpsError.set('Não foi possível enviar a posição para a loja. O compartilhamento foi encerrado.');
            void this.stopGpsSharing();
          }).finally(() => {
            this.gpsPingInFlight = false;
            this.gpsPingPromise = null;
          });
        }
      },
      (error) => {
        if (generation !== this.gpsWatchGeneration) return;
        const message = error.code === error.PERMISSION_DENIED
          ? 'Permita o acesso à localização no navegador para compartilhar o GPS.'
          : error.code === error.TIMEOUT
            ? 'O GPS demorou para responder. Tente novamente em uma área aberta.'
            : 'Não foi possível obter a localização deste aparelho.';
        this.gpsError.set(message);
        void this.stopGpsSharing();
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
  }

  private async stopGpsSharing() {
    const driverId = this.activeDriverProfile()?.id;
    const shouldClearRemote = this.isGpsSharing() || this.gpsWatchId !== null;
    this.gpsWatchGeneration += 1;
    if (this.gpsWatchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.gpsWatchId);
      this.gpsWatchId = null;
    }
    this.isGpsStarting.set(false);
    this.isGpsSharing.set(false);
    this.liveLocation.set(null);
    this.gpsAccuracyMeters.set(null);
    this.gpsRouteId = null;
    this.lastGpsSentAt = 0;
    if (this.gpsPingPromise) await this.gpsPingPromise;
    if (this.driverMarker && this.map) {
      this.driverMarker.remove();
      this.driverMarker = null;
    }
    if (shouldClearRemote && driverId && !this.ecosystem.isSimulationMode()) {
      try {
        await this.ecosystem.logisticsService.pingDriverGps(driverId, { sharing: false });
      } catch {
        this.gpsError.set('O GPS parou neste aparelho; a posição da loja expirará em até 2 minutos.');
      }
    }
  }

  nextWaypoint(route: DeliveryRoute): DeliveryWaypoint | null {
    return route.waypoints.find(w => w.status === 'pending' || w.status === 'in_transit') || null;
  }

  completedWaypointsCount(route: DeliveryRoute): number {
    return route.waypoints.filter(w => w.status === 'completed').length;
  }

  async acceptRoute(routeId: string) {
    try {
      await this.ecosystem.acceptDeliveryRoute(routeId, this.selectedDriverId());
      this.preferredActiveRouteId.set(routeId);
      this.activeTab.set('active_route');
      setTimeout(() => this.updateMarkers(), 100);
    } catch {
      this.ecosystem.notify('Não foi possível aceitar esta rota.', 'error');
    }
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

  async confirmDeliveryProof() {
    const wp = this.modalWaypoint();
    const route = this.currentActiveRoute();
    if (!wp || !route) return;

    try {
      await this.ecosystem.advanceWaypointStatus(route.id, wp.id, 'completed');
      if (!this.ecosystem.isSimulationMode() && wp.customerPhone) {
        this.ecosystem.sendWhatsAppMessage(
          wp.customerPhone,
          `Sua entrega ${route.routeCode} foi concluída por ${this.activeDriverProfile()?.name || 'Entregador'}. Obrigado por usar a 3EAT. ⭐`,
          wp.customerName
        );
      }
      this.showProofModal.set(false);

      // If all done, show summary
      const updatedRoute = this.ecosystem.deliveryRoutes().find(r => r.id === route.id);
      if (updatedRoute && updatedRoute.status === 'completed') {
        this.preferredActiveRouteId.set(null);
        this.activeTab.set('proof_summary');
      } else {
        this.activeTab.set('active_route');
        this.updateMarkers();
      }
    } catch {
      this.ecosystem.notify('Não foi possível registrar a baixa da entrega.', 'error');
    }
  }

  async arriveAtStore(routeId: string) {
    try {
      await this.ecosystem.markArrivedAtStore(routeId);
    } catch {
      this.ecosystem.notify('Não foi possível registrar a chegada à loja.', 'error');
    }
  }

  openShiftStartModal() {
    this.showShiftStartModal.set(true);
  }

  async registerShiftStart() {
    const driverId = this.selectedDriverId();
    try {
      await this.ecosystem.clockInDriver(driverId);
      this.showShiftStartModal.set(false);
      setTimeout(() => this.updateMarkers(), 100);
    } catch {
      this.ecosystem.notify('Não foi possível registrar o início do turno.', 'error');
    }
  }

  async confirmPickup(routeId: string) {
    if (!routeId) return;
    try {
      await this.ecosystem.confirmPickup(routeId);
      setTimeout(() => this.updateMarkers(), 100);
    } catch {
      this.ecosystem.notify('Não foi possível confirmar a coleta.', 'error');
    }
  }

  toggleRoutePreview() {
    if (!this.ecosystem.isSimulationMode()) {
      this.ecosystem.notify('A prévia de navegação está disponível apenas no modo simulado.', 'warning');
      return;
    }

    if (this.isRoutePreviewActive()) {
      this.isRoutePreviewActive.set(false);
      if (this.routePreviewTimer) {
        clearInterval(this.routePreviewTimer);
        this.routePreviewTimer = null;
      }
    } else {
      this.isRoutePreviewActive.set(true);
      this.routePreviewTimer = setInterval(() => {
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
               void this.ecosystem.advanceWaypointStatus(route!.id, nextWp.id, 'arrived').catch(() => {
                 this.ecosystem.notify('Não foi possível atualizar a parada da prévia.', 'error');
               });
               this.ecosystem.notify('A prévia chegou ao destino. Registre a baixa quando confirmar a entrega.', 'info');
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


