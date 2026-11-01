import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-os-desktop-icon',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <button
      type="button"
      (click)="clicked.emit()"
      (contextmenu)="onContextMenu($event)"
      class="flex flex-col items-center group w-20 text-center focus:outline-none cursor-pointer">
      <div 
        class="w-14 h-14 rounded-2xl bg-gradient-to-br text-white flex items-center justify-center shadow-lg group-hover:scale-105 group-active:scale-95 transition-all border border-white/20 overflow-hidden"
        [class]="colorClass()">
        
        @if (imageUrl()) {
          <img [src]="imageUrl()" [alt]="label()" class="w-full h-full object-cover" referrerpolicy="no-referrer">
        } @else {
          <mat-icon class="text-3xl">{{ icon() }}</mat-icon>
        }
      </div>
      <span class="text-[11px] font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] mt-1.5 leading-tight">
        {{ label() }}
      </span>
    </button>
  `
})
export class DesktopIconComponent {
  label = input.required<string>();
  icon = input<string>('apps');
  imageUrl = input<string | null>(null);
  colorClass = input<string>('from-slate-700 to-slate-900');
  clicked = output<void>();
  iconContextMenu = output<MouseEvent>();

  onContextMenu(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.iconContextMenu.emit(event);
  }
}

