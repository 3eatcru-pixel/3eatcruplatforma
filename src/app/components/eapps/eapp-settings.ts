import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { OsPreferencesService } from '../../services/os-preferences.service';
import { ExternalPaymentTerminal, ExternalTerminalMethod, OperationalSegmentProfileId } from '../../models/ecosystem.model';
import { EcosystemService } from '../../services/ecosystem.service';
import { SecurityService } from '../../services/security.service';
import { PosPrintService } from '../../services/pos-print.service';

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
          <p class="text-[10px] text-stone-400">Preferências da loja, terminais de pagamento e impressão deste caixa.</p>
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

        <section class="rounded-2xl border border-[#68421d] bg-[#180b04] p-4 space-y-4">
          <header class="flex items-start gap-2">
            <mat-icon class="text-amber-500 text-base">point_of_sale</mat-icon>
            <div><h3 class="text-xs font-bold uppercase text-white">Maquininhas externas da loja</h3>
              <p class="mt-1 text-[10px] leading-relaxed text-stone-400">Cadastre os equipamentos aceitos. No PDV, o operador seleciona a maquininha e confirma depois de conferir o pagamento nela.</p></div>
          </header>

          @if (!canManageStorePeripherals()) {
            <p class="rounded-lg border border-stone-700 bg-[#200e05] p-3 text-xs text-stone-400">A configuração pertence ao proprietário e aos operadores da loja.</p>
          } @else {
            @for (terminal of terminalDraft(); track terminal.id) {
              <article class="space-y-3 rounded-xl border border-[#482814] bg-[#200e05] p-3">
                <div class="grid gap-2 sm:grid-cols-2">
                  <label class="space-y-1 text-[10px] text-stone-400">Nome no PDV
                    <input class="w-full rounded-lg border border-[#482814] bg-[#0b0705] px-2.5 py-2 text-xs text-white" maxlength="80" [value]="terminal.name" (input)="updateTerminalName(terminal.id, $any($event.target).value)" />
                  </label>
                  <label class="space-y-1 text-[10px] text-stone-400">Marca/modelo (opcional)
                    <input class="w-full rounded-lg border border-[#482814] bg-[#0b0705] px-2.5 py-2 text-xs text-white" maxlength="80" placeholder="Ex.: PagBank Moderninha" [value]="terminal.brand || ''" (input)="updateTerminalBrand(terminal.id, $any($event.target).value)" />
                  </label>
                </div>
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <label class="flex items-center gap-2 text-xs text-stone-300"><input type="checkbox" class="accent-emerald-500" [checked]="terminal.enabled" (change)="setTerminalEnabled(terminal.id, $any($event.target).checked)" />Disponível neste caixa</label>
                  <button type="button" class="rounded-lg border border-rose-900 px-2.5 py-1.5 text-[10px] font-bold text-rose-300" (click)="removeTerminal(terminal.id)">Remover cadastro</button>
                </div>
                <div class="flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-stone-300">
                  <label class="flex items-center gap-1.5"><input type="checkbox" class="accent-cyan-500" [checked]="terminal.methods.includes('pix')" (change)="setTerminalMethod(terminal.id, 'pix', $any($event.target).checked)" />PIX</label>
                  <label class="flex items-center gap-1.5"><input type="checkbox" class="accent-indigo-500" [checked]="terminal.methods.includes('credit_card')" (change)="setTerminalMethod(terminal.id, 'credit_card', $any($event.target).checked)" />Crédito</label>
                  <label class="flex items-center gap-1.5"><input type="checkbox" class="accent-violet-500" [checked]="terminal.methods.includes('debit_card')" (change)="setTerminalMethod(terminal.id, 'debit_card', $any($event.target).checked)" />Débito</label>
                </div>
              </article>
            } @empty {
              <p class="rounded-lg border border-dashed border-[#68421d] p-4 text-center text-xs text-stone-400">Nenhuma maquininha cadastrada pela loja.</p>
            }
            <div class="flex flex-wrap justify-end gap-2">
              <button type="button" [disabled]="terminalDraft().length >= 8" class="rounded-lg border border-[#68421d] px-3 py-2 text-[10px] font-bold text-amber-200 disabled:opacity-40" (click)="addTerminal()">Adicionar maquininha</button>
              <button type="button" [disabled]="!canSaveTerminals()" class="rounded-lg bg-amber-500 px-3 py-2 text-[10px] font-black text-stone-950 disabled:opacity-40" (click)="saveTerminals()">{{ savingTerminals() ? 'Salvando…' : 'Salvar terminais da loja' }}</button>
            </div>
            <p class="text-[10px] leading-relaxed text-amber-100/70">Os perfis são compartilhados entre os caixas da loja. Não conectam ao adquirente nem guardam credenciais de pagamento.</p>
          }
        </section>

        <section class="rounded-2xl border border-[#381c0c] bg-[#180b04] p-4 space-y-3">
          <header class="flex items-center gap-2"><mat-icon class="text-amber-500 text-base">print</mat-icon><div><h3 class="text-xs font-bold uppercase text-white">Impressora deste caixa</h3><p class="text-[10px] text-stone-400">Preferência local deste navegador e computador.</p></div></header>
          @if (canManageStorePeripherals()) {
            <label class="block space-y-1 text-[10px] text-stone-400">Nome/identificação local
              <input class="w-full rounded-lg border border-[#482814] bg-[#0b0705] px-3 py-2 text-xs text-white" maxlength="80" placeholder="Ex.: Impressora térmica do balcão" [value]="receiptPrinter().label" (input)="updatePrinterLabel($any($event.target).value)" />
            </label>
            <label class="block space-y-1 text-[10px] text-stone-400">Largura do papel
              <select class="w-full rounded-lg border border-[#482814] bg-[#0b0705] px-3 py-2 text-xs text-white" [value]="receiptPrinter().paperWidthMm" (change)="updatePaperWidth(+$any($event.target).value)"><option value="58">Bobina 58 mm</option><option value="80">Bobina 80 mm</option></select>
            </label>
            <button type="button" class="rounded-lg border border-emerald-800 bg-emerald-950/60 px-3 py-2 text-[10px] font-bold text-emerald-200" (click)="printTestPage()">Imprimir página de teste</button>
          } @else {
            <p class="text-xs text-stone-400">{{ receiptPrinter().label || 'Sem nome local configurado' }} • Bobina {{ receiptPrinter().paperWidthMm }} mm</p>
          }
          <p class="text-[10px] leading-relaxed text-stone-500">O navegador abre o diálogo de impressão; selecione ali uma impressora instalada no sistema (USB, rede ou Bluetooth com driver). O app não descobre nem controla a impressora diretamente.</p>
        </section>
      </div>

    </div>
  `
})
export class EAppSettingsWindow {
  readonly prefs = inject(OsPreferencesService);
  private readonly ecosystem = inject(EcosystemService);
  private readonly security = inject(SecurityService);
  private readonly printService = inject(PosPrintService);
  readonly terminalDraft = signal<ExternalPaymentTerminal[]>([]);
  readonly terminalsDirty = signal(false);
  readonly savingTerminals = signal(false);
  readonly currentTenant = computed(() => this.ecosystem.currentTenant());
  readonly canManageStorePeripherals = computed(() => {
    const role = this.security.currentSession()?.role;
    return role === 'tenant_owner' || role === 'operator';
  });
  readonly receiptPrinter = computed(() => this.prefs.prefs().peripherals.receiptPrinter);
  readonly canSaveTerminals = computed(() =>
    this.canManageStorePeripherals() &&
    this.terminalsDirty() &&
    !this.savingTerminals() &&
    this.terminalDraft().every((terminal) =>
      Boolean(terminal.name.trim()) && (!terminal.enabled || terminal.methods.length > 0)
    )
  );

  constructor() {
    effect(() => {
      const terminals = this.currentTenant()?.externalPaymentTerminals || [];
      this.security.executionModeRevision();
      this.terminalDraft.set(terminals.map((terminal) => ({ ...terminal, methods: [...terminal.methods] })));
      this.terminalsDirty.set(false);
    });
  }

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

  addTerminal() {
    if (!this.canManageStorePeripherals() || this.terminalDraft().length >= 8) return;
    const id = globalThis.crypto?.randomUUID?.() || `terminal-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
    const nextNumber = this.terminalDraft().length + 1;
    this.updateTerminals((terminals) => [...terminals, {
      id,
      name: `Maquininha ${nextNumber}`,
      enabled: true,
      methods: ['pix', 'credit_card', 'debit_card']
    }]);
  }

  updateTerminalName(id: string, name: string) {
    this.updateTerminal(id, { name });
  }

  updateTerminalBrand(id: string, brand: string) {
    this.updateTerminal(id, { brand });
  }

  setTerminalEnabled(id: string, enabled: boolean) {
    this.updateTerminal(id, { enabled });
  }

  setTerminalMethod(id: string, method: ExternalTerminalMethod, enabled: boolean) {
    this.updateTerminals((terminals) => terminals.map((terminal) => {
      if (terminal.id !== id) return terminal;
      const methods = new Set(terminal.methods);
      if (enabled) methods.add(method);
      else methods.delete(method);
      return { ...terminal, methods: [...methods] };
    }));
  }

  removeTerminal(id: string) {
    this.updateTerminals((terminals) => terminals.filter((terminal) => terminal.id !== id));
  }

  private updateTerminal(id: string, patch: Partial<ExternalPaymentTerminal>) {
    this.updateTerminals((terminals) => terminals.map((terminal) => terminal.id === id ? { ...terminal, ...patch } : terminal));
  }

  private updateTerminals(update: (terminals: ExternalPaymentTerminal[]) => ExternalPaymentTerminal[]) {
    this.terminalDraft.update((terminals) => update(terminals));
    this.terminalsDirty.set(true);
  }

  async saveTerminals() {
    const tenant = this.currentTenant();
    if (!tenant || !this.canSaveTerminals()) return;
    const revision = this.security.executionModeRevision();
    const snapshot = this.terminalDraft().map((terminal) => ({ ...terminal, methods: [...terminal.methods] }));
    this.savingTerminals.set(true);
    try {
      const updated = await this.ecosystem.updateTenant(tenant.id, { externalPaymentTerminals: snapshot });
      if (revision !== this.security.executionModeRevision() || this.currentTenant()?.id !== tenant.id) return;
      this.terminalDraft.set((updated.externalPaymentTerminals || []).map((terminal) => ({ ...terminal, methods: [...terminal.methods] })));
      this.terminalsDirty.set(false);
      this.ecosystem.notify('Terminais externos da loja salvos para os caixas.', 'success');
    } catch {
      if (revision === this.security.executionModeRevision() && this.currentTenant()?.id === tenant.id) {
        this.ecosystem.notify('Não foi possível salvar os terminais. Confira a conexão e tente novamente.', 'error');
      }
    } finally {
      this.savingTerminals.set(false);
    }
  }

  updatePrinterLabel(label: string) {
    this.prefs.updateReceiptPrinter({ label });
  }

  updatePaperWidth(paperWidthMm: number) {
    this.prefs.updateReceiptPrinter({ paperWidthMm: paperWidthMm === 58 ? 58 : 80 });
  }

  printTestPage() {
    const printer = this.receiptPrinter();
    const opened = this.printService.printTest(this.currentTenant()?.name || '', printer.label, printer.paperWidthMm);
    if (!opened) this.ecosystem.notify('O navegador bloqueou a janela de impressão. Permita pop-ups para imprimir a página de teste.', 'warning');
  }
}
