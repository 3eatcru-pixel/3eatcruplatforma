import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { EcosystemService } from '../../services/ecosystem.service';
import { DriverAppComponent } from '../driver-app';
import { RegionalMarketplaceComponent } from '../regional-marketplace';
import { RegionalMarketplaceMobileComponent } from '../marketplace/regional-marketplace-mobile';
import { CustomerStorefrontComponent } from '../customer-storefront';
import { WaiterAppComponent } from '../waiter-app';

export type PreviewAppType = 'driver' | 'consumer' | 'waiter' | 'storefront';
export type DeviceModelType = 'pixel' | 'galaxy' | 'xiaomi';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-hq-apps-preview',
  imports: [
    CommonModule,
    MatIconModule,
    DriverAppComponent,
    RegionalMarketplaceComponent,
    RegionalMarketplaceMobileComponent,
    CustomerStorefrontComponent,
    WaiterAppComponent
  ],
  template: `
    <div class="space-y-6 text-stone-200 font-sans">
      
      <!-- HEADER BANNER FOR ANDROID APPS AUDIT CONSOLE -->
      <div class="bg-gradient-to-r from-[#211107] via-[#2a160b] to-[#1a0c05] border-2 border-[#4d2813] rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div class="absolute -right-8 -bottom-8 opacity-10 pointer-events-none text-amber-500">
          <mat-icon class="text-[160px]">smartphone</mat-icon>
        </div>

        <div class="relative z-10 space-y-2">
          <div class="flex items-center gap-2 text-amber-500 font-serif font-black uppercase text-[10px] tracking-widest">
            <mat-icon class="text-sm text-amber-400">android</mat-icon>
            <span>Prévia visual dos componentes web</span>
            <span class="bg-amber-950 text-amber-300 border border-amber-700/60 px-2 py-0.5 rounded font-mono text-[9px]">SIMULAÇÃO • SEM APK CONECTADO</span>
          </div>

          <h2 class="text-2xl sm:text-3xl font-serif font-black tracking-tight text-white">
            Prévia em chassis de dispositivo simulado
          </h2>

          <p class="text-stone-400 text-xs font-serif max-w-2xl leading-relaxed">
            Esta tela renderiza componentes web em um frame visual. Não comprova APK compilado, publicação na Google Play, permissões nativas, conexão GPS ou envio de notificações push.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3 relative z-10 shrink-0">
          <button
            type="button"
            (click)="triggerPushNotification()"
            class="bg-[#3b1e0d] hover:bg-amber-900/50 text-amber-300 font-bold px-4 py-3 rounded-2xl border border-amber-600/40 text-xs flex items-center gap-2 cursor-pointer shadow-lg transition-all active:scale-95">
            <mat-icon class="text-sm text-amber-400">notifications_active</mat-icon>
            <span>Simular alerta local</span>
          </button>

          <button
            type="button"
            (click)="showManifestModal.set(true)"
            class="bg-[#211107] hover:bg-[#2e180a] text-stone-300 font-mono text-xs font-bold py-3 px-4 rounded-2xl border border-[#482814] flex items-center gap-2 cursor-pointer shadow">
            <mat-icon class="text-sm text-cyan-400">code</mat-icon>
            <span>Manifesto de referência</span>
          </button>
        </div>
      </div>

      <!-- MAIN AUDIT WORKSPACE -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        <!-- LEFT / TOP CONTROLS & AUDIT METRICS -->
        <div class="lg:col-span-4 space-y-6">
          
          <!-- APP SELECTOR CARD -->
          <div class="bg-[#201007] border border-[#482814] rounded-3xl p-5 shadow-2xl space-y-4">
            <h3 class="font-serif font-black text-white text-sm uppercase tracking-wider flex items-center gap-2 border-b border-[#3d200f] pb-2">
              <mat-icon class="text-amber-500">apps</mat-icon>
              <span>Selecione o Aplicativo</span>
            </h3>

            <div class="space-y-2">
              <!-- DRIVER APP OPTION -->
              <button
                type="button"
                (click)="selectedApp.set('driver')"
                [class]="selectedApp() === 'driver' ? 'bg-gradient-to-r from-purple-900/80 to-purple-950 border-purple-500/80 text-white shadow-lg' : 'bg-[#150a04] border-[#381c0c] text-stone-400 hover:text-stone-200'"
                class="w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/40 text-purple-400 flex items-center justify-center font-bold">
                    <mat-icon>two_wheeler</mat-icon>
                  </div>
                  <div>
                    <h4 class="font-bold text-xs uppercase text-white flex items-center gap-1.5">
                      <span>Interface do motorista (prévia)</span>
                      <span class="text-[9px] font-mono bg-purple-950 text-purple-300 px-1.5 py-0.2 rounded border border-purple-700/50">EXEMPLO</span>
                    </h4>
                    <p class="text-[10px] text-stone-400 mt-0.5">Conteúdo ilustrativo de rota, check-in e entrega.</p>
                  </div>
                </div>
                <mat-icon [class.text-purple-400]="selectedApp() === 'driver'" class="text-stone-600">chevron_right</mat-icon>
              </button>

              <!-- CONSUMER MARKETPLACE APP OPTION -->
              <button
                type="button"
                (click)="selectedApp.set('consumer')"
                [class]="selectedApp() === 'consumer' ? 'bg-gradient-to-r from-amber-900/80 to-orange-950 border-amber-500/80 text-white shadow-lg' : 'bg-[#150a04] border-[#381c0c] text-stone-400 hover:text-stone-200'"
                class="w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-amber-600/30 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold">
                    <mat-icon>storefront</mat-icon>
                  </div>
                  <div>
                    <h4 class="font-bold text-xs uppercase text-white flex items-center gap-1.5">
                      <span>Interface do consumidor (prévia)</span>
                      <span class="text-[9px] font-mono bg-amber-950 text-amber-300 px-1.5 py-0.2 rounded border border-amber-700/50">EXEMPLO</span>
                    </h4>
                    <p class="text-[10px] text-stone-400 mt-0.5">Catálogo Regional, Busca Geodésica, Fichário de Lojas e Checkout PIX.</p>
                  </div>
                </div>
                <mat-icon [class.text-amber-400]="selectedApp() === 'consumer'" class="text-stone-600">chevron_right</mat-icon>
              </button>

              <!-- WAITER COMANDA APP OPTION -->
              <button
                type="button"
                (click)="selectedApp.set('waiter')"
                [class]="selectedApp() === 'waiter' ? 'bg-gradient-to-r from-amber-700/80 to-amber-950 border-amber-500/80 text-white shadow-lg' : 'bg-[#150a04] border-[#381c0c] text-stone-400 hover:text-stone-200'"
                class="w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-amber-600/30 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold">
                    <mat-icon>table_bar</mat-icon>
                  </div>
                  <div>
                    <h4 class="font-bold text-xs uppercase text-white flex items-center gap-1.5">
                      <span>App Comanda Garçom</span>
                      <span class="text-[9px] font-mono bg-amber-950 text-amber-300 px-1.5 py-0.2 rounded border border-amber-700/50">com.eatcru.waiter</span>
                    </h4>
                    <p class="text-[10px] text-stone-400 mt-0.5">Comandas de Mesa, 3 Tempos de Cozinha, KDS e Pareamento QR Code.</p>
                  </div>
                </div>
                <mat-icon [class.text-amber-400]="selectedApp() === 'waiter'" class="text-stone-600">chevron_right</mat-icon>
              </button>

              <!-- STOREFRONT NATIVE APP OPTION -->
              <button
                type="button"
                (click)="selectedApp.set('storefront')"
                [class]="selectedApp() === 'storefront' ? 'bg-gradient-to-r from-emerald-900/80 to-teal-950 border-emerald-500/80 text-white shadow-lg' : 'bg-[#150a04] border-[#381c0c] text-stone-400 hover:text-stone-200'"
                class="w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold">
                    <mat-icon>restaurant</mat-icon>
                  </div>
                  <div>
                    <h4 class="font-bold text-xs uppercase text-white flex items-center gap-1.5">
                      <span>Interface de loja (prévia)</span>
                      <span class="text-[9px] font-mono bg-emerald-950 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-700/50">EXEMPLO</span>
                    </h4>
                    <p class="text-[10px] text-stone-400 mt-0.5">Conteúdo ilustrativo de uma vitrine de loja.</p>
                  </div>
                </div>
                <mat-icon [class.text-emerald-400]="selectedApp() === 'storefront'" class="text-stone-600">chevron_right</mat-icon>
              </button>
            </div>
          </div>

          <!-- DEVICE CHASSIS & ENVIRONMENT CONTROLS -->
          <div class="bg-[#201007] border border-[#482814] rounded-3xl p-5 shadow-2xl space-y-4">
            <h3 class="font-serif font-black text-white text-sm uppercase tracking-wider flex items-center gap-2 border-b border-[#3d200f] pb-2">
              <mat-icon class="text-amber-500">settings_cell</mat-icon>
              <span>Chassis visual e dados ilustrativos</span>
            </h3>

            <!-- FORM FACTOR SELECTOR -->
            <div class="space-y-1.5">
              <span class="block font-mono text-[10px] font-bold text-amber-500 uppercase">Formato da prévia:</span>
              <div class="grid grid-cols-2 gap-2 bg-[#150a04] p-1.5 rounded-2xl border border-[#3d200f]">
                <button
                  type="button"
                  (click)="viewportMode.set('smartphone')"
                  [class]="viewportMode() === 'smartphone' ? 'bg-amber-600 text-stone-950 font-black shadow' : 'text-stone-400 hover:text-white font-bold'"
                  class="py-2 px-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer">
                  <mat-icon class="text-sm">smartphone</mat-icon>
                  <span>Smartphone</span>
                </button>

                <button
                  type="button"
                  (click)="viewportMode.set('tablet')"
                  [class]="viewportMode() === 'tablet' ? 'bg-amber-600 text-stone-950 font-black shadow' : 'text-stone-400 hover:text-white font-bold'"
                  class="py-2 px-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer">
                  <mat-icon class="text-sm">tablet_mac</mat-icon>
                  <span>Tablet / Desktop</span>
                </button>
              </div>
            </div>

            <div class="space-y-3 text-xs pt-1">
              @if (viewportMode() === 'smartphone') {
                <div>
                  <label for="deviceModelSelect" class="block font-mono text-[10px] font-bold text-amber-500 uppercase mb-1">Modelo de Smartphone</label>
                  <select
                    id="deviceModelSelect"
                    [value]="selectedDevice()"
                    (change)="selectedDevice.set($any($event.target).value)"
                    class="w-full bg-[#150a04] border border-[#482814] rounded-xl px-3 py-2 text-white font-bold focus:border-amber-500 outline-none cursor-pointer">
                    <option value="pixel">Google Pixel 8 Pro (Android 14 Vanilla)</option>
                    <option value="galaxy">Samsung Galaxy S24 Ultra (One UI 6.1)</option>
                    <option value="xiaomi">Xiaomi 14 Pro (HyperOS)</option>
                  </select>
                </div>
              } @else {
                <div>
                  <label for="tabletModelSelect" class="block font-mono text-[10px] font-bold text-amber-500 uppercase mb-1">Modelo de Tablet / Terminal</label>
                  <select
                    id="tabletModelSelect"
                    class="w-full bg-[#150a04] border border-[#482814] rounded-xl px-3 py-2 text-white font-bold focus:border-amber-500 outline-none cursor-pointer">
                    <option value="tab_s9">Samsung Galaxy Tab S9 Ultra (14.6" AMOLED)</option>
                    <option value="ipad_pro">iPad Pro 12.9" M4 (Liquid Retina XDR)</option>
                    <option value="pos_terminal">Terminal POS Touch Industrial 15.6"</option>
                  </select>
                </div>
              }

              <div class="p-3 bg-[#150a04] border border-[#3d200f] rounded-2xl space-y-2">
                  <span class="text-stone-400">Perfil visual de referência:</span>
                  <span class="text-amber-400 font-bold">
                    {{ viewportMode() === 'smartphone' ? 'Smartphone em retrato' : 'Tablet / desktop em widescreen' }}
                  </span>
                <div class="flex justify-between items-center text-[10px] font-mono">
                  <span class="text-stone-400">Layout Engine:</span>
                  <span class="text-emerald-400 font-bold">
                    {{ viewportMode() === 'smartphone' ? 'Composição mobile simulada' : 'Composição widescreen simulada' }}
                  </span>
                </div>
                <div class="flex justify-between items-center text-[10px] font-mono">
                  <span class="text-stone-400">Build Android:</span>
                  <span class="text-stone-200 font-bold">Não configurado</span>
                </div>
              </div>

              <div class="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  (click)="openAppFullscreen()"
                  class="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-black py-3 rounded-2xl shadow-lg text-xs uppercase flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95">
                  <mat-icon class="text-sm">open_in_new</mat-icon>
                  <span>Abrir prévia em janela inteira</span>
                </button>
              </div>
            </div>
          </div>

          <!-- APK BUILD & PERMISSIONS TELEMETRY CARD -->
          <div class="bg-[#faf7f0] border border-[#ded4c2] rounded-3xl p-5 shadow-xl text-stone-950 space-y-3">
            <div class="flex justify-between items-center border-b border-[#e8dfce] pb-2">
              <span class="font-serif font-black text-xs uppercase text-amber-900">Artefatos de referência</span>
              <span class="bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-mono font-bold px-2 py-0.5 rounded">APK NÃO LOCALIZADO</span>
            </div>

            <div class="space-y-1.5 text-[11px] font-mono">
              <div class="flex justify-between">
                <span class="text-stone-500">Identificador de exemplo:</span>
                <span class="font-bold text-stone-900">{{ currentPackageName() }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-stone-500">Versão:</span>
                <span class="font-bold text-amber-900">Versão não declarada</span>
              </div>
              <div class="flex justify-between">
                <span class="text-stone-500">Form Factor:</span>
                <span class="font-bold text-stone-900 uppercase">{{ viewportMode() }}</span>
              </div>
            </div>

            <div class="pt-2 border-t border-[#e8dfce] space-y-1">
              <span class="text-[9px] font-mono font-bold text-stone-500 uppercase block">Permissões no exemplo de manifesto (não verificadas em APK):</span>
              <div class="flex flex-wrap gap-1">
                <span class="bg-stone-200 text-stone-800 px-2 py-0.5 rounded text-[9px] font-mono font-bold">ACCESS_FINE_LOCATION</span>
                <span class="bg-stone-200 text-stone-800 px-2 py-0.5 rounded text-[9px] font-mono font-bold">POST_NOTIFICATIONS</span>
                <span class="bg-stone-200 text-stone-800 px-2 py-0.5 rounded text-[9px] font-mono font-bold">CAMERA</span>
                <span class="bg-stone-200 text-stone-800 px-2 py-0.5 rounded text-[9px] font-mono font-bold">INTERNET</span>
              </div>
            </div>
          </div>

        </div>

        <!-- RIGHT / CENTER: DEVICE FRAME CHASSIS AUDIT -->
        <div class="lg:col-span-8 flex flex-col items-center justify-center space-y-4">
          
          <!-- TOP FRAME LABEL -->
          <div class="flex items-center gap-3 bg-[#201007] border border-[#482814] px-4 py-2 rounded-2xl text-xs font-mono">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span class="text-stone-300">MOLDURA SIMULADA ({{ viewportMode() === 'smartphone' ? 'SMARTPHONE RETRATO' : 'TABLET/DESKTOP WIDESCREEN' }}):</span>
            <strong class="text-amber-400 font-bold uppercase">{{ selectedAppTitle() }}</strong>
            <span class="text-stone-500">(COMPONENTE WEB)</span>
          </div>

          <!-- SMARTPHONE OR TABLET/DESKTOP CHASSIS CONTAINER -->
          @if (viewportMode() === 'smartphone') {
            <!-- SMARTPHONE CHASSIS -->
            <div class="relative w-[380px] sm:w-[410px] h-[780px] bg-[#121212] rounded-[3.5rem] p-3 shadow-[0_25px_80px_rgba(0,0,0,0.9)] border-4 border-[#333333] ring-1 ring-white/10 flex flex-col items-center overflow-hidden group">
              
              <!-- HARDWARE CHASSIS PHYSICAL BUTTONS -->
              <div class="absolute -left-[7px] top-28 w-[3px] h-12 bg-stone-700 rounded-l-md"></div>
              <div class="absolute -left-[7px] top-44 w-[3px] h-12 bg-stone-700 rounded-l-md"></div>
              <div class="absolute -right-[7px] top-36 w-[3px] h-16 bg-stone-700 rounded-r-md"></div>

              <!-- SMARTPHONE INNER BEZEL SCREEN -->
              <div class="w-full h-full bg-black rounded-[2.8rem] relative overflow-hidden flex flex-col border border-stone-800">
                
                <!-- TOP CAMERA PUNCH-HOLE NOTCH & SPEAKER -->
                <div class="absolute top-2 left-1/2 -translate-x-1/2 z-[100] flex items-center justify-center">
                  <div class="w-20 h-4 bg-black rounded-full border border-stone-800 flex items-center justify-center gap-2 shadow-md">
                    <div class="w-2.5 h-2.5 rounded-full bg-[#111] border border-stone-700"></div>
                    <div class="w-1.5 h-1.5 rounded-full bg-blue-900/60"></div>
                  </div>
                </div>

                <!-- ANDROID TOP STATUS BAR -->
                <div class="px-6 pt-3 pb-1 flex justify-between items-center text-[10px] font-bold text-white z-[90] bg-black/40 backdrop-blur-sm shrink-0">
                  <span class="font-mono">{{ currentTime() }}</span>
                  <div class="flex items-center gap-1.5 text-stone-300">
                    <mat-icon class="text-[12px] w-3.5 h-3.5">signal_cellular_4_bar</mat-icon>
                    <span class="text-[9px] font-mono">5G</span>
                    <mat-icon class="text-[12px] w-3.5 h-3.5">wifi</mat-icon>
                    <div class="flex items-center text-[9px] font-mono gap-0.5">
                      <mat-icon class="text-[12px] w-3.5 h-3.5 text-emerald-400">battery_full</mat-icon>
                      <span>100%</span>
                    </div>
                  </div>
                </div>

                <!-- PUSH NOTIFICATION BANNER OVERLAY (AUDIT) -->
                @if (activePushAudit(); as notif) {
                  <div class="absolute top-10 left-3 right-3 z-[120] bg-stone-900/95 border border-amber-500/50 text-white rounded-2xl p-3.5 shadow-2xl animate-in slide-in-from-top duration-300 flex items-start gap-3 backdrop-blur-md">
                    <div class="w-8 h-8 rounded-xl bg-amber-600 text-stone-950 flex items-center justify-center font-black shrink-0 shadow">
                      <mat-icon class="text-sm">notifications</mat-icon>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex justify-between items-center">
                        <span class="text-[9px] font-mono font-bold text-amber-400 uppercase">ALERTA LOCAL DE DEMONSTRAÇÃO</span>
                        <span class="text-[8px] text-stone-400 font-mono">{{ notif.time }}</span>
                      </div>
                      <h5 class="text-xs font-bold text-white uppercase truncate mt-0.5">{{ notif.title }}</h5>
                      <p class="text-[10px] text-stone-300 leading-snug line-clamp-2 mt-0.5">{{ notif.message }}</p>
                    </div>
                    <button (click)="activePushAudit.set(null)" class="text-stone-400 hover:text-white p-1">✕</button>
                  </div>
                }

                <!-- SCREEN SCROLLABLE VIEWPORT CONTAINING REAL APP MODULE -->
                <div class="flex-1 overflow-y-auto custom-scrollbar relative z-10">
                  @if (selectedApp() === 'driver') {
                    <app-driver-app></app-driver-app>
                  } @else if (selectedApp() === 'consumer') {
                    <app-regional-marketplace-mobile></app-regional-marketplace-mobile>
                  } @else if (selectedApp() === 'waiter') {
                    <app-waiter-app></app-waiter-app>
                  } @else if (selectedApp() === 'storefront') {
                    <app-customer-storefront></app-customer-storefront>
                  }
                </div>

                <!-- ANDROID SYSTEM BOTTOM GESTURE NAVIGATION BAR -->
                <div class="py-2 flex justify-center items-center bg-black/80 backdrop-blur-sm z-[90] shrink-0 border-t border-white/5">
                  <div class="w-32 h-1 bg-stone-400/60 rounded-full"></div>
                </div>

              </div>
            </div>
          } @else {
            <!-- TABLET / DESKTOP WIDESCREEN CHASSIS -->
            <div class="relative w-full max-w-4xl h-[680px] bg-[#1a1a1a] rounded-3xl p-4 shadow-[0_25px_80px_rgba(0,0,0,0.9)] border-4 border-[#3a3a3a] ring-1 ring-white/10 flex flex-col items-center overflow-hidden group">
              
              <!-- TABLET BEZEL SCREEN -->
              <div class="w-full h-full bg-[#0a0a0a] rounded-2xl relative overflow-hidden flex flex-col border border-stone-800 shadow-inner">
                
                <!-- TOP STATUS BAR FOR TABLET/DESKTOP -->
                <div class="px-6 py-2 bg-stone-900 border-b border-stone-800 flex justify-between items-center text-xs font-mono text-stone-300 shrink-0">
                  <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <span class="font-bold text-white uppercase">{{ selectedAppTitle() }}</span>
                    <span class="text-stone-500 font-mono">({{ currentPackageName() }})</span>
                  </div>
                  <div class="flex items-center gap-4 text-[11px]">
                    <span>MODO TABLET &amp; DESKTOP (WIDESCREEN 16:10)</span>
                    <span class="text-amber-400 font-bold">2560 x 1600 px</span>
                  </div>
                </div>

                <!-- TABLET SCREEN SCROLLABLE VIEWPORT -->
                <div class="flex-1 overflow-y-auto custom-scrollbar relative z-10 p-2">
                  @if (selectedApp() === 'driver') {
                    <app-driver-app></app-driver-app>
                  } @else if (selectedApp() === 'consumer') {
                    <app-regional-marketplace></app-regional-marketplace>
                  } @else if (selectedApp() === 'waiter') {
                    <app-waiter-app></app-waiter-app>
                  } @else if (selectedApp() === 'storefront') {
                    <app-customer-storefront></app-customer-storefront>
                  }
                </div>

              </div>
            </div>
          }

        </div>

      </div>

      <!-- MANIFESTO XML MODAL -->
      @if (showManifestModal()) {
        <div class="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div class="bg-[#1d1008] border-2 border-amber-600/50 rounded-3xl max-w-2xl w-full p-6 text-stone-200 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div class="flex justify-between items-center pb-3 border-b border-[#3d200f]">
              <h3 class="font-serif font-black text-lg text-white flex items-center gap-2">
                <mat-icon class="text-amber-500">code</mat-icon> Exemplo de AndroidManifest.xml (não compilado)
              </h3>
              <button (click)="showManifestModal.set(false)" class="text-stone-400 hover:text-white font-bold text-lg cursor-pointer">✕</button>
            </div>

            <p class="text-xs text-amber-200">Modelo ilustrativo. Não corresponde a um manifesto validado ou empacotado no repositório.</p>
            <div class="bg-[#0f0703] border border-[#3d200f] rounded-2xl p-4 font-mono text-[11px] text-amber-300/90 overflow-x-auto max-h-96 leading-relaxed custom-scrollbar selection:bg-amber-800 selection:text-white">
<pre>&lt;?xml version="1.0" encoding="utf-8"?&gt;
&lt;manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="{{ currentPackageName() }}"
    android:versionCode="1"
    android:versionName="0.0.0-example"&gt;

    &lt;!-- Permissões para GPS Geodésico &amp; Roteamento --&gt;
    &lt;uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" /&gt;
    &lt;uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" /&gt;
    &lt;uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" /&gt;

    &lt;!-- Permissões de Notificação &amp; Câmera --&gt;
    &lt;uses-permission android:name="android.permission.POST_NOTIFICATIONS" /&gt;
    &lt;uses-permission android:name="android.permission.CAMERA" /&gt;
    &lt;uses-permission android:name="android.permission.INTERNET" /&gt;
    &lt;uses-permission android:name="android.permission.VIBRATE" /&gt;

    &lt;application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="{{ selectedAppTitle() }}"
        android:supportsRtl="true"
        android:theme="@style/Theme.3EATNative"&gt;
        
        &lt;activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="portrait"
            android:configChanges="orientation|keyboardHidden|screenSize"&gt;
            &lt;intent-filter&gt;
                &lt;action android:name="android.intent.action.MAIN" /&gt;
                &lt;category android:name="android.intent.category.LAUNCHER" /&gt;
            &lt;/intent-filter&gt;
        &lt;/activity&gt;
    &lt;/application&gt;
&lt;/manifest&gt;</pre>
            </div>

            <div class="flex justify-end pt-2">
              <button (click)="showManifestModal.set(false)" class="bg-amber-600 hover:bg-amber-500 text-stone-950 font-black py-2.5 px-6 rounded-xl text-xs uppercase cursor-pointer">
                Fechar Manifesto
              </button>
            </div>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(217, 119, 6, 0.3); border-radius: 4px; }
  `]
})
export class HqAppsPreviewComponent {
  readonly ecosystem = inject(EcosystemService);
  private readonly router = inject(Router);

