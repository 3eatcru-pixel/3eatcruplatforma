import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ProductItem, Promotion, Supplier } from '../models/ecosystem.model';
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
  
  readonly products = signal<ProductItem[]>(MOCK_PRODUCTS);
  readonly promotions = signal<Promotion[]>([]);
  readonly suppliers = signal<Supplier[]>([]);

  async fetchProducts(tenantId?: string): Promise<ProductItem[]> {
    const url = tenantId ? `/api/products?tenantId=${tenantId}` : '/api/products';
    const data = await firstValueFrom(this.http.get<ProductItem[]>(url));
    this.products.set(data);
    return data;
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

  async fetchPublicCatalog(tenantId: string): Promise<ProductItem[]> {
    const data = await firstValueFrom(this.http.get<ProductItem[]>(`/api/products/public?tenantId=${tenantId}`));
    this.products.set(data);
    return data;
  }
}
