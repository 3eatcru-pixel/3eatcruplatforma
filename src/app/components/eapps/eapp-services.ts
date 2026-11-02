import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { EcosystemService } from '../../services/ecosystem.service';
import { ServiceOrdersService } from '../../services/service-orders.service';
import { ServiceOrder } from '../../models/ecosystem.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-services',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#140b06] text-stone-200 font-mono overflow-hidden p-4 space-y-4">
      <header class="flex flex-wrap items-center justify-between gap-3 bg-[#1c0d06] p-3 rounded-2xl border border-[#381c0c] shrink-0">
        <div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-500 flex items-center justify-center"><mat-icon>handyman</mat-icon></div><div><h2 class="text-sm font-serif font-black text-white">Ordens de serviço</h2><p class="text-[10px] text-stone-400">Abertura e andamento da unidade; cobrança e recebimento são tratados separadamente.</p></div></div>
        <button type="button" (click)="refresh()" [disabled]="isLoading() || !canManage()" aria-label="Atualizar ordens" class="px-3 py-2 border border-[#593017] rounded-xl disabled:opacity-50"><mat-icon class="!text-sm !h-4 !w-4">refresh</mat-icon></button>
      </header>

      @if (!canManage()) {
        <div class="flex-1 flex items-center justify-center p-8 text-center text-amber-300">Ordens de serviço estão restritas ao proprietário ou operador da unidade.</div>
      } @else {
        @if (isSimulation()) { <div class="shrink-0 rounded-xl border border-amber-700/60 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">Modo de simulação: ordens e alterações ficam somente na memória desta sessão.</div> }
        <form (ngSubmit)="createOrder()" class="grid gap-2 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_2fr_auto] bg-[#180b04] border border-[#381c0c] rounded-2xl p-3 shrink-0">
          <input name="customerName" required maxlength="100" [ngModel]="draftCustomer()" (ngModelChange)="draftCustomer.set($event)" placeholder="Cliente" class="rounded-lg bg-[#100803] border border-[#593017] px-3 py-2 text-xs text-white" />
          <input name="equipment" maxlength="120" [ngModel]="draftEquipment()" (ngModelChange)="draftEquipment.set($event)" placeholder="Equipamento ou veículo (opcional)" class="rounded-lg bg-[#100803] border border-[#593017] px-3 py-2 text-xs text-white" />
          <input name="description" required maxlength="1000" [ngModel]="draftDescription()" (ngModelChange)="draftDescription.set($event)" placeholder="Defeito relatado ou serviço solicitado" class="rounded-lg bg-[#100803] border border-[#593017] px-3 py-2 text-xs text-white" />
          <button type="submit" [disabled]="isSaving()" class="rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-stone-950 disabled:opacity-50">{{ isSaving() ? 'Abrindo…' : 'Abrir O.S.' }}</button>
        </form>
        @if (loadError()) { <div role="alert" class="rounded-xl border border-rose-800 bg-rose-950/30 p-3 text-xs text-rose-200">{{ loadError() }} <button type="button" (click)="refresh()" class="ml-2 underline">Tentar novamente</button></div> }
        @if (actionError()) { <div role="alert" class="text-xs text-rose-300">{{ actionError() }}</div> }
        @if (isLoading()) { <div class="flex-1 flex items-center justify-center text-sm text-stone-400">Carregando ordens…</div> }
        @else if (orders().length === 0) { <div class="flex-1 flex items-center justify-center text-center text-sm text-stone-500">Nenhuma ordem de serviço nesta unidade.</div> }
        @else {
          <div class="flex-1 min-h-0 overflow-auto custom-scrollbar border border-[#381c0c] rounded-2xl bg-[#180b04]">
            <table class="w-full min-w-[760px] text-left text-xs">
              <thead class="bg-[#200e05] text-stone-400 border-b border-[#381c0c] sticky top-0"><tr><th class="p-3">O.S.</th><th class="p-3">Cliente / equipamento</th><th class="p-3">Descrição</th><th class="p-3">Status</th><th class="p-3">Ação</th></tr></thead>
              <tbody class="divide-y divide-[#2a1307]">
                @for (order of orders(); track order.id) {
                  <tr class="hover:bg-[#200e05]/60"><td class="p-3 font-bold text-amber-400">{{ order.osNumber }}</td><td class="p-3"><div class="font-bold text-white">{{ order.customerName }}</div><div class="text-[10px] text-stone-400">{{ order.equipment || order.vehicleInfo || 'Sem equipamento informado' }}</div></td><td class="max-w-sm p-3 text-stone-300">{{ order.description }}</td><td class="p-3 text-amber-300">{{ statusLabel(order.status) }}</td><td class="p-3"><button type="button" (click)="advance(order)" [disabled]="!nextStatus(order) || busyOrderId() === order.id" class="rounded-lg border border-amber-800 px-2 py-1 text-amber-300 disabled:opacity-40">{{ nextStatus(order) ? 'Avançar: ' + statusLabel(nextStatus(order)!) : 'Encerrada' }}</button></td></tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    </div>
  `
})
export class EAppServicesWindow {
  private readonly ecosystem = inject(EcosystemService);
  private readonly serviceOrders = inject(ServiceOrdersService);
  readonly orders = this.serviceOrders.serviceOrders;
  readonly isSimulation = this.ecosystem.isSimulationMode;
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly busyOrderId = signal<string | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly draftCustomer = signal('');
  readonly draftEquipment = signal('');
  readonly draftDescription = signal('');
  readonly canManage = computed(() => ['tenant_owner', 'operator'].includes(this.ecosystem.currentSession()?.role || ''));
  private generation = 0;

  constructor() {
    effect(() => {
      this.isSimulation();
      const tenantId = this.ecosystem.resolveOperationalTenantId();
      const allowed = this.canManage();
      const generation = ++this.generation;
      this.draftCustomer.set('');
      this.draftEquipment.set('');
      this.draftDescription.set('');
      if (!tenantId || !allowed) {
        this.serviceOrders.serviceOrders.set([]);
        this.isLoading.set(false);
        return;
      }
      void this.load(tenantId, generation);
    });
  }

  async refresh(): Promise<void> {
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    if (!tenantId || !this.canManage()) return;
    await this.load(tenantId, ++this.generation);
  }

  statusLabel(status: ServiceOrder['status']): string {
    const labels: Partial<Record<ServiceOrder['status'], string>> = {
      draft: 'Rascunho', open: 'Aberta', parts_pending: 'Aguardando peças', in_progress: 'Em execução',
      ready: 'Pronta', delivered: 'Entregue', triagem: 'Triagem', execucao: 'Em execução', finalizado: 'Finalizada'
    };
    return labels[status] || status;
  }

  nextStatus(order: ServiceOrder): ServiceOrder['status'] | null {
    const next: Partial<Record<ServiceOrder['status'], ServiceOrder['status']>> = {
      open: 'in_progress', in_progress: 'ready', ready: 'delivered', triagem: 'execucao', execucao: 'finalizado'
    };
    return next[order.status] || null;
  }

  async createOrder(): Promise<void> {
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    const customerName = this.draftCustomer().trim();
    const description = this.draftDescription().trim();
    if (!tenantId || !this.canManage() || !customerName || !description) return;
    this.isSaving.set(true);
    this.actionError.set(null);
    try {
      await this.serviceOrders.addServiceOrder({ tenantId, customerName, description, equipment: this.draftEquipment().trim() || undefined });
      this.draftCustomer.set('');
      this.draftEquipment.set('');
      this.draftDescription.set('');
    } catch {
      this.actionError.set('Não foi possível abrir a ordem de serviço.');
    } finally {
      this.isSaving.set(false);
    }
  }

  async advance(order: ServiceOrder): Promise<void> {
    const status = this.nextStatus(order);
    if (!status) return;
    this.busyOrderId.set(order.id);
    this.actionError.set(null);
    try {
      await this.serviceOrders.updateStatus(order.id, status);
    } catch {
      this.actionError.set('Não foi possível avançar o status da ordem. Atualize a lista e tente novamente.');
    } finally {
      this.busyOrderId.set(null);
    }
  }

  private async load(tenantId: string, generation: number): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set(null);
    try {
      await this.serviceOrders.fetchServiceOrders(tenantId);
    } catch {
      if (generation === this.generation) this.loadError.set('Não foi possível carregar as ordens desta unidade.');
    } finally {
      if (generation === this.generation) this.isLoading.set(false);
    }
  }
}
