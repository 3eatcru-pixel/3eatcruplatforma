import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { OsPreferencesService } from '../../services/os-preferences.service';
import { OperationalSegmentProfileId } from '../../models/ecosystem.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-settings',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#140b06] text-stone-200 font-mono select-none overflow-hidden p-4 space-y-4">
      
      <!-- HEADER CONFIGURAÇÕES -->
      <div class="flex items-center gap-3 bg-[#1c0d06] p-3 rounded-2xl border border-[#381c0c] shrink-0">
        <div class="w-10 h-10 rounded-xl bg-stone-700 text-stone-200 flex items-center justify-center">
          <mat-icon class="text-xl">settings</mat-icon>
        </div>
        <div>
          <h2 class="text-sm font-serif font-black text-white">Configurações & Painel de Controle</h2>
          <p class="text-[10px] text-stone-400">Personalização de tema, perfil de segmento e hardware.</p>
        </div>
      </div>

      <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-4">
        <!-- PAPEL DE PAREDE / TEMA -->
        <div class="bg-[#180b04] border border-[#381c0c] rounded-2xl p-4 space-y-3">
          <div class="flex items-center gap-2">
            <mat-icon class="text-amber-500 text-base">palette</mat-icon>
            <h3 class="text-xs font-bold text-white uppercase">Papel de Parede do Store OS</h3>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <button
              type="button"
              (click)="setWallpaper('amber')"
              [class]="prefs.prefs().wallpaper === 'amber' ? 'ring-2 ring-amber-500 border-amber-500' : 'border-[#381c0c]'"
              class="p-3 rounded-xl bg-[#1a0e05] border text-center cursor-pointer hover:border-amber-600 transition-all">
              <div class="w-full h-12 bg-gradient-to-br from-amber-900 to-[#1a0e05] rounded-lg mb-2"></div>
              <span class="text-xs font-bold text-amber-400">Âmbar Noturno</span>
            </button>

            <button
              type="button"
              (click)="setWallpaper('emerald')"
              [class]="prefs.prefs().wallpaper === 'emerald' ? 'ring-2 ring-emerald-500 border-emerald-500' : 'border-[#381c0c]'"
              class="p-3 rounded-xl bg-[#051a0e] border text-center cursor-pointer hover:border-emerald-600 transition-all">
              <div class="w-full h-12 bg-gradient-to-br from-emerald-900 to-[#051a0e] rounded-lg mb-2"></div>
              <span class="text-xs font-bold text-emerald-400">Esmeralda Pro</span>
            </button>

            <button
              type="button"
              (click)="setWallpaper('obsidian')"
              [class]="prefs.prefs().wallpaper === 'obsidian' ? 'ring-2 ring-purple-500 border-purple-500' : 'border-[#381c0c]'"
              class="p-3 rounded-xl bg-[#0c0c0e] border text-center cursor-pointer hover:border-purple-600 transition-all">
              <div class="w-full h-12 bg-gradient-to-br from-stone-800 to-[#0c0c0e] rounded-lg mb-2"></div>
              <span class="text-xs font-bold text-stone-300">Obsidiana Dark</span>
            </button>
          </div>
        </div>

        <!-- PERFIL OPERACIONAL POR SEGMENTO -->
        <div class="bg-[#180b04] border border-[#381c0c] rounded-2xl p-4 space-y-3">
          <div class="flex items-center gap-2">
            <mat-icon class="text-amber-500 text-base">store</mat-icon>
            <h3 class="text-xs font-bold text-white uppercase">Perfil Operacional do Estabelecimento</h3>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            @for (prof of operationalProfiles; track prof.id) {
              <button
                type="button"
                (click)="setProfile(prof.id)"
                [class]="prefs.prefs().operationalProfile === prof.id ? 'bg-amber-600 text-stone-950 font-black' : 'bg-[#241107] text-stone-300 border border-[#482814]'"
                class="p-2.5 rounded-xl text-left cursor-pointer transition-all flex flex-col justify-between h-20">
                <mat-icon class="text-lg">{{ prof.icon }}</mat-icon>
                <span>{{ prof.label }}</span>
              </button>
            }
          </div>
        </div>

        <!-- HARDWARE & PERIFÉRICOS ESC/POS -->
        <div class="bg-[#180b04] border border-[#381c0c] rounded-2xl p-4 space-y-3">
          <div class="flex items-center gap-2">
            <mat-icon class="text-amber-500 text-base">print</mat-icon>
            <h3 class="text-xs font-bold text-white uppercase">Impressora Térmica & Balança</h3>
          </div>

          <div class="space-y-2 text-xs text-stone-300">
            <div class="flex justify-between items-center bg-[#200e05] p-2.5 rounded-xl border border-[#381c0c]">
              <div>
                <strong class="text-white block">Driver ESC/POS Térmica 80mm</strong>
                <span class="text-[10px] text-stone-400">Porta USB / Serial COM3</span>
              </div>
              <span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                Conectado
              </span>
            </div>

            <div class="flex justify-between items-center bg-[#200e05] p-2.5 rounded-xl border border-[#381c0c]">
              <div>
                <strong class="text-white block">Balança Filizola / Toledo</strong>
                <span class="text-[10px] text-stone-400">Protocolo Contínuo 9600 baud</span>
              </div>
              <span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                Conectado
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  `
})
export class EAppSettingsWindow {
  readonly prefs = inject(OsPreferencesService);

  readonly operationalProfiles: { id: OperationalSegmentProfileId; label: string; icon: string }[] = [
    { id: 'restaurant', label: 'Restaurante & Bar', icon: 'restaurant' },
    { id: 'retail_electro', label: 'Varejo Tech & Eletro', icon: 'devices_other' },
    { id: 'pharmacy', label: 'Farmácia & Drogaria', icon: 'medication' },
    { id: 'automotive_services', label: 'Oficina & Serviços', icon: 'handyman' }
  ];

  setWallpaper(wp: 'amber' | 'emerald' | 'obsidian') {
    this.prefs.updateWallpaper(wp);
  }

  setProfile(p: OperationalSegmentProfileId) {
    this.prefs.applyOperationalProfile(p);
  }
}
