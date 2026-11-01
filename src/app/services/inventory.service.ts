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
  private latestFetchId = 0;

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
      return this.products();
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
    if (isSimulation === this.lastModeIsSimulation) return;

    this.lastModeIsSimulation = isSimulation;
    this.latestFetchId += 1;
    this.products.set(isSimulation ? this.getSimulationProducts() : []);
  }

  private getSimulationProducts(): ProductItem[] {
    const tenantId = this.security.currentSession()?.tenantId || 'tenant-sp-001';
    return MOCK_PRODUCTS.map(product => ({ ...product, tenantId }));
  }

  async createProduct(product: Partial<ProductItem>): Promise<ProductItem> {
    if (this.isSimulation()) {
      const simProd: ProductItem = {
        ...product,
        id: product.id || `sim-prod-${Date.now()}`,
        stock: product.stock || 100,
        price: product.price || 0
      } as ProductItem;
      this.products.update(cur => [...cur, simProd]);
      return simProd;
    }

    const data = await firstValueFrom(this.http.post<ProductItem>('/api/products', product));
    this.products.update(cur => [...cur, data]);
    return data;
  }

  async updateProduct(id: string, updates: Partial<ProductItem>): Promise<ProductItem> {
    if (this.isSimulation()) {
      let updated: ProductItem | null = null;
      this.products.update(cur => cur.map(p => {
        if (p.id === id) {
          updated = { ...p, ...updates };
          return updated;
        }
        return p;
      }));
      if (!updated) throw new Error('Simulated product not found');
      return updated;
    }

    const data = await firstValueFrom(this.http.patch<ProductItem>(`/api/products/${id}`, updates));
    this.products.update(cur => cur.map(p => p.id === id ? data : p));
    return data;
  }

  async fetchPromotions(): Promise<Promotion[]> {
    // Logic for promotions
    return [];
  }

  async fetchSuppliers(): Promise<Supplier[]> {
    // Logic for suppliers
    return [];
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
