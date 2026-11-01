import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { EcosystemService } from '../services/ecosystem.service';
import { SecurityService } from '../services/security.service';
import { OsPreferencesService, SEGMENT_PROFILE_PRESETS } from '../services/os-preferences.service';
import { EAppWindowManagerService } from '../services/eapp-window-manager.service';
import { OSAppId, OSWindow, OSAppDefinition } from '../models/os.model';
import { OS_APPS_REGISTRY } from './os/os-apps-registry';

// Embedded OS Apps (eApps)
import { EAppPosWindow } from './eapps/eapp-pos';
import { EAppTablesWindow } from './eapps/eapp-tables';
import { EAppKdsWindow } from './eapps/eapp-kds';
import { EAppInventoryWindow } from './eapps/eapp-inventory';
import { EAppFinanceWindow } from './eapps/eapp-finance';
import { EAppSettingsWindow } from './eapps/eapp-settings';
import { EAppSystemWindow } from './eapps/eapp-system';
import { EAppTasksWindow } from './eapps/eapp-tasks';
import { EAppWhatsappWindow } from './eapps/eapp-whatsapp';
import { EAppInstagramWindow } from './eapps/eapp-instagram';
import { EAppIfoodWindow } from './eapps/eapp-ifood';
import { EAppCalculatorWindow } from './eapps/eapp-calculator';
import { EAppNotesWindow } from './eapps/eapp-notes';
import { EAppServicesWindow } from './eapps/eapp-services';
import { EAppReservationsWindow } from './eapps/eapp-reservations';
import { EAppDocsWindow } from './eapps/eapp-docs';
import { EAppReportsWindow } from './eapps/eapp-reports';
import { EAppOrderHistoryWindow } from './eapps/eapp-order-history';
import { EAppCrmWindow } from './eapps/eapp-crm';
import { EAppStoreManagerWindow } from './eapps/eapp-store-manager';
import { EAppRhWindow } from './eapps/eapp-rh';
import { EAppDriversWindow } from './eapps/eapp-drivers';
import { EAppAdminHubWindow } from './eapps/eapp-admin-hub';
import { EAppCalendarWindow } from './eapps/eapp-calendar';
import { EAppSuppliersWindow } from './eapps/eapp-suppliers';
import { EAppReconciliationWindow } from './eapps/eapp-reconciliation';
import { EAppStockAuditWindow } from './eapps/eapp-stock-audit';
import { EAppGoogleDriveWindow } from './eapps/eapp-google-drive';
import { EAppWaiterSimWindow } from './eapps/eapp-waiter-sim';
import { EAppDriverSimWindow } from './eapps/eapp-driver-sim';
import { EAppConsumerSimWindow } from './eapps/eapp-consumer-sim';

