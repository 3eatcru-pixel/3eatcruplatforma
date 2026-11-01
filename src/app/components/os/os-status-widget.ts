import { ChangeDetectionStrategy, Component, inject, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EcosystemService } from '../../services/ecosystem.service';
import { OsPreferencesService } from '../../services/os-preferences.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-os-status-widget',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="bg-[#1d1008]/90 backdrop-blur-md border-2 border-[#4d2813] rounded-3xl p-4 sm:p-5 shadow-2xl w-80 text-stone-200 space-y-3 z-10">
      @if (isHqAuditMode()) {
        <div class="bg-gradient-to-r from-rose-950/90 via-amber-950/90 to-rose-950/90 border border-amber-600/80 rounded-2xl p-2.5 text-xs text-amber-200 flex items-center justify-between gap-2 shadow">
          <div class="flex items-center gap-1.5 font-bold">
            <mat-icon class="text-xs text-rose-400">admin_panel_settings</mat-icon>
            <span>Auditoria Dono do App</span>
          </div>
          <button
            type="button"
            (click)="returnToHq.emit()"
            class="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-2 py-0.5 rounded text-[10px] cursor-pointer shadow">
            ← Voltar HQ
          </button>
        </div>
      }

      <div class="text-[10px] uppercase font-mono font-bold text-amber-500 pb-2 border-b border-[#3d200f] flex items-center justify-between">
        <span class="flex items-center gap-1 truncate max-w-[200px]">
          <mat-icon class="text-xs text-amber-400">store</mat-icon>
          <span>{{ currentTenant().name }}</span>
        </span>
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" title="Terminal Operacional Online"></span>
      </div>

      <div class="space-y-2 text-xs font-sans">
        <div class="flex justify-between items-center">
          <span class="text-stone-400">Pilar:</span>
          <strong class="font-bold text-amber-300 uppercase text-[10px]">PILAR 2: STORE OS LOJISTA</strong>
        </div>
        <div class="text-[9px] text-stone-300 bg-black/40 p-2 rounded-xl border border-[#3d200f] leading-tight space-y-1">
          <div>Terminal exclusivo da unidade <strong>{{ currentTenant().name }}</strong> (PDV, KDS, Estoque e DRE).</div>
          <div class="text-amber-400 font-mono">⚠️ Não é o HQ Central (Pilar 1) e não é o Marketplace (Pilar 3).</div>
        </div>
        <div class="flex justify-between items-center bg-[#150a04] p-1.5 rounded-xl border border-[#3d200f]">
          <span class="text-[10px] text-stone-400">Modo de Dados:</span>
          <span class="text-[9px] font-mono font-bold px-2 py-0.5 rounded" [class]="ecosystem.isRealMode() ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50' : 'bg-amber-950 text-amber-300 border border-amber-700/50'">
            {{ ecosystem.isRealMode() ? '🟢 FIRESTORE REAL' : '🧪 SIMULAÇÃO SANDBOX' }}
          </span>
        </div>
        <div class="flex justify-between items-center bg-[#150a04] p-2 rounded-xl border border-[#3d200f]">
          <div class="space-y-0.5">
            <span class="text-stone-400 text-[10px] block">Controle de Expediente:</span>
            <span class="text-[9px] font-mono font-bold" [class]="currentTenant().isOpen ? 'text-emerald-400' : 'text-rose-400'">
              {{ currentTenant().isOpen ? 'ABERTA (ACEITANDO PEDIDOS)' : 'FECHADA (BALCÃO PAUSADO)' }}
            </span>
          </div>
          <button
            type="button"
            (click)="toggleStoreOnlineStatus()"
            [class]="currentTenant().isOpen ? 'bg-rose-950 text-rose-300 border-rose-700/80 hover:bg-rose-900' : 'bg-emerald-950 text-emerald-300 border-emerald-700/80 hover:bg-emerald-900'"
            class="px-2.5 py-1.5 rounded-lg border text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-all shadow-md active:scale-95">
            <mat-icon class="text-xs">{{ currentTenant().isOpen ? 'door_front' : 'storefront' }}</mat-icon>
            <span>{{ currentTenant().isOpen ? 'Fechar Loja' : 'Abrir Loja' }}</span>
          </button>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-stone-400">Licença:</span>
          <span class="font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50 text-[10px] font-mono uppercase">
            {{ currentTenant().plan }} Ativa
          </span>
        </div>
        <div class="pt-1.5 border-t border-[#3d200f] space-y-1">
          <label for="osOperationalProfileSelect" class="block text-[10px] text-stone-400">
            Perfil Operacional do Segmento:
          </label>
          <select
            id="osOperationalProfileSelect"
            [value]="currentOperationalProfile()"
            (change)="setOperationalProfile($event)"
            class="w-full bg-[#2a160b] text-amber-300 text-[10px] font-mono font-bold border border-[#4d2813] rounded-lg px-2 py-1 outline-none cursor-pointer">
            <option value="restaurant">Restaurante (Mesas, KDS, Reservas)</option>
            <option value="retail_electro">Varejo &amp; Eletro (EAN-13, Série)</option>
            <option value="pharmacy">Farmácia &amp; Saúde (Lote, Receita)</option>
            <option value="automotive_services">Automotivo &amp; O.S. (Placa, Agenda)</option>
          </select>
        </div>
        <div class="flex justify-between items-center pt-1 border-t border-[#3d200f]">
          <label for="osWallpaperSelect" class="text-stone-400">Papel de Parede:</label>
          <select
            id="osWallpaperSelect"
            [value]="currentWallpaper()"
            (change)="setWallpaper($event)"
            class="bg-[#2a160b] text-amber-300 text-[10px] font-mono font-bold border border-[#4d2813] rounded-lg px-2 py-0.5 outline-none cursor-pointer">
            <option value="carbon">Carbon Fiber</option>
            <option value="amber">Cyber Amber</option>
            <option value="emerald">Emerald Slate</option>
            <option value="obsidian">Dark Obsidian</option>
          </select>
        </div>
        <div class="pt-2 border-t border-[#3d200f] flex flex-col gap-1.5">
          <button (click)="openPos.emit()" class="w-full bg-[#2a1408] hover:bg-[#381c0c] text-amber-300 border border-[#482814] font-bold py-2 rounded-2xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow transition-transform active:scale-95">
            <mat-icon class="text-xs text-emerald-400">point_of_sale</mat-icon><span>Abrir Terminal PDV (Tela Cheia)</span>
          </button>
          <button (click)="openStoreManager.emit()" class="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold py-2 rounded-2xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-transform active:scale-95">
            <mat-icon class="text-xs">brush</mat-icon><span>Personalizar Vitrine da Loja</span>
          </button>
        </div>
      </div>
    </div>
  `
})
export class OsStatusWidgetComponent {
  readonly ecosystem = inject(EcosystemService);
  readonly prefsService = inject(OsPreferencesService);

  returnToHq = output<void>();
  openPos = output<void>();
  openStoreManager = output<void>();

  readonly isHqAuditMode = computed(() => {
    const session = this.ecosystem.currentSession();
    return session && session.role === 'hq_admin';
  });

  readonly currentTenant = computed(() => {
    const id = this.ecosystem.currentTenantId();
    return this.ecosystem.tenants().find(t => t.id === id) || this.ecosystem.tenants()[0];
  });

  readonly currentWallpaper = computed(() => this.prefsService.prefs().wallpaper);
  readonly currentOperationalProfile = computed(() => this.prefsService.prefs().operationalProfile);

  toggleStoreOnlineStatus() {
    const current = this.currentTenant();
    const newIsOpen = !current.isOpen;
    this.ecosystem.updateTenant(current.id, { isOpen: newIsOpen });
    this.ecosystem.notify(
      newIsOpen
        ? `Loja ${current.name} está ONLINE. Pedidos no Marketplace ativados!`
        : `Loja ${current.name} em OPERAÇÃO LOCAL (OFFLINE). Pedidos online pausados.`,
      newIsOpen ? 'success' : 'warning'
    );
  }

  setOperationalProfile(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.prefsService.updatePrefs({ operationalProfile: val as import('../../models/ecosystem.model').OperationalSegmentProfileId });
  }

  setWallpaper(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.prefsService.updatePrefs({ wallpaper: val as 'carbon' | 'amber' | 'emerald' | 'obsidian' });
  }
}
