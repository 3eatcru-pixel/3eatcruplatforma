import { Injectable, inject } from '@angular/core';
import { CompanyTenant, OrderTransaction, ProductItem } from '../../models/ecosystem.model';
import { FinancialCoreEngine } from './financial-core.engine';

@Injectable({
  providedIn: 'root'
})
export class OrderWorkflowCoreEngine {
  private readonly financialEngine = inject(FinancialCoreEngine);

  /**
   * Pure UI projection helper for canonical order pipeline preview:
   * pending -> preparing -> ready -> dispatched -> delivered / completed
   *
   * Authoritative stock deduction, rollback, and financial ledger writes are executed
   * atomically by `/src/server/core/commerce.engine.ts` in Firestore Transactions.
   */
  advanceOrderStatus(
    order: OrderTransaction,
    newStatus: OrderTransaction['status'],
    tenant: CompanyTenant,
    products: ProductItem[]
  ) {
    const updatedOrder: OrderTransaction = {
      ...order,
      status: newStatus
    };

    const financialSplitResult =
      newStatus === 'completed' || newStatus === 'delivered'
        ? this.financialEngine.processOrderFinancialSplit(updatedOrder, tenant)
        : null;

    return {
      order: updatedOrder,
      updatedProducts: products,
      financialSplitResult
    };
  }
}