// OS Shell Components
import { DesktopIconComponent } from './os/desktop-icon';
import { TaskbarComponent } from './os/taskbar';
import { StartMenuComponent } from './os/start-menu';
import { VirtualKeyboardComponent } from './os/virtual-keyboard';
import { LockScreenComponent } from './os/lock-screen';
import { StoreOsBootstrapComponent } from './os/bootstrap';
import { OsStatusWidgetComponent } from './os/os-status-widget';
import { OsMobileWarningComponent } from './os/os-mobile-warning';
import { OsWindowShellComponent } from './os/os-window-shell';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-client-os',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    EAppPosWindow,
    EAppTablesWindow,
    EAppKdsWindow,
    EAppInventoryWindow,
    EAppFinanceWindow,
    EAppSettingsWindow,
    EAppSystemWindow,
    EAppTasksWindow,
    EAppWhatsappWindow,
    EAppInstagramWindow,
    EAppIfoodWindow,
    EAppCalculatorWindow,
    EAppNotesWindow,
    EAppServicesWindow,
    EAppReservationsWindow,
    EAppDocsWindow,
    EAppReportsWindow,
    EAppOrderHistoryWindow,
    EAppCrmWindow,
    EAppStoreManagerWindow,
    EAppRhWindow,
    EAppDriversWindow,
    EAppAdminHubWindow,
    EAppCalendarWindow,
    EAppSuppliersWindow,
    EAppReconciliationWindow,
    EAppStockAuditWindow,
    EAppGoogleDriveWindow,
    EAppWaiterSimWindow,
    EAppDriverSimWindow,
    EAppConsumerSimWindow,
    DesktopIconComponent,
    TaskbarComponent,
    StartMenuComponent,
    VirtualKeyboardComponent,
    LockScreenComponent,
    StoreOsBootstrapComponent,
    OsStatusWidgetComponent,
    OsMobileWarningComponent,
    OsWindowShellComponent
  ],
  template: `
    <app-os-mobile-warning />

    @if (!bootstrapped()) {
      <app-os-bootstrap (completed)="onBootstrapComplete()" />
    }

    @if (bootstrapped()) {
      <div
        (contextmenu)="onDesktopContextMenu($event)"
        (pointermove)="onPointerMove($event)"
        (pointerup)="onPointerUp()"
        class="hidden md:flex relative w-full h-screen overflow-hidden select-none flex-col justify-between font-sans transition-all duration-300"
        [class]="getWallpaperClass()">
        
        <div class="absolute inset-0 bg-carbon-pattern opacity-20 pointer-events-none"></div>

        <div class="relative flex-1 p-6 flex justify-between items-start overflow-hidden">
          
          <!-- GRID LAYOUT FOR DESKTOP ICONS -->
          <div class="grid grid-flow-col grid-rows-6 sm:grid-rows-6 gap-x-6 gap-y-3 z-10">
            @for (shortcutId of desktopShortcuts(); track shortcutId) {
              @if (appDefinitions[shortcutId]; as app) {
                <app-os-desktop-icon 
                  [label]="app.label" 
                  [icon]="app.icon" 
                  [colorClass]="app.colorClass" 
                  [imageUrl]="app.imageUrl || null" 
                  (clicked)="openApp(shortcutId)"
                  (iconContextMenu)="onIconContextMenu($event, shortcutId)">
                </app-os-desktop-icon>
              }
            }
          </div>

          <app-os-status-widget 
            (returnToHq)="returnToHq()"
            (openPos)="navigateToDedicatedPos()"
            (openStoreManager)="openApp('store-manager')"
          />
        </div>

        <!-- GLOBAL BROADCAST MESSAGE -->
        @if (ecosystem.globalBroadcastMessage()) {
          <div class="fixed top-20 left-1/2 -translate-x-1/2 z-[300] w-full max-w-lg animate-in slide-in-from-top duration-500">
            <div class="bg-gradient-to-r from-rose-900 via-amber-900 to-rose-950 border-2 border-amber-500 rounded-3xl p-4 shadow-2xl flex items-center gap-4 text-white">
              <div class="w-12 h-12 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center shrink-0 shadow-lg">
                <mat-icon class="animate-bounce text-2xl">campaign</mat-icon>
              </div>
              <div class="flex-1">
                <div class="text-[10px] font-black uppercase text-amber-300 font-mono tracking-widest">Comunicado HQ</div>
                <p class="text-sm font-bold leading-snug">{{ ecosystem.globalBroadcastMessage() }}</p>
              </div>
              <button (click)="ecosystem.globalBroadcastMessage.set(null)" class="text-amber-200 hover:text-white cursor-pointer"><mat-icon>close</mat-icon></button>
            </div>
          </div>
        }

        <!-- MULTI-WINDOW MANAGEMENT MOTOR -->
        @for (win of winManager.openWindows(); track win.id) {
          @if (!win.isMinimized) {
            <app-os-window-shell
              [window]="win"
              (close)="winManager.closeWindow(win.id)"
              (minimize)="winManager.minimizeWindow(win.id)"
              (maximize)="winManager.toggleMaximize(win.id)"
              (dock)="winManager.dockWindow(win.id, $event)"
              (bringToFront)="winManager.bringToFront(win.id)"
              (dragStarted)="startDraggingWindow($event.event, win)">
              
              <div quickSwitchers class="flex items-center gap-1">
                @for (quick of activeProfileQuickSwitcher(); track quick.id) {
                  <button type="button" 
                    (click)="winManager.switchApp(win.id, quick.id)" 
                    [class]="win.id === quick.id ? 'bg-amber-600 text-stone-950 font-black shadow-inner shadow-black/20' : 'text-stone-400 hover:text-white'" 
                    class="px-2 py-0.5 rounded-lg font-bold cursor-pointer transition-all duration-200">
                    {{ quick.label }}
                  </button>
                }
              </div>

              <div class="h-full p-4">
                @switch (win.id) {
                  @case ('store-manager') { @defer (on timer(0ms)) { <app-eapp-store-manager /> } }
                  @case ('docs') { @defer (on timer(0ms)) { <app-eapp-docs /> } }
                  @case ('pos') { @defer (on timer(0ms)) { <app-eapp-pos /> } }
                  @case ('tables') { @defer (on timer(0ms)) { <app-eapp-tables /> } }
                  @case ('kds') { @defer (on timer(0ms)) { <app-eapp-kds /> } }
                  @case ('inventory') { @defer (on timer(0ms)) { <app-eapp-inventory /> } }
                  @case ('finance') { @defer (on timer(0ms)) { <app-eapp-finance /> } }
                  @case ('settings') { @defer (on timer(0ms)) { <app-eapp-settings /> } }
                  @case ('system') { @defer (on timer(0ms)) { <app-eapp-system /> } }
                  @case ('tasks') { @defer (on timer(0ms)) { <app-eapp-tasks /> } }
                  @case ('whatsapp') { @defer (on timer(0ms)) { <app-eapp-whatsapp /> } }
                  @case ('instagram') { @defer (on timer(0ms)) { <app-eapp-instagram /> } }
                  @case ('ifood') { @defer (on timer(0ms)) { <app-eapp-ifood /> } }
                  @case ('agenda') { @defer (on timer(0ms)) { <app-eapp-reservations /> } }
                  @case ('calendar') { @defer (on timer(0ms)) { <app-eapp-calendar /> } }
                  @case ('services') { @defer (on timer(0ms)) { <app-eapp-services initialTab="dashboard" /> } }
                  @case ('calculator') { @defer (on timer(0ms)) { <app-eapp-calculator /> } }
                  @case ('notes') { @defer (on timer(0ms)) { <app-eapp-notes /> } }
                  @case ('reports') { @defer (on timer(0ms)) { <app-eapp-reports /> } }
                  @case ('history') { @defer (on timer(0ms)) { <app-eapp-order-history /> } }
                  @case ('crm') { @defer (on timer(0ms)) { <app-eapp-crm /> } }
                  @case ('rh') { @defer (on timer(0ms)) { <app-eapp-rh /> } }
                  @case ('drivers') { @defer (on timer(0ms)) { <app-eapp-drivers /> } }
                  @case ('admin-hub') { @defer (on timer(0ms)) { <app-eapp-admin-hub /> } }
                  @case ('suppliers') { @defer (on timer(0ms)) { <app-eapp-suppliers /> } }
                  @case ('reconciliation') { @defer (on timer(0ms)) { <app-eapp-reconciliation /> } }
                  @case ('stock-audit') { @defer (on timer(0ms)) { <app-eapp-stock-audit /> } }
                  @case ('google-drive') { @defer (on timer(0ms)) { <app-eapp-google-drive /> } }
                  @case ('waiter-sim') { @defer (on timer(0ms)) { <app-eapp-waiter-sim /> } }
                  @case ('driver-sim') { @defer (on timer(0ms)) { <app-eapp-driver-sim /> } }
                  @case ('consumer-sim') { @defer (on timer(0ms)) { <app-eapp-consumer-sim /> } }
                }
              </div>
            </app-os-window-shell>
          }
        }

        <!-- START MENU & TASKBAR -->
        @if (showStartMenu() || showCompanyMenu()) {
          <button type="button" (click)="closeStartAndCompanyMenus()" aria-label="Fechar Menus" class="fixed inset-0 z-[250] bg-transparent cursor-default border-none outline-none"></button>
        }

        @if (showStartMenu()) {
          <app-os-start-menu 
            [pinnedAppIds]="desktopShortcuts()"
            [favoriteAppIds]="favoriteApps()"
            [workspaces]="savedWorkspaces()"
            [currentWorkspaceId]="currentWorkspaceId()"
            (appSelected)="openApp($event.id)" 
            (pinToDesktop)="addDesktopShortcut($event)"
            (unpinFromDesktop)="removeDesktopShortcut($event)"
            (toggleFavorite)="toggleFavorite($event)"
            (lockClicked)="lockTerminal()"
            (saveWorkspace)="onSaveWorkspace($event)"
            (restoreWorkspace)="onRestoreWorkspace($event)"
            (deleteWorkspace)="onDeleteWorkspace($event)" />
        }

        <app-os-taskbar 
          [openWindows]="winManager.openWindows()"
          [activeWinId]="winManager.activeWinId()"
          [favorites]="favoriteApps()"
          [showCompanyMenu]="showCompanyMenu()"
          [currentTime]="currentTime()"
          [currentDate]="currentDate()"
          (startClicked)="toggleStartMenu()"
          (windowSelected)="winManager.focusOrRestoreWindow($event)"
          (favoriteSelected)="onFavoriteSelected($event)"
          (keyboardClicked)="toggleKeyboard()"
          (companyMenuClicked)="toggleCompanyMenu()"
          (tenantSelected)="selectCompany($event)"
          (clockClicked)="openApp('calendar')" />

        @if (showKeyboard()) {
          <app-os-virtual-keyboard (closeClicked)="showKeyboard.set(false)" />
        }

        @if (isLocked()) {
          <app-os-lock-screen
            [currentTime]="currentTime()"
            [currentDate]="currentDate()"
            [tenantName]="currentTenant().name"
            [operatorName]="ecosystem.currentSession()?.name || 'Operador'"
            (unlocked)="isLocked.set(false)" />
        }

        <!-- DESKTOP CONTEXT MENU -->
        @if (desktopContextMenu(); as menu) {
          <div 
            [style.left.px]="menu.x" 
            [style.top.px]="menu.y"
            class="fixed z-[600] w-56 bg-[#1d1008]/95 border-2 border-[#4d2813] rounded-2xl shadow-2xl backdrop-blur-xl p-1.5 animate-in zoom-in-95 duration-150">
            <button (click)="refreshDesktop()" class="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-stone-200 hover:bg-[#3d200f] flex items-center gap-2 cursor-pointer">
              <mat-icon class="text-sm">refresh</mat-icon> Atualizar Área de Trabalho
            </button>
            <button (click)="winManager.minimizeAll(); closeDesktopContextMenu()" class="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-stone-200 hover:bg-[#3d200f] flex items-center gap-2 cursor-pointer">
              <mat-icon class="text-sm">layers_clear</mat-icon> Minimizar Todas as Janelas
            </button>
            <div class="h-px bg-[#3d200f] my-1 mx-2"></div>
            <button (click)="openApp('settings')" class="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-stone-200 hover:bg-[#3d200f] flex items-center gap-2 cursor-pointer">
              <mat-icon class="text-sm">palette</mat-icon> Personalizar Papel de Parede
            </button>
            <button (click)="closeDesktopContextMenu()" class="w-full text-left px-3 py-2 rounded-xl text-[10px] text-stone-500 hover:text-stone-300 flex items-center justify-center cursor-pointer mt-1">Fechar Menu</button>
          </div>
          <button (click)="closeDesktopContextMenu()" class="fixed inset-0 z-[550] bg-transparent cursor-default border-none"></button>
        }

        <!-- ICON CONTEXT MENU -->
        @if (iconContextMenu(); as menu) {
          <div 
            [style.left.px]="menu.x" 
            [style.top.px]="menu.y"
            class="fixed z-[600] w-56 bg-[#180b04]/98 border-2 border-[#4d2813] rounded-2xl shadow-2xl backdrop-blur-xl p-1.5 animate-in slide-in-from-top-2 duration-150">
            <div class="px-3 py-2 border-b border-[#3d200f] mb-1">
              <div class="text-[10px] font-black uppercase text-amber-500 truncate">{{ appDefinitions[menu.appId].title }}</div>
            </div>
            <button (click)="openAppFromContextMenu(menu.appId)" class="w-full text-left px-3 py-2 rounded-xl text-xs font-black text-white hover:bg-[#3d200f] flex items-center gap-2 cursor-pointer">
              <mat-icon class="text-sm text-emerald-400">open_in_new</mat-icon> Abrir Aplicativo
            </button>
            <button (click)="toggleFavoriteFromContextMenu(menu.appId)" class="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-stone-300 hover:bg-[#3d200f] flex items-center gap-2 cursor-pointer">
              <mat-icon class="text-sm text-rose-500">{{ favoriteApps().includes(menu.appId) ? 'favorite' : 'favorite_border' }}</mat-icon>
              {{ favoriteApps().includes(menu.appId) ? 'Remover dos Favoritos' : 'Fixar nos Favoritos' }}
            </button>
            <div class="h-px bg-[#3d200f] my-1 mx-2"></div>
            <button (click)="removeDesktopShortcut(menu.appId); closeIconContextMenu()" class="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-300 hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer">
              <mat-icon class="text-sm">delete</mat-icon> Remover Atalho
            </button>
            <button (click)="closeIconContextMenu()" class="w-full text-left px-3 py-2 rounded-xl text-[10px] text-stone-500 hover:text-stone-300 flex items-center justify-center cursor-pointer mt-1">Cancelar</button>
          </div>
          <button (click)="closeIconContextMenu()" class="fixed inset-0 z-[550] bg-transparent cursor-default border-none"></button>
        }

        <!-- MAINTENANCE OVERLAY -->
        @if (ecosystem.maintenanceMode()) {
          <div class="absolute inset-0 z-[1000] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center text-center p-8">
             <div class="w-24 h-24 rounded-3xl bg-amber-600 text-stone-950 flex items-center justify-center mb-6 shadow-xl animate-pulse">
                <mat-icon class="text-5xl">build_circle</mat-icon>
             </div>
             <h2 class="font-serif font-black text-4xl text-white mb-2">MANUTENÇÃO CRÍTICA</h2>
             <p class="text-stone-400 max-w-md text-sm leading-relaxed">Sincronizando com o Cluster Central. O acesso retornará em breve.</p>
          </div>
        }
      </div>
    }
  `
})
export class ClientOsComponent implements OnInit, OnDestroy {
  readonly ecosystem = inject(EcosystemService);
  private readonly security = inject(SecurityService);
  private readonly router = inject(Router);
  readonly prefsService = inject(OsPreferencesService);
  readonly winManager = inject(EAppWindowManagerService);

