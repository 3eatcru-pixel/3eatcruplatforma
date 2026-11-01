import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { OSWindow } from '../../models/os.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-os-window-shell',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div
      (mousedown)="bringToFront.emit()"
      [style.z-index]="window().zIndex"
      [style.left.px]="window().isMaximized || window().dockPosition ? null : window().x"
      [style.top.px]="window().isMaximized || window().dockPosition ? null : window().y"
      [style.width.px]="window().isMaximized || window().dockPosition ? null : window().width"
      [style.height.px]="window().isMaximized || window().dockPosition ? null : window().height"
      [class]="getPositionClasses()"
      class="absolute bg-[#1d1008]/98 border-2 border-[#4d2813] rounded-3xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl transition-all duration-200 animate-in zoom-in-95 fade-in">
      
      <!-- WINDOW TITLEBAR -->
      <div 
        (pointerdown)="onHeaderPointerDown($event)"
        class="h-12 bg-[#170b04] border-b border-[#3d200f] px-4 flex items-center justify-between shrink-0 cursor-move select-none shadow-sm">
        
        <div class="flex items-center gap-3">
          <!-- Window Controls (Traffic Lights style but functional) -->
          <div class="flex items-center gap-1.5">
            <button type="button" (click)="closeWindow.emit(); $event.stopPropagation()" aria-label="Fechar Janela" class="w-3.5 h-3.5 rounded-full bg-rose-600 hover:bg-rose-500 flex items-center justify-center group cursor-pointer shadow border border-rose-700/50">
              <span class="opacity-0 group-hover:opacity-100 text-[8px] text-rose-950 font-bold">✕</span>
            </button>
            <button type="button" (click)="minimize.emit(); $event.stopPropagation()" aria-label="Minimizar Janela" class="w-3.5 h-3.5 rounded-full bg-amber-500 hover:bg-amber-400 flex items-center justify-center group cursor-pointer shadow border border-amber-600/50">
              <span class="opacity-0 group-hover:opacity-100 text-[8px] text-amber-950 font-bold">─</span>
            </button>
            <button type="button" (click)="maximize.emit(); $event.stopPropagation()" aria-label="Maximizar Janela" class="w-3.5 h-3.5 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center group cursor-pointer shadow border border-emerald-600/50">
              <span class="opacity-0 group-hover:opacity-100 text-[8px] text-emerald-950 font-bold">□</span>
            </button>
          </div>

          <div class="flex items-center gap-2 pl-3 border-l border-[#3d200f] text-white font-serif font-black text-sm">
            <mat-icon class="text-base text-amber-400">{{ window().icon }}</mat-icon>
            <span class="truncate max-w-[200px]">{{ window().title }}</span>
          </div>
        </div>

        <!-- Snap/Dock Controls -->
        <div class="flex items-center gap-1 bg-[#2b160b] p-1 rounded-2xl border border-[#482814] text-[10px]">
          <button type="button" (click)="dock.emit('left'); $event.stopPropagation()" class="p-1 hover:bg-[#3d200f] rounded-lg text-stone-300 cursor-pointer transition-colors" title="Snap Left">
            <mat-icon class="text-xs">view_sidebar</mat-icon>
          </button>
          <button type="button" (click)="dock.emit('right'); $event.stopPropagation()" class="p-1 hover:bg-[#3d200f] rounded-lg text-stone-300 cursor-pointer transition-colors" title="Snap Right">
            <mat-icon class="text-xs scale-x-[-1]">view_sidebar</mat-icon>
          </button>
          <div class="w-px h-3 bg-[#3d200f] mx-1"></div>
          
          <!-- Contextual Quick Switchers (if provided) -->
          <ng-content select="[quickSwitchers]"></ng-content>
        </div>
      </div>

      <!-- WINDOW BODY CONTENT -->
      <div class="flex-1 overflow-auto bg-[#0e0805] text-stone-200">
        <ng-content></ng-content>
      </div>

      <!-- WINDOW RESIZE HANDLE (Bottom Right) -->
      @if (!window().isMaximized && !window().dockPosition) {
        <div class="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize group flex items-end justify-end p-0.5 pointer-events-none">
          <div class="w-1.5 h-1.5 border-r border-b border-amber-500/30 rounded-br-sm"></div>
        </div>
      }
    </div>
  `,
  host: {
    'class': 'contents'
  }
})
export class OsWindowShellComponent {
  window = input.required<OSWindow>();
  
  closeWindow = output<void>();
  minimize = output<void>();
  maximize = output<void>();
  dock = output<'left' | 'right' | 'full'>();
  bringToFront = output<void>();
  dragStarted = output<{ event: PointerEvent }>();

  getPositionClasses() {
    const win = this.window();
    if (win.isMaximized || win.dockPosition === 'full') return 'inset-0 !w-full !h-full rounded-none border-none shadow-none';
    if (win.dockPosition === 'left') return 'left-0 top-0 bottom-0 !w-1/2 !h-full rounded-none border-r border-[#4d2813] shadow-none';
    if (win.dockPosition === 'right') return 'right-0 top-0 bottom-0 !w-1/2 !h-full rounded-none border-l border-[#4d2813] shadow-none';
    return '';
  }

  onHeaderPointerDown(event: PointerEvent) {
    this.dragStarted.emit({ event });
  }
}
