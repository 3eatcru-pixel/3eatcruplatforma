import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { EcosystemService } from '../../services/ecosystem.service';
import { InventoryService } from '../../services/inventory.service';
import { StockAuditsService } from '../../services/stock-audits.service';
import { ProductItem, StockAuditRecord } from '../../models/ecosystem.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-stock-audit',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#140b06] text-stone-200 font-mono overflow-hidden p-4 space-y-4">
      <header class="flex flex-wrap items-center justify-between gap-3 bg-[#1c0d06] p-3 rounded-2xl border border-[#381c0c] shrink-0">
        <div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-500 flex items-center justify-center"><mat-icon>fact_check</mat-icon></div><div><h2 class="text-sm font-serif font-black text-white">Conferência de estoque</h2><p class="text-[10px] text-stone-400">Registra contagem física e divergências. O saldo do produto não é alterado automaticamente.</p></div></div>
        <div class="flex items-center gap-2"><button type="button" (click)="refresh()" [disabled]="isLoading() || !canManage()" aria-label="Atualizar produtos" class="px-3 py-2 border border-[#593017] rounded-xl disabled:opacity-50"><mat-icon class="!text-sm !h-4 !w-4">refresh</mat-icon></button><button type="button" (click)="saveAudit()" [disabled]="isLoading() || isSaving() || finalized() || products().length === 0 || !canManage()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase rounded-xl disabled:opacity-50">{{ finalized() ? 'Contagem salva' : isSaving() ? 'Salvando…' : 'Registrar contagem' }}</button></div>
      </header>
      @if (!canManage()) { <div class="flex-1 flex items-center justify-center text-center text-amber-300">A conferência de estoque está restrita ao proprietário ou operador da unidade.</div> }
      @else {
        @if (isSimulation()) { <div class="shrink-0 rounded-xl border border-amber-700/60 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">Modo de simulação: a contagem fica apenas nesta sessão e não é enviada ao servidor.</div> }
        @if (error()) { <div role="alert" class="shrink-0 rounded-xl border border-rose-800 bg-rose-950/30 p-3 text-xs text-rose-200">{{ error() }} <button type="button" (click)="refresh()" class="ml-2 underline">Tentar novamente</button></div> }
        @if (message()) { <div class="shrink-0 rounded-xl border border-emerald-800 bg-emerald-950/30 p-3 text-xs text-emerald-200">{{ message() }}</div> }
        @if (isLoading()) { <div class="flex-1 flex items-center justify-center text-sm text-stone-400">Carregando produtos…</div> }
        @else if (products().length === 0) { <div class="flex-1 flex items-center justify-center text-center text-sm text-stone-500">Cadastre produtos para iniciar a conferência.</div> }
        @else {
          <div class="flex-1 min-h-0 overflow-auto custom-scrollbar border border-[#381c0c] rounded-2xl bg-[#180b04]"><table class="w-full text-left text-xs"><thead class="bg-[#200e05] text-stone-400 border-b border-[#381c0c] sticky top-0"><tr><th class="p-3">Produto / SKU</th><th class="p-3 text-center">Contagem física</th><th class="p-3 text-center">Saldo no sistema</th><th class="p-3 text-right">Diferença</th></tr></thead><tbody class="divide-y divide-[#2a1307]">@for (product of products(); track product.id) { @let count = countFor(product); @let diff = count - product.stock; <tr class="hover:bg-[#200e05]/60"><td class="p-3 font-bold text-white"><div>{{ product.name }}</div><span class="text-[10px] text-stone-500 font-normal">SKU: {{ product.sku }}</span></td><td class="p-3 text-center"><input type="number" min="0" step="1" [disabled]="finalized()" [ngModel]="count" (ngModelChange)="setCount(product.id, $event)" [attr.aria-label]="'Contagem física para ' + product.name" class="w-24 rounded-lg border border-[#593017] bg-[#100803] px-2 py-1 text-center font-black text-white disabled:opacity-60" /></td><td class="p-3 text-center text-stone-400">{{ product.stock }} un</td><td class="p-3 text-right font-black" [class.text-emerald-400]="diff === 0" [class.text-rose-400]="diff < 0" [class.text-amber-400]="diff > 0">{{ diff > 0 ? '+' : '' }}{{ diff }} un</td></tr> }</tbody></table></div>
          @if (products().length >= maxProducts) { <p class="shrink-0 text-[10px] text-amber-300">A tela limita a contagem aos primeiros {{ maxProducts }} produtos; selecione o grupo desejado antes de contar.</p> }
        }
        @if (audits().length > 0) { <div class="shrink-0 max-h-24 overflow-auto rounded-xl border border-[#381c0c] bg-[#180b04] p-3"><span class="text-[10px] font-black uppercase tracking-wider text-stone-400">Última contagem registrada</span>@for (audit of audits().slice(0, 1); track audit.id) { <p class="mt-1 text-xs text-stone-300">{{ audit.createdAt | date:'dd/MM/yyyy HH:mm' }} · {{ audit.entries.length }} itens · {{ audit.varianceCount }} divergências</p> }</div> }
      }
    </div>
  `
})
export class EAppStockAuditWindow {
  private readonly ecosystem = inject(EcosystemService);
  private readonly inventory = inject(InventoryService);
  private readonly auditsService = inject(StockAuditsService);
  readonly products = computed(() => this.inventory.products().filter((product) => product.tenantId === this.ecosystem.resolveOperationalTenantId()).slice(0, this.maxProducts));
  readonly audits = this.auditsService.audits;
  readonly isSimulation = this.inventory.isSimulation;
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly finalized = signal(false);
  readonly error = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly counts = signal<Record<string, number>>({});
  readonly maxProducts = 200;
  readonly canManage = computed(() => ['tenant_owner', 'operator'].includes(this.ecosystem.currentSession()?.role || ''));
  private generation = 0;

  constructor() {
    effect(() => {
      const tenantId = this.ecosystem.resolveOperationalTenantId();
      const allowed = this.canManage();
      const generation = ++this.generation;
      this.inventory.products.set([]);
      this.auditsService.audits.set([]);
      this.counts.set({});
      this.finalized.set(false);
      if (!tenantId || !allowed) { this.isLoading.set(false); return; }
      void this.load(tenantId, generation);
    });
  }

  async refresh(): Promise<void> {
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    if (!tenantId || !this.canManage()) return;
    this.counts.set({}); this.finalized.set(false); this.message.set(null);
    await this.load(tenantId, ++this.generation);
  }

  countFor(product: ProductItem): number {
    return this.counts()[product.id] ?? Math.max(0, Math.floor(Number(product.stock) || 0));
  }

  setCount(productId: string, rawValue: unknown): void {
    const count = Number(rawValue);
    if (!Number.isSafeInteger(count) || count < 0) return;
    this.counts.update((current) => ({ ...current, [productId]: count }));
  }

  async saveAudit(): Promise<void> {
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    if (!tenantId || !this.canManage() || this.products().length === 0 || this.finalized()) return;
    this.isSaving.set(true); this.error.set(null); this.message.set(null);
    try {
      if (this.isSimulation()) {
        this.finalized.set(true);
        this.message.set('Contagem demonstrativa concluída nesta sessão; nenhum registro persistente foi criado.');
        return;
      }
      const record: StockAuditRecord = await this.auditsService.createAudit(tenantId, this.products().map((product) => ({ productId: product.id, countedStock: this.countFor(product) })));
      this.finalized.set(true);
      this.message.set(`Contagem salva com ${record.varianceCount} divergência(s). O saldo de estoque não foi alterado.`);
    } catch {
      this.error.set('Não foi possível salvar a conferência. Atualize os produtos e tente novamente.');
    } finally {
      this.isSaving.set(false);
    }
  }

  private async load(tenantId: string, generation: number): Promise<void> {
    this.isLoading.set(true); this.error.set(null);
    try {
      const jobs: Promise<unknown>[] = [this.inventory.fetchProducts(tenantId)];
      if (!this.isSimulation()) jobs.push(this.auditsService.fetchAudits(tenantId));
      await Promise.all(jobs);
      if (generation === this.generation) {
        const initial = Object.fromEntries(this.products().map((product) => [product.id, Math.max(0, Math.floor(Number(product.stock) || 0))]));
        this.counts.set(initial);
      }
    } catch {
      if (generation === this.generation) this.error.set('Não foi possível carregar produtos ou conferências da unidade.');
    } finally {
      if (generation === this.generation) this.isLoading.set(false);
    }
  }
}