  readonly bootstrapped = signal<boolean>(false);
  readonly currentTime = signal<string>('');
  readonly currentDate = signal<string>('');
  private timeInterval?: ReturnType<typeof setInterval>;

  async onBootstrapComplete() {
    this.bootstrapped.set(true);
    await this.ecosystem.syncEssentialStoreMetadata();
  }

  readonly currentWallpaper = computed(() => this.prefsService.prefs().wallpaper);
  readonly currentOperationalProfile = computed(() => this.prefsService.prefs().operationalProfile);
  readonly activeProfileQuickSwitcher = computed(() => (SEGMENT_PROFILE_PRESETS[this.currentOperationalProfile()] || SEGMENT_PROFILE_PRESETS.restaurant).quickSwitcher);
  
  readonly isLocked = signal<boolean>(false);
  readonly desktopShortcuts = computed(() => this.prefsService.prefs().shortcuts);
  readonly favoriteApps = computed(() => this.prefsService.prefs().favorites);
  readonly savedWorkspaces = computed(() => this.prefsService.prefs().workspaces);
  readonly currentWorkspaceId = computed(() => this.prefsService.prefs().currentWorkspaceId);

  readonly iconContextMenu = signal<{ x: number; y: number; appId: OSAppId } | null>(null);
  readonly desktopContextMenu = signal<{ x: number; y: number } | null>(null);

