import { Injectable, signal, inject, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ProductItem, PublicCatalogProduct, Promotion, Supplier } from '../models/ecosystem.model';
import { MOCK_PRODUCTS } from '../models/mock-data';
import { firstValueFrom } from 'rxjs';
import { SecurityService } from './security.service';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private readonly http = inject(HttpClient);
  private readonly security = inject(SecurityService);

  readonly isSimulation = computed(() => this.security.isSimulated());
  private lastModeIsSimulation = this.security.isSimulated();
  private lastTenantId = this.security.currentSession()?.tenantId;
  private latestFetchId = 0;
  private modeGeneration = 0;

  readonly products = signal<ProductItem[]>(
    this.lastModeIsSimulation ? this.getSimulationProducts() : []
  );
  readonly publicCatalog = signal<PublicCatalogProduct[]>([]);
  readonly promotions = signal<Promotion[]>([]);
  readonly suppliers = signal<Supplier[]>([]);
  private publicCatalogRequestId = 0;

  constructor() {
    effect(() => {
      this.syncExecutionMode();
    });
  }

  async fetchProducts(tenantId?: string): Promise<ProductItem[]> {
    this.syncExecutionMode();
    if (this.lastModeIsSimulation) {
      if (this.products().length === 0) this.products.set(this.getSimulationProducts());
      const activeTenantId = tenantId || this.security.currentSession()?.tenantId;
      return this.products().filter((product) => !activeTenantId || product.tenantId === activeTenantId);
    }

    const fetchId = ++this.latestFetchId;
    const url = tenantId ? `/api/products?tenantId=${tenantId}` : '/api/products';
    const data = await firstValueFrom(this.http.get<ProductItem[]>(url));
    this.syncExecutionMode();
    if (fetchId !== this.latestFetchId || this.lastModeIsSimulation) return this.products();

    this.products.set(data);
    return data;
  }

  private syncExecutionMode() {
    const isSimulation = this.isSimulation();
    const tenantId = this.security.currentSession()?.tenantId;
    if (isSimulation === this.lastModeIsSimulation && tenantId === this.lastTenantId) return;

    this.lastModeIsSimulation = isSimulation;
    this.lastTenantId = tenantId;
    this.modeGeneration += 1;
    this.latestFetchId += 1;
    this.products.set(isSimulation ? this.getSimulationProducts() : []);
  }

  private getSimulationProducts(): ProductItem[] {
    const tenantId = this.security.currentSession()?.tenantId || 'tenant-sp-001';
    return MOCK_PRODUCTS.map((product) => ({
      ...product,
      tenantId,
      isSimulated: true,
      mode: 'simulation'
    }));
  }

  async createProduct(product: Partial<ProductItem>): Promise<ProductItem> {
    this.syncExecutionMode();
    if (this.lastModeIsSimulation) {
      const simProd: ProductItem = {
        ...product,
        tenantId: this.security.currentSession()?.tenantId || product.tenantId,
        id: product.id || `sim-prod-${Date.now()}`,
        stock: product.stock ?? 100,
        price: product.price ?? 0,
        isSimulated: true,
        mode: 'simulation'
      } as ProductItem;
      this.products.update((current) => [
        ...current.filter((item) => item.id !== simProd.id),
        simProd
      ]);
      return simProd;
    }

    const generation = this.modeGeneration;
    const data = await firstValueFrom(this.http.post<ProductItem>('/api/products', product));
    this.assertRealMode(generation);
    this.products.update(cur => [...cur, data]);
    return data;
  }

  async updateProduct(id: string, updates: Partial<ProductItem>): Promise<ProductItem> {
    this.syncExecutionMode();
    if (this.lastModeIsSimulation) {
      const activeTenantId = this.security.currentSession()?.tenantId;
      let updated: ProductItem | null = null;
      this.products.update(cur => cur.map(p => {
        if (p.id === id && (!activeTenantId || p.tenantId === activeTenantId)) {
          updated = {
            ...p,
            ...updates,
            id: p.id,
            tenantId: p.tenantId,
            isSimulated: true,
            mode: 'simulation'
          };
          return updated;
        }
        return p;
      }));
      if (!updated) throw new Error('Simulated product not found');
      return updated;
    }

    const generation = this.modeGeneration;
    const data = await firstValueFrom(this.http.patch<ProductItem>(`/api/products/${id}`, updates));
    this.assertRealMode(generation);
    this.products.update(cur => cur.map(p => p.id === id ? data : p));
    return data;
  }

  private assertRealMode(generation: number) {
    this.syncExecutionMode();
    if (generation !== this.modeGeneration || this.lastModeIsSimulation) {
      throw new Error('Execution mode changed while saving product.');
    }
  }

  async fetchPromotions(): Promise<Promotion[]> {
    // Logic for promotions
    return [];
  }

  async fetchSuppliers(): Promise<Supplier[]> {
    const tenantId = this.security.currentSession()?.tenantId;
    if (!tenantId || this.lastModeIsSimulation) {
      this.suppliers.set([]);
      return [];
    }
    const data = await firstValueFrom(
      this.http.get<Supplier[]>(`/api/suppliers?tenantId=${encodeURIComponent(tenantId)}`)
    );
    this.suppliers.set(data);
    return data;
  }

  async fetchPublicCatalog(tenantId: string): Promise<PublicCatalogProduct[]> {
    const requestId = ++this.publicCatalogRequestId;
    this.publicCatalog.set([]);
    const data = await firstValueFrom(
      this.http.get<PublicCatalogProduct[]>(`/api/products/public?tenantId=${tenantId}`)
    );
    if (requestId !== this.publicCatalogRequestId) return this.publicCatalog();

    const scopedData = data.filter(product => product.tenantId === tenantId);
    this.publicCatalog.set(scopedData);
    return scopedData;
  }
}
