import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DeliveryRoute, DeliveryWaypoint, OrderTransaction, StoreDriver } from '../../models/ecosystem.model';
import { EcosystemService } from '../../services/ecosystem.service';
import { LogisticsService } from '../../services/logistics.service';
import { OrdersService } from '../../services/orders.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-drivers',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#140b06] text-stone-200 font-mono overflow-hidden p-4 space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3 bg-[#1c0d06] p-3 rounded-2xl border border-[#381c0c] shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center"><mat-icon class="text-xl">alt_route</mat-icon></div>
          <div>
            <h2 class="text-sm font-serif font-black text-white">Entregas da loja</h2>
            <p class="text-[10px] text-stone-400">A loja cadastra os próprios motoristas e combina diretamente a remuneração.</p>
          </div>
        </div>
        <button type="button" (click)="refresh()" [disabled]="isLoading() || !canManageLogistics()" aria-label="Atualizar logística" class="px-2.5 py-2 border border-[#593017] text-stone-300 rounded-xl disabled:opacity-50"><mat-icon class="!text-sm !h-4 !w-4">refresh</mat-icon></button>
      </div>

      @if (!canManageLogistics()) {
        <div class="flex-1 flex items-center justify-center p-8 text-center text-amber-300">A gestão de entregas está restrita ao proprietário ou operador da unidade.</div>
      } @else if (isLoading()) {
        <div class="flex-1 flex items-center justify-center text-stone-400">Carregando entregadores e rotas…</div>
      } @else if (loadError()) {
        <div class="flex-1 flex flex-col items-center justify-center gap-2 text-center text-rose-300"><p>{{ loadError() }}</p><button type="button" (click)="refresh()" class="font-bold underline">Tentar novamente</button></div>
      } @else {
        <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-4">
          <section class="bg-[#180b04] border border-[#381c0c] rounded-2xl p-4 space-y-3">
            <div class="flex items-center justify-between"><h3 class="text-xs font-bold text-white uppercase">Frota própria da unidade</h3><span class="text-[10px] text-stone-500">{{ drivers().length }} cadastrados</span></div>
            <form (ngSubmit)="createDriver()" class="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <label class="text-[10px] text-stone-400">Nome
                <input name="driverName" required maxlength="100" [(ngModel)]="newDriver.name" class="mt-1 w-full rounded-lg bg-[#100803] border border-[#593017] px-2 py-2 text-white" />
              </label>
              <label class="text-[10px] text-stone-400">Telefone
                <input name="driverPhone" maxlength="32" [(ngModel)]="newDriver.phone" class="mt-1 w-full rounded-lg bg-[#100803] border border-[#593017] px-2 py-2 text-white" />
              </label>
              <label class="text-[10px] text-stone-400">Veículo
                <select name="driverVehicle" [(ngModel)]="newDriver.vehicleType" class="mt-1 w-full rounded-lg bg-[#100803] border border-[#593017] px-2 py-2 text-white"><option value="moto">Moto</option><option value="bike">Bicicleta</option><option value="carro">Carro</option></select>
              </label>
              <div class="flex items-end"><button type="submit" [disabled]="isSaving()" class="w-full rounded-lg bg-emerald-700 px-3 py-2 text-xs font-black text-white disabled:opacity-50">Cadastrar entregador</button></div>
            </form>
            @if (formError()) { <p class="text-xs text-rose-300">{{ formError() }}</p> }
            @if (drivers().length === 0) { <p class="text-xs text-stone-500">Nenhum entregador registrado nesta unidade.</p> }
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
              @for (driver of drivers(); track driver.id) {
                <article class="bg-[#200e05] border border-[#381c0c] p-3 rounded-xl flex flex-wrap items-center justify-between gap-2">
                  <div><strong class="text-white text-xs">{{ driver.name }}</strong><p class="text-[10px] text-stone-400">{{ vehicleLabel(driver.vehicleType) }} · {{ driver.phone || 'Sem telefone' }}</p></div>
                  <span [class]="driver.status === 'available' ? 'text-emerald-300' : 'text-amber-300'" class="text-[10px] font-bold uppercase">{{ driver.status === 'available' ? 'Disponível' : driver.status === 'delivering' ? 'Em rota' : 'Offline' }}</span>
                </article>
              }
            </div>
          </section>

          <section class="bg-[#180b04] border border-[#381c0c] rounded-2xl p-4 space-y-3">
            <div><h3 class="text-xs font-bold text-white uppercase">Criar rota manual</h3><p class="text-[10px] text-stone-500">Seleciona pedidos prontos de entrega. O valor fica como combinado operacional e não registra pagamento.</p></div>
            @if (routableOrders().length === 0) {
              <p class="text-xs text-stone-500">Não há pedidos de entrega prontos e sem rota ativa entre os registros recentes.</p>
            } @else {
              <div class="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                @for (order of routableOrders(); track order.id) {
                  <label class="flex items-start gap-2 bg-[#200e05] border border-[#381c0c] rounded-lg p-2 text-xs">
                    <input type="checkbox" [checked]="selectedOrderIds().includes(order.id)" (change)="toggleOrder(order.id, $event)" />
                    <span class="flex-1"><strong class="text-white">#{{ order.orderNumber || order.id.slice(-6) }}</strong> · {{ order.customerName || 'Cliente' }}<small class="block text-stone-500">{{ order.address || 'Endereço não informado' }} · R$ {{ order.total.toFixed(2) }}</small></span>
                  </label>
                }
              </div>
            }
            <div class="flex flex-wrap items-end gap-2">
              <label class="text-[10px] text-stone-400">Valor combinado com o motorista (R$)
                <input name="driverCompensation" type="number" min="0" step="0.01" [(ngModel)]="storeDriverCompensation" class="mt-1 w-56 rounded-lg bg-[#100803] border border-[#593017] px-2 py-2 text-white" />
              </label>
              <button type="button" (click)="createRoute()" [disabled]="isSaving() || selectedOrderIds().length === 0" class="rounded-lg bg-amber-600 px-4 py-2 text-xs font-black text-stone-950 disabled:opacity-50">Criar rota</button>
            </div>
          </section>

          <section class="bg-[#180b04] border border-[#381c0c] rounded-2xl p-4 space-y-3">
            <div class="flex items-center justify-between"><h3 class="text-xs font-bold text-white uppercase">Rotas da unidade</h3><span class="text-[10px] text-stone-500">{{ routes().length }} recentes</span></div>
            @if (routes().length === 0) { <p class="text-xs text-stone-500">Nenhuma rota cadastrada.</p> }
            @for (route of routes(); track route.id) {
              <article class="bg-[#200e05] border border-[#381c0c] p-3 rounded-xl space-y-2">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div><strong class="text-white text-xs">{{ route.routeCode }}</strong><p class="text-[10px] text-stone-400">{{ route.waypoints.length }} paradas · {{ route.date | date:'dd/MM/yyyy HH:mm' }}</p></div>
                  <div class="text-right"><span class="block text-[10px] uppercase text-amber-300">{{ routeStatusLabel(route.status) }}</span><span class="text-[10px] text-stone-400">R$ {{ route.totalEarnings.toFixed(2) }} combinado</span></div>
                </div>
                <p class="text-[10px] text-stone-500">Entregador: {{ route.driverName || 'Ainda não atribuído' }} · {{ routeStops(route) }}</p>
                @if (route.status === 'available' && drivers().length > 0) {
                  <div class="flex flex-wrap items-end gap-2 border-t border-[#381c0c] pt-2">
                    <label class="text-[10px] text-stone-400">Atribuir para
                      <select [ngModel]="selectedDrivers()[route.id] || ''" (ngModelChange)="selectDriver(route.id, $event)" [name]="'driver-' + route.id" class="mt-1 min-w-48 rounded-lg bg-[#100803] border border-[#593017] px-2 py-2 text-white">
                        <option value="">Selecione um entregador</option>
                        @for (driver of availableDrivers(); track driver.id) { <option [value]="driver.id">{{ driver.name }}</option> }
                      </select>
                    </label>
                    <button type="button" (click)="assignRoute(route)" [disabled]="!selectedDrivers()[route.id] || isSaving()" class="rounded-lg bg-emerald-700 px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50">Atribuir rota</button>
                  </div>
                }
              </article>
            }
          </section>
        </div>
      }
    </div>
  `
})
export class EAppDriversWindow {
  private readonly logisticsService = inject(LogisticsService);
  private readonly ordersService = inject(OrdersService);
  readonly ecosystem = inject(EcosystemService);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly selectedOrderIds = signal<string[]>([]);
  readonly selectedDrivers = signal<Record<string, string>>({});
  storeDriverCompensation = 0;
  readonly newDriver = { name: '', phone: '', vehicleType: 'moto' as StoreDriver['vehicleType'] };
  private fetchGeneration = 0;

  readonly canManageLogistics = computed(() => {
    const role = this.ecosystem.currentSession()?.role;
    return role === 'tenant_owner' || role === 'operator';
  });
  readonly drivers = computed(() => {
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    if (!tenantId) return [];
    return this.logisticsService.drivers().filter((driver) => driver.tenantId === tenantId && driver.driverType === 'private');
  });
  readonly availableDrivers = computed(() => this.drivers().filter((driver) => driver.status === 'available'));
  readonly routes = computed(() => {
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    if (!tenantId) return [];
    return this.logisticsService.deliveryRoutes()
      .filter((route) => route.tenantId === tenantId)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 100);
  });
  readonly routableOrders = computed(() => {
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    if (!tenantId) return [];
    const linkedOrderIds = new Set(this.routes()
      .filter((route) => route.status !== 'completed')
      .flatMap((route) => route.waypoints.map((waypoint) => waypoint.orderId).filter((id): id is string => Boolean(id))));
    return this.ordersService.orders().filter((order) =>
      order.tenantId === tenantId && order.type === 'delivery' && order.status === 'ready' &&
      !order.driverId && !linkedOrderIds.has(order.id)
    );
  });

  constructor() {
    effect(() => {
      const tenantId = this.ecosystem.resolveOperationalTenantId();
      const allowed = this.canManageLogistics();
      const generation = ++this.fetchGeneration;
      if (!allowed || !tenantId) {
        this.isLoading.set(false);
        this.loadError.set(tenantId ? null : 'Selecione uma unidade para consultar as entregas.');
        return;
      }
      void this.load(tenantId, generation);
    });
  }

  async refresh() {
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    if (!tenantId || !this.canManageLogistics()) return;
    await this.load(tenantId, ++this.fetchGeneration);
  }

  toggleOrder(orderId: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedOrderIds.update((ids) => checked
      ? [...new Set([...ids, orderId])]
      : ids.filter((id) => id !== orderId)
    );
  }

  selectDriver(routeId: string, driverId: string) {
    this.selectedDrivers.update((selection) => ({ ...selection, [routeId]: driverId }));
  }

  vehicleLabel(vehicle: StoreDriver['vehicleType']) {
    return vehicle === 'moto' ? 'Moto' : vehicle === 'bike' ? 'Bicicleta' : 'Carro';
  }

  routeStatusLabel(status: DeliveryRoute['status']) {
    const labels: Record<DeliveryRoute['status'], string> = {
      available: 'Disponível', accepted: 'Atribuída', at_store: 'Na loja',
      in_progress: 'Em andamento', completed: 'Concluída'
    };
    return labels[status];
  }

  routeStops(route: DeliveryRoute) {
    return route.waypoints.map((waypoint) => waypoint.customerName).join(', ');
  }

  async createDriver() {
    if (this.isSaving() || !this.canManageLogistics()) return;
    const name = this.newDriver.name.trim();
    if (name.length < 2) {
      this.formError.set('Informe o nome do entregador.');
      return;
    }
    this.isSaving.set(true);
    this.formError.set(null);
    try {
      await this.logisticsService.createDriver({
        name,
        phone: this.newDriver.phone.trim(),
        vehicleType: this.newDriver.vehicleType,
        driverType: 'private'
      });
      this.newDriver.name = '';
      this.newDriver.phone = '';
      await this.refreshData();
      this.ecosystem.notify('Entregador cadastrado para esta unidade.', this.ecosystem.isSimulationMode() ? 'info' : 'success');
    } catch {
      this.formError.set('Não foi possível cadastrar o entregador.');
    } finally {
      this.isSaving.set(false);
    }
  }

  async createRoute() {
    if (this.isSaving() || !this.canManageLogistics()) return;
    const selectedIds = new Set(this.selectedOrderIds());
    const orders = this.routableOrders().filter((order) => selectedIds.has(order.id));
    const compensation = Number(this.storeDriverCompensation);
    if (orders.length === 0 || !Number.isFinite(compensation) || compensation < 0) {
      this.formError.set('Selecione ao menos um pedido e informe um valor válido.');
      return;
    }
    this.isSaving.set(true);
    this.formError.set(null);
    try {
      const waypoints: DeliveryWaypoint[] = orders.map((order, index) => this.toWaypoint(order, index));
      await this.logisticsService.createDeliveryRoute(waypoints, compensation);
      this.selectedOrderIds.set([]);
      await this.refreshData();
      this.ecosystem.notify('Rota criada. O valor é apenas o combinado da loja com o motorista.', this.ecosystem.isSimulationMode() ? 'info' : 'success');
    } catch {
      this.formError.set('Não foi possível criar a rota. Verifique se os pedidos continuam prontos e sem outra rota.');
    } finally {
      this.isSaving.set(false);
    }
  }

  async assignRoute(route: DeliveryRoute) {
    const driverId = this.selectedDrivers()[route.id];
    if (!driverId || route.status !== 'available' || this.isSaving()) return;
    this.isSaving.set(true);
    this.formError.set(null);
    try {
      await this.logisticsService.acceptDeliveryRoute(route.id, driverId);
      await this.refreshData();
      this.ecosystem.notify('Rota atribuída ao entregador.', this.ecosystem.isSimulationMode() ? 'info' : 'success');
    } catch {
      this.formError.set('A atribuição falhou. Verifique a unidade, o status da rota e o vínculo do entregador.');
    } finally {
      this.isSaving.set(false);
    }
  }

  private toWaypoint(order: OrderTransaction, index: number): DeliveryWaypoint {
    return {
      id: `wp-${order.id}`,
      orderId: order.id,
      customerName: order.customerName || 'Cliente',
      customerPhone: order.customerPhone || '',
      address: order.address || '',
      cityState: '',
      distanceKm: 0,
      etaMinutes: 0,
      productSummary: order.items.map((item) => `${item.quantity}× ${item.product.name}`).join(', ').slice(0, 500),
      status: 'pending',
      sequenceNumber: index + 1
    };
  }

  private async load(tenantId: string, generation: number) {
    this.isLoading.set(true);
    this.loadError.set(null);
    try {
      await Promise.all([
        this.logisticsService.fetchDrivers(),
        this.logisticsService.fetchDeliveryRoutes(tenantId),
        this.ordersService.fetchOrders(tenantId, 200)
      ]);
    } catch {
      if (generation === this.fetchGeneration) this.loadError.set('Não foi possível carregar os dados logísticos desta unidade.');
    } finally {
      if (generation === this.fetchGeneration) this.isLoading.set(false);
    }
  }

  private async refreshData() {
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    if (!tenantId) return;
    await Promise.all([
      this.logisticsService.fetchDrivers(),
      this.logisticsService.fetchDeliveryRoutes(tenantId),
      this.ordersService.fetchOrders(tenantId, 200)
    ]);
  }
}
