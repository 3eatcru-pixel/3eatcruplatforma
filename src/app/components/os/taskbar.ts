import { ChangeDetectionStrategy, Component, input, output, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EcosystemService } from '../../services/ecosystem.service';
import { OSWindow } from '../../models/os.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-os-taskbar',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-12 bg-[#180b04]/98 backdrop-blur-xl border-t-2 border-[#3d1d0a] px-3 sm:px-4 flex items-center justify-between z-[400] text-stone-200 select-none shadow-[0_-5px_25px_rgba(0,0,0,0.8)]">
      
      <!-- LEFT: START BUTTON & OPEN WINDOWS LIST -->
      <div class="flex items-center gap-2 overflow-x-auto custom-scrollbar max-w-[60%] py-1">
        
        <!-- START MENU BUTTON -->
        <button
          type="button"
          (click)="startClicked.emit()"
          class="w-9 h-9 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 flex items-center justify-center transition-all font-black shadow-lg cursor-pointer shrink-0 active:scale-95 group">
          <mat-icon class="text-xl group-hover:rotate-12 transition-transform">apps</mat-icon>
        </button>

        <!-- FAVORITES DOCK -->
        <div class="flex items-center gap-1.5 px-2 border-r border-[#3d200f] h-8">
          @for (appId of favorites(); track appId) {
            <button
              type="button"
              (click)="favoriteSelected.emit(appId)"
              class="w-8 h-8 rounded-xl bg-[#2a160b] hover:bg-[#3d200f] border border-[#4d2813] flex items-center justify-center text-amber-400 cursor-pointer shadow-sm active:scale-90 transition-all group"
              [title]="appId">
              <mat-icon class="text-sm group-hover:scale-110 transition-transform">
                {{ getAppIcon(appId) }}
              </mat-icon>
            </button>
          }
        </div>

        <!-- OPEN WINDOWS BUTTONS IN TASKBAR -->
        <div class="flex items-center gap-1.5 border-l border-[#3d200f] pl-2">
          @for (win of openWindows(); track win.id) {
            <button
              type="button"
              (click)="windowSelected.emit(win.id)"
              [class]="win.id === activeWinId() && !win.isMinimized 
                ? 'bg-[#3d200f] text-amber-300 border-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.2)]' 
                : 'bg-[#211006] text-stone-400 border-[#3d200f] hover:bg-[#2e160a] hover:text-stone-200'"
              class="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 max-w-[160px] group relative">
              
              <mat-icon class="text-sm text-amber-400 shrink-0">{{ win.icon }}</mat-icon>
              <span class="truncate text-[11px]">{{ win.title }}</span>

              <!-- Active status indicator dot -->
              @if (win.id === activeWinId() && !win.isMinimized) {
                <span class="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 animate-pulse"></span>
              } @else if (win.isMinimized) {
                <span class="w-1.5 h-1.5 rounded-full bg-stone-600 shrink-0"></span>
              }
            </button>
          }
        </div>

      </div>

      <!-- RIGHT: SYSTEM TRAY, STORE SWITCHER & CLOCK -->
      <div class="flex items-center gap-2.5 text-xs shrink-0">
        
        <!-- VIRTUAL KEYBOARD TOGGLE -->
        <button
          type="button"
          (click)="keyboardClicked.emit()"
          class="w-8 h-8 rounded-xl bg-[#2a160b] hover:bg-[#381e0e] flex items-center justify-center text-amber-400 transition-colors border border-[#4d2813] cursor-pointer shadow-sm"
          title="Teclado Virtual">
          <mat-icon class="text-sm">keyboard</mat-icon>
        </button>

        <!-- STORE TENANT SWITCHER WIDGET -->
        <div class="relative">
          <button
            type="button"
            (click)="companyMenuClicked.emit()"
            class="flex items-center gap-2 bg-[#2a160b] hover:bg-[#381e0e] border border-[#4d2813] px-2.5 py-1 rounded-xl transition-all text-left cursor-pointer shadow-sm">
            <div class="text-right leading-tight hidden md:block">
              <div class="font-bold text-[11px] text-amber-200 truncate max-w-[120px]">
                {{ currentTenant()?.name }}
              </div>
              <div class="text-[9px] text-emerald-400 font-bold flex items-center justify-end gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Online
              </div>
            </div>
            <div class="w-7 h-7 rounded-lg bg-amber-600/30 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <mat-icon class="text-xs">store</mat-icon>
            </div>
          </button>

          <!-- COMPANY DROPDOWN MENU -->
          @if (showCompanyMenu()) {
            <div class="absolute bottom-12 right-0 bg-[#1d1008] border-2 border-[#4d2813] rounded-2xl shadow-2xl p-2 w-72 space-y-1 z-[500] animate-in fade-in zoom-in-95 text-stone-200">
              <div class="text-[10px] uppercase font-mono font-bold text-amber-500 px-3 py-1.5 border-b border-[#3d200f] flex items-center justify-between">
                <span>Alternar Filial / Empresa</span>
                <mat-icon class="text-xs text-stone-400">swap_horiz</mat-icon>
              </div>
              @for (tenant of ecosystem.tenants(); track tenant.id) {
                <button
                  type="button"
                  (click)="tenantSelected.emit(tenant.id)"
                  class="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between hover:bg-[#3d200f] transition-colors cursor-pointer"
                  [class.bg-[#3d200f]]="ecosystem.currentTenantId() === tenant.id">
                  <div>
                    <div class="font-bold text-amber-200">{{ tenant.name }}</div>
                    <div class="text-[10px] text-stone-400">{{ tenant.legalName }} &bull; {{ tenant.category }}</div>
                  </div>
                  @if (ecosystem.currentTenantId() === tenant.id) {
                    <mat-icon class="text-sm text-amber-400">check_circle</mat-icon>
                  }
                </button>
              }
            </div>
          }
        </div>

        <!-- SYSTEM TRAY FLYOUT TRIGGER -->
        <button
          type="button"
          (click)="toggleSystemTray()"
          class="flex items-center gap-1 bg-[#2a160b] hover:bg-[#381e0e] border border-[#4d2813] px-2 py-1 rounded-xl text-stone-300 cursor-pointer shadow-sm">
          <mat-icon class="text-sm" [class.text-emerald-400]="isOnline()">wifi</mat-icon>
          <mat-icon class="text-sm text-emerald-400">print</mat-icon>
          <mat-icon class="text-sm text-amber-400">notifications</mat-icon>
        </button>

        <!-- SYSTEM TRAY BACKDROP DISMISSER -->
        @if (showSystemTray()) {
          <button
            type="button"
            aria-label="Fechar painel de controle ao clicar fora"
            (click)="closeSystemTray()"
            class="fixed inset-0 z-[450] bg-transparent cursor-default border-none outline-none">
          </button>
        }

        <!-- SYSTEM TRAY CONTROL PANEL POPUP -->
        @if (showSystemTray()) {
          <div class="absolute bottom-14 right-16 bg-[#180b04]/98 border-2 border-[#4d2813] rounded-3xl p-4 w-72 shadow-2xl z-[500] space-y-3 text-stone-200 backdrop-blur-xl animate-in slide-in-from-bottom-3">
            <div class="text-[10px] font-mono uppercase font-bold text-amber-500 border-b border-[#3d200f] pb-2 flex justify-between items-center">
              <span>Central de Controle do SO</span>
              <button type="button" (click)="closeSystemTray()" class="text-stone-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <div class="space-y-2 text-xs">
              <div class="flex items-center justify-between bg-[#2a160b] p-2 rounded-xl border border-[#4d2813]">
                <span class="flex items-center gap-2 font-bold"><mat-icon class="text-sm text-emerald-400">wifi</mat-icon> Conexão de Rede:</span>
                <span class="text-emerald-400 font-mono font-bold text-[10px]">100 Mbps (Fibra)</span>
              </div>

              <div class="flex items-center justify-between bg-[#2a160b] p-2 rounded-xl border border-[#4d2813]">
                <span class="flex items-center gap-2 font-bold"><mat-icon class="text-sm text-amber-400">volume_up</mat-icon> Som do Alerta KDS:</span>
                <span class="text-amber-300 font-mono text-[10px]">80%</span>
              </div>

              <div class="flex items-center justify-between bg-[#2a160b] p-2 rounded-xl border border-[#4d2813]">
                <span class="flex items-center gap-2 font-bold"><mat-icon class="text-sm text-cyan-400">print</mat-icon> Impressora Térmica:</span>
                <span class="text-emerald-400 font-mono text-[10px]">Bematech MP-4200</span>
              </div>
            </div>

            <div class="pt-2 border-t border-[#3d200f] flex justify-between items-center text-[10px] text-stone-400">
              <span>Servidor Local: <strong class="text-amber-400">0.0.0.0:3000</strong></span>
              <span class="text-emerald-400 font-bold">100% OK</span>
            </div>
          </div>
        }

        <!-- CLOCK & DATE -->
        <button
          type="button"
          (click)="clockClicked.emit()"
          title="Abrir Calendário & Agenda Operacional"
          class="text-right pl-2 border-l border-[#3d200f] leading-tight cursor-pointer hover:text-white transition-colors group">
          <div class="font-mono font-bold text-xs text-amber-300 group-hover:text-amber-200">{{ currentTime() }}</div>
          <div class="text-[9px] text-stone-400 group-hover:text-stone-200 font-medium">{{ currentDate() }}</div>
        </button>

      </div>

    </div>
  `
})
export class TaskbarComponent {
  readonly ecosystem = inject(EcosystemService);
  
  startClicked = output<void>();
  windowSelected = output<string>();
  keyboardClicked = output<void>();
  companyMenuClicked = output<void>();
  tenantSelected = output<string>();
  clockClicked = output<void>();
  favoriteSelected = output<string>();

  openWindows = input<OSWindow[]>([]);
  activeWinId = input<string | null>(null);
  showCompanyMenu = input<boolean>(false);
  currentTime = input<string>('');
  currentDate = input<string>('');
  favorites = input<string[]>([]);

  readonly showSystemTray = signal<boolean>(false);
  readonly isOnline = signal<boolean>(true);

  currentTenant = computed(() => {
    const id = this.ecosystem.currentTenantId();
    return this.ecosystem.tenants().find(t => t.id === id);
  });

  toggleSystemTray() {
    this.showSystemTray.update(v => !v);
  }

  closeSystemTray() {
    this.showSystemTray.set(false);
  }

  getAppIcon(id: string): string {
    const icons: Record<string, string> = {
      'pos': 'point_of_sale',
      'tables': 'table_restaurant',
      'kds': 'soup_kitchen',
      'inventory': 'inventory_2',
      'finance': 'account_balance_wallet',
      'store-manager': 'storefront',
      'whatsapp': 'chat',
      'ifood': 'delivery_dining',
      'drivers': 'alt_route',
      'rh': 'badge',
      'history': 'history',
      'reports': 'analytics',
      'crm': 'loyalty',
      'services': 'handyman',
      'tasks': 'task_alt',
      'calendar': 'calendar_month',
      'agenda': 'event_note',
      'suppliers': 'local_shipping',
      'reconciliation': 'swap_horiz',
      'stock-audit': 'fact_check',
      'calculator': 'calculate',
      'notes': 'description',
      'docs': 'menu_book',
      'google-drive': 'cloud_queue',
      'settings': 'settings',
      'system': 'folder',
      'admin-hub': 'admin_panel_settings',
      'waiter-sim': 'restaurant_menu',
      'driver-sim': 'local_shipping',
      'consumer-sim': 'shopping_bag'
    };
    return icons[id] || 'apps';
  }
}
