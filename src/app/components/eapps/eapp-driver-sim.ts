import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DriverAppComponent } from '../driver-app';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-driver-sim',
  standalone: true,
  imports: [CommonModule, MatIconModule, DriverAppComponent],
  template: `
    <div class="flex flex-col items-center justify-center h-full bg-[#0e0805] p-4 overflow-hidden relative group">
      <!-- Device Hardware Buttons -->
      <div class="absolute right-12 top-32 flex flex-col gap-4">
        <button (click)="power()" class="w-1.5 h-16 bg-emerald-900/50 rounded-l-md hover:bg-emerald-700 cursor-pointer shadow-sm" title="Power"></button>
      </div>

      <!-- Android Phone Frame -->
      <div class="relative w-[320px] h-[640px] bg-[#051a0e] border-[10px] border-[#0f3d20] rounded-[48px] shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col ring-2 ring-black/50">
        
        <!-- Status Bar -->
        <div class="h-7 bg-black flex items-center justify-between px-8 shrink-0">
          <span class="text-[10px] font-black text-emerald-400">10:46</span>
          <div class="flex items-center gap-2">
            <mat-icon class="text-[12px] h-[12px] w-[12px] text-emerald-500">gps_fixed</mat-icon>
            <mat-icon class="text-[12px] h-[12px] w-[12px] text-emerald-500">wifi</mat-icon>
            <mat-icon class="text-[12px] h-[12px] w-[12px] text-emerald-500">battery_full</mat-icon>
          </div>
        </div>

        <!-- App Content Area -->
        <div class="flex-1 overflow-auto bg-stone-950 relative">
          <app-driver-app />
          
          <!-- GPS Simulation Overlay -->
          <div class="absolute top-4 right-4 bg-black/80 backdrop-blur-md border border-emerald-500/30 rounded-xl p-2 z-50">
             <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                <span class="text-[9px] font-mono text-emerald-400">GPS: ACTIVE (-23.55, -46.63)</span>
             </div>
          </div>
        </div>

        <!-- Android Nav Bar -->
        <div class="h-12 bg-black flex items-center justify-around px-8 shrink-0 border-t border-white/5">
          <button class="p-2 text-stone-600 hover:text-white transition-colors cursor-pointer"><mat-icon>stop</mat-icon></button>
          <button class="p-2 text-stone-600 hover:text-white transition-colors cursor-pointer"><mat-icon>circle</mat-icon></button>
          <button class="p-2 text-stone-600 hover:text-white transition-colors cursor-pointer"><mat-icon>play_arrow</mat-icon></button>
        </div>
      </div>
      
      <div class="mt-6 text-center">
        <p class="text-stone-500 text-[10px] uppercase font-black tracking-widest">Simulador de Telemetria • 3EAT Driver</p>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
  `]
})
export class EAppDriverSimWindow {
  power() { console.log('Simulated Driver App Power Toggle'); }
}