  readonly selectedApp = signal<PreviewAppType>('driver');
  readonly selectedDevice = signal<DeviceModelType>('pixel');
  readonly viewportMode = signal<'smartphone' | 'tablet'>('smartphone');
  readonly showManifestModal = signal<boolean>(false);
  readonly activePushAudit = signal<{ title: string; message: string; time: string } | null>(null);

  readonly currentTime = computed(() => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  readonly currentPackageName = computed(() => {
    switch (this.selectedApp()) {
      case 'driver': return 'com.eatcru.driver';
      case 'consumer': return 'com.eatcru.consumer';
      case 'waiter': return 'com.eatcru.waiter';
      case 'storefront': return 'com.eatcru.storefront';
    }
  });

  readonly selectedAppTitle = computed(() => {
    switch (this.selectedApp()) {
      case 'driver': return '3EAT Entregas (Driver App)';
      case 'consumer': return '3EAT Regional Marketplace';
      case 'waiter': return '3EAT Garçom & Comanda Mobile';
      case 'storefront': return '3EAT Vitrine Web';
    }
  });

  triggerPushNotification() {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (this.selectedApp() === 'driver') {
      this.activePushAudit.set({
        title: '🛵 Nova Rota Despachada! #2852',
        message: 'Você tem uma nova rota agrupada com 3 entregas na região Bela Vista. Toque para aceitar.',
        time
      });
      this.ecosystem.notify('Alerta de demonstração exibido localmente nesta prévia.', 'info');
    } else if (this.selectedApp() === 'waiter') {
      this.activePushAudit.set({
        title: '🔔 Mesa 4: Fechamento Solicitado!',
        message: 'A Mesa 4 solicitou o fechamento da conta com divisão para 2 pessoas.',
        time
      });
      this.ecosystem.notify('Alerta de demonstração exibido localmente nesta prévia.', 'info');
    } else {
      this.activePushAudit.set({
        title: '🔥 Cupom de 20% OFF Liberado!',
        message: 'Aproveite descontos especiais nos balcões da Avenida Paulista até as 22h.',
        time
      });
      this.ecosystem.notify('Alerta de demonstração exibido localmente nesta prévia.', 'info');
    }
  }

  openAppFullscreen() {
    const app = this.selectedApp();
    if (app === 'driver') {
      this.ecosystem.activeTab.set('driver');
      this.router.navigate(['/driver']);
    } else if (app === 'waiter') {
      this.router.navigate(['/waiter']);
    } else if (app === 'consumer') {
      this.ecosystem.openRegionalMarketplace();
    } else {
      this.ecosystem.openStorefront(this.ecosystem.currentTenantId());
    }
  }
}