  readonly appDefinitions: Record<string, OSAppDefinition> = OS_APPS_REGISTRY;

  private isDragging = false;
  private dragWinId: OSAppId | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private winInitialX = 0;
  private winInitialY = 0;

  readonly showStartMenu = signal<boolean>(false);
  readonly showCompanyMenu = signal<boolean>(false);
  readonly showKeyboard = signal<boolean>(false);

  currentTenant = computed(() => {
    const id = this.ecosystem.currentTenantId();
    return this.ecosystem.tenants().find(t => t.id === id) || this.ecosystem.tenants()[0];
  });

  ngOnInit() {
    this.security.setPillar('os');
    this.updateTime();
    this.timeInterval = setInterval(() => this.updateTime(), 60000);
  }

  ngOnDestroy() {
    if (this.timeInterval) clearInterval(this.timeInterval);
  }

  private updateTime() {
    const now = new Date();
    this.currentTime.set(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    this.currentDate.set(now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }));
  }

  getWallpaperClass() {
    switch (this.currentWallpaper()) {
      case 'amber': return 'bg-[#1a0e05]';
      case 'emerald': return 'bg-[#051a0e]';
      case 'obsidian': return 'bg-[#0c0c0e]';
      default: return 'bg-[#0e0805]';
    }
  }

  openApp(id: OSAppId) {
    this.winManager.openApp(id);
    this.showStartMenu.set(false);
  }

  startDraggingWindow(event: PointerEvent, win: OSWindow) {
    if (win.isMaximized || win.dockPosition) return;
    this.isDragging = true;
    this.dragWinId = win.id;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.winInitialX = win.x;
    this.winInitialY = win.y;
    this.winManager.bringToFront(win.id);
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  onPointerMove(event: PointerEvent) {
    if (!this.isDragging || !this.dragWinId) return;
    const dx = event.clientX - this.dragStartX;
    const dy = event.clientY - this.dragStartY;
    this.winManager.updateWindowPosition(this.dragWinId, this.winInitialX + dx, this.winInitialY + dy);
  }

  onPointerUp() {
    this.isDragging = false;
    this.dragWinId = null;
  }



  toggleStartMenu() { this.showStartMenu.update(v => !v); this.showCompanyMenu.set(false); }
  toggleCompanyMenu() { this.showCompanyMenu.update(v => !v); this.showStartMenu.set(false); }
  toggleKeyboard() { this.showKeyboard.update(v => !v); }

  closeStartAndCompanyMenus() { this.showStartMenu.set(false); this.showCompanyMenu.set(false); }

  selectCompany(tenantId: string) {
    this.ecosystem.currentTenantId.set(tenantId);
    this.showCompanyMenu.set(false);
    this.ecosystem.syncEssentialStoreMetadata(tenantId);
  }

  lockTerminal() { this.isLocked.set(true); this.showStartMenu.set(false); }

  returnToHq() {
    this.ecosystem.currentView.set('hq');
    this.router.navigate(['/hq']);
  }

  navigateToDedicatedPos() {
    this.router.navigate(['/pos']);
  }

  // PREFS DELEGATES
  addDesktopShortcut(id: OSAppId) { this.prefsService.toggleShortcut(id); }
  removeDesktopShortcut(id: OSAppId) { this.prefsService.toggleShortcut(id); }
  toggleFavorite(id: OSAppId) { this.prefsService.toggleFavorite(id); }
  onSaveWorkspace(name: string) {
    this.prefsService.saveWorkspace(name, this.winManager.openWindows(), this.winManager.activeWinId());
  }
  onRestoreWorkspace(id: string) {
    const ws = this.savedWorkspaces().find(w => w.id === id);
    if (!ws) return;
    this.winManager.restoreWorkspace(ws.windows as OSWindow[], (ws as any).activeWinId as OSAppId);
    this.prefsService.updatePrefs({ currentWorkspaceId: id });
  }
  onDeleteWorkspace(id: string) { this.prefsService.deleteWorkspace(id); }

  onIconContextMenu(event: { x: number; y: number }, appId: OSAppId) {
    this.iconContextMenu.set({ ...event, appId });
  }

  onDesktopContextMenu(event: MouseEvent) {
    event.preventDefault();
    this.desktopContextMenu.set({ x: event.clientX, y: event.clientY });
  }

  closeDesktopContextMenu() { this.desktopContextMenu.set(null); }
  closeIconContextMenu() { this.iconContextMenu.set(null); }

  openAppFromContextMenu(id: OSAppId) {
    this.openApp(id);
    this.closeIconContextMenu();
  }

  toggleFavoriteFromContextMenu(id: OSAppId) {
    this.toggleFavorite(id);
    this.closeIconContextMenu();
  }

  moveDesktopShortcut(id: OSAppId, direction: 'start' | 'left' | 'right') {
    this.prefsService.moveShortcut(id, direction);
  }

  refreshDesktop() {
    window.location.reload();
  }

  onFavoriteSelected(id: OSAppId | string) {
    const appId = id as OSAppId;
    this.openApp(appId);
  }
}
