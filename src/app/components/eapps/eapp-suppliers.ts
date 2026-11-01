import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { EcosystemService } from '../../services/ecosystem.service';
import { StoreSupplier, SuppliersService } from '../../services/suppliers.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-suppliers',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#140b06] text-stone-200 font-mono overflow-hidden p-4 space-y-4">
      <header class="flex flex-wrap items-center justify-between gap-3 bg-[#1c0d06] p-3 rounded-2xl border border-[#381c0c] shrink-0">
        <div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-500 flex items-center justify-center"><mat-icon>local_shipping</mat-icon></div><div><h2 class="text-sm font-serif font-black text-white">Fornecedores da unidade</h2><p class="text-[10px] text-stone-400">Cadastro de contatos. Pedidos de compra e recebimento de mercadorias não estão habilitados.</p></div></div>
        <button type="button" (click)="refresh()" [disabled]="isLoading() || !canManage()" aria-label="Atualizar fornecedores" class="px-3 py-2 border border-[#593017] rounded-xl disabled:opacity-50"><mat-icon class="!text-sm !h-4 !w-4">refresh</mat-icon></button>
      </header>
      @if (!canManage()) { <div class="flex-1 flex items-center justify-center text-center text-amber-300">Fornecedores estão restritos ao proprietário ou operador da unidade.</div> }
      @else {
        @if (isSimulation()) { <div class="shrink-0 rounded-xl border border-amber-700/60 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">Modo de simulação: fornecedores reais estão protegidos; esta janela não envia alterações ao servidor.</div> }
        <form (ngSubmit)="createSupplier()" class="grid gap-2 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto] bg-[#180b04] border border-[#381c0c] rounded-2xl p-3 shrink-0">
          <input name="name" required maxlength="120" [ngModel]="draftName()" (ngModelChange)="draftName.set($event)" placeholder="Empresa fornecedora" class="rounded-lg bg-[#100803] border border-[#593017] px-3 py-2 text-xs text-white" />
          <input name="category" required maxlength="60" [ngModel]="draftCategory()" (ngModelChange)="draftCategory.set($event)" placeholder="Categoria" class="rounded-lg bg-[#100803] border border-[#593017] px-3 py-2 text-xs text-white" />
          <input name="contactName" maxlength="100" [ngModel]="draftContact()" (ngModelChange)="draftContact.set($event)" placeholder="Contato" class="rounded-lg bg-[#100803] border border-[#593017] px-3 py-2 text-xs text-white" />
          <input name="phone" maxlength="32" [ngModel]="draftPhone()" (ngModelChange)="draftPhone.set($event)" placeholder="Telefone" class="rounded-lg bg-[#100803] border border-[#593017] px-3 py-2 text-xs text-white" />
          <button type="submit" [disabled]="isSimulation() || isSaving()" class="rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-stone-950 disabled:opacity-50">{{ isSaving() ? 'Salvando…' : 'Cadastrar' }}</button>
        </form>
        @if (loadError()) { <div role="alert" class="rounded-xl border border-rose-800 bg-rose-950/30 p-3 text-xs text-rose-200">{{ loadError() }} <button type="button" (click)="refresh()" class="ml-2 underline">Tentar novamente</button></div> }
        @if (actionError()) { <div role="alert" class="text-xs text-rose-300">{{ actionError() }}</div> }
        @if (isLoading()) { <div class="flex-1 flex items-center justify-center text-sm text-stone-400">Carregando fornecedores…</div> }
        @else if (suppliers().length === 0) { <div class="flex-1 flex items-center justify-center text-center text-sm text-stone-500">Nenhum fornecedor cadastrado nesta unidade.</div> }
        @else { <div class="flex-1 min-h-0 overflow-auto custom-scrollbar border border-[#381c0c] rounded-2xl bg-[#180b04]"><table class="w-full text-left text-xs"><thead class="bg-[#200e05] text-stone-400 border-b border-[#381c0c] sticky top-0"><tr><th class="p-3">Fornecedor</th><th class="p-3">Categoria</th><th class="p-3">Contato</th><th class="p-3">Status</th><th class="p-3 text-right">Ação</th></tr></thead><tbody class="divide-y divide-[#2a1307]">@for (supplier of suppliers(); track supplier.id) { <tr class="hover:bg-[#200e05]/60" [class.opacity-50]="supplier.status === 'inactive'"><td class="p-3 font-bold text-white">{{ supplier.name }}</td><td class="p-3 text-amber-300">{{ supplier.category }}</td><td class="p-3 text-stone-300">{{ supplier.contactName || 'Contato não informado' }}<div class="text-[10px] text-stone-500">{{ supplier.phone || supplier.email || 'Sem telefone ou e-mail' }}</div></td><td class="p-3">{{ supplier.status === 'inactive' ? 'Inativo' : 'Ativo' }}</td><td class="p-3 text-right"><button type="button" (click)="toggleStatus(supplier)" [disabled]="isSimulation() || busyId() === supplier.id" class="rounded-lg border border-[#593017] px-2 py-1 text-amber-300 disabled:opacity-50">{{ supplier.status === 'inactive' ? 'Reativar' : 'Desativar' }}</button></td></tr> }</tbody></table></div> }
      }
    </div>
  `
})
export class EAppSuppliersWindow {
  private readonly ecosystem = inject(EcosystemService);
  private readonly suppliersService = inject(SuppliersService);
  readonly suppliers = this.suppliersService.suppliers;
  readonly isSimulation = this.ecosystem.isSimulationMode;
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly busyId = signal<string | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly draftName = signal('');
  readonly draftCategory = signal('');
  readonly draftContact = signal('');
  readonly draftPhone = signal('');
  readonly canManage = computed(() => ['tenant_owner', 'operator'].includes(this.ecosystem.currentSession()?.role || ''));
  private generation = 0;

  constructor() {
    effect(() => {
      const tenantId = this.ecosystem.resolveOperationalTenantId();
      const allowed = this.canManage();
      const simulation = this.isSimulation();
      const generation = ++this.generation;
      if (!tenantId || !allowed || simulation) { this.suppliersService.suppliers.set([]); this.isLoading.set(false); return; }
      this.suppliersService.suppliers.set([]);
      void this.load(tenantId, generation);
    });
  }

  async refresh(): Promise<void> {
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    if (tenantId && this.canManage() && !this.isSimulation()) await this.load(tenantId, ++this.generation);
  }

  async createSupplier(): Promise<void> {
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    if (!tenantId || !this.canManage() || this.isSimulation() || !this.draftName().trim() || !this.draftCategory().trim()) return;
    this.isSaving.set(true); this.actionError.set(null);
    try {
      await this.suppliersService.createSupplier({ tenantId, name: this.draftName().trim(), category: this.draftCategory().trim(), contactName: this.draftContact().trim(), phone: this.draftPhone().trim(), email: '' });
      this.draftName.set(''); this.draftCategory.set(''); this.draftContact.set(''); this.draftPhone.set('');
    } catch { this.actionError.set('Não foi possível cadastrar o fornecedor.'); }
    finally { this.isSaving.set(false); }
  }

  async toggleStatus(supplier: StoreSupplier): Promise<void> {
    if (this.isSimulation()) return;
    this.busyId.set(supplier.id); this.actionError.set(null);
    try { await this.suppliersService.setStatus(supplier.id, supplier.status === 'inactive' ? 'active' : 'inactive'); }
    catch { this.actionError.set('Não foi possível alterar o status do fornecedor.'); }
    finally { this.busyId.set(null); }
  }

  private async load(tenantId: string, generation: number): Promise<void> {
    this.isLoading.set(true); this.loadError.set(null);
    try { await this.suppliersService.fetchSuppliers(tenantId); }
    catch { if (generation === this.generation) this.loadError.set('Não foi possível carregar fornecedores desta unidade.'); }
    finally { if (generation === this.generation) this.isLoading.set(false); }
  }
}
