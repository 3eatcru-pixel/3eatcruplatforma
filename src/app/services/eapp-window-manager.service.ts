import { Injectable, signal, computed, inject } from '@angular/core';
import { OSAppId, OSWindow, OS_APPS_REGISTRY } from '../models/os.model';
import { EcosystemService } from './ecosystem.service';

@Injectable({
  providedIn: 'root'
})
export class EAppWindowManagerService {
  private readonly ecosystem = inject(EcosystemService);

  readonly openWindows = signal<OSWindow[]>([
    { id: 'docs', title: 'Manual & Specs 3EAT', icon: 'menu_book', isMinimized: false, isMaximized: false, x: 80, y: 40, width: 1000, height: 620, zIndex: 50 }
  ]);

  readonly activeWinId = signal<OSAppId | null>('docs');
  private topZIndex = 50;

  openApp(id: OSAppId) {
    const windows = this.openWindows();
    const existing = windows.find(w => w.id === id);

    if (existing) {
      this.focusOrRestoreWindow(id);
    } else {
      const def = OS_APPS_REGISTRY[id];
      if (!def) return;

      this.topZIndex++;
      const newWin: OSWindow = {
        id, 
        title: def.title, 
        icon: def.icon, 
        isMinimized: false, 
        isMaximized: false,
        x: 100 + (windows.length * 20),
        y: 60 + (windows.length * 20),
        width: 900, 
        height: 580,
        zIndex: this.topZIndex
      };
      this.openWindows.set([...windows, newWin]);
      this.activeWinId.set(id);
    }
  }

  focusOrRestoreWindow(id: OSAppId | string) {
    const winId = id as OSAppId;
    this.topZIndex++;
    this.openWindows.update(wins => wins.map(w => w.id === winId ? { ...w, isMinimized: false, zIndex: this.topZIndex } : w));
    this.activeWinId.set(winId);
  }

  bringToFront(id: OSAppId) {
    this.topZIndex++;
    this.openWindows.update(wins => wins.map(w => w.id === id ? { ...w, zIndex: this.topZIndex } : w));
    this.activeWinId.set(id);
  }

  closeWindow(id: OSAppId) {
    this.openWindows.update(wins => wins.filter(w => w.id !== id));
    if (this.activeWinId() === id) {
      const remaining = this.openWindows();
      this.activeWinId.set(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
    }
  }

  minimizeWindow(id: OSAppId) {
    this.openWindows.update(wins => wins.map(w => w.id === id ? { ...w, isMinimized: true } : w));
    if (this.activeWinId() === id) this.activeWinId.set(null);
  }

  toggleMaximize(id: OSAppId) {
    this.openWindows.update(wins => wins.map(w => w.id === id ? { ...w, isMaximized: !w.isMaximized, dockPosition: undefined } : w));
  }

  dockWindow(id: OSAppId, position: 'left' | 'right' | 'full') {
    this.openWindows.update(wins => wins.map(w => w.id === id ? { ...w, dockPosition: position as any, isMaximized: false } : w));
  }

  updateWindowPosition(id: OSAppId, x: number, y: number) {
    this.openWindows.update(wins => wins.map(w => w.id === id ? { ...w, x, y } : w));
  }

  switchApp(currentId: OSAppId, targetId: OSAppId) {
    const def = OS_APPS_REGISTRY[targetId];
    if (!def) return;
    this.openWindows.update(wins => wins.map(w => w.id === currentId ? { ...w, id: targetId, title: def.title, icon: def.icon } : w));
    this.activeWinId.set(targetId);
  }

  minimizeAll() {
    this.openWindows.update(wins => wins.map(w => ({ ...w, isMinimized: true })));
    this.activeWinId.set(null);
  }

  restoreWorkspace(windows: OSWindow[], activeId: OSAppId | null) {
    this.openWindows.set(windows.map((w, i) => ({
      ...w,
      zIndex: 50 + i,
      isMinimized: false
    })));
    this.activeWinId.set(activeId);
    this.topZIndex = 50 + windows.length;
  }
}
