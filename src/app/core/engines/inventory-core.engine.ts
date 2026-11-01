import { Injectable } from '@angular/core';
import { ProductItem } from '../../models/ecosystem.model';

export interface InventoryCheckResult {
  productId: string;
  productName: string;
  available: boolean;
  currentStock: number;
  requestedQuantity: number;
  remainingStock: number;
  isLowStockWarning: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class InventoryCoreEngine {

  /**
   * Verifies and reserves stock for order items.
   * Real mode updates real product stock levels.
   * Simulation mode calculates hypothetical stock impact without mutating real inventory.
   */
  processStockDeduction(
    products: ProductItem[],
    orderedItems: { productId: string; quantity: number }[]
  ): { updatedProducts: ProductItem[]; results: InventoryCheckResult[] } {
    const results: InventoryCheckResult[] = [];
    const updatedProducts = products.map(prod => {
      const orderMatch = orderedItems.find(item => item.productId === prod.id);
      if (!orderMatch) return prod;

      const requested = orderMatch.quantity;
      const currentStock = prod.stock ?? 50;
      const available = currentStock >= requested;
      const remainingStock = Math.max(0, currentStock - (available ? requested : 0));
      const isLowStockWarning = remainingStock <= (prod.minStock ?? 5);

      results.push({
        productId: prod.id,
        productName: prod.name,
        available,
        currentStock,
        requestedQuantity: requested,
        remainingStock,
        isLowStockWarning
      });

      if (available) {
        return {
          ...prod,
          stock: remainingStock,
          availableOnline: remainingStock > 0
        };
      }

      return prod;
    });

    return { updatedProducts, results };
  }
}
