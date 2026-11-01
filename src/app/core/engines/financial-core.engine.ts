import { Injectable } from '@angular/core';
import { FinancialRecord, OrderTransaction } from '../../models/ecosystem.model';

export interface FinancialSaleProjection {
  grossTotal: number;
  ledgerRecord: FinancialRecord;
}

@Injectable({
  providedIn: 'root'
})
export class FinancialCoreEngine {

  /** Builds a local preview of the tenant sale record; the server persists the authoritative entry. */
  projectStoreSaleRecord(order: OrderTransaction): FinancialSaleProjection {
    const grossTotal = order.total;
    const isSimulated = Boolean(order.isSimulated || order.mode === 'simulation');

    const ledgerRecord: FinancialRecord = {
      id: `fin-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: 'sale',
      category: `Venda ${order.channel}`,
      amount: grossTotal,
      description: `Venda ${order.channel} #${order.orderNumber} (${order.paymentMethod.toUpperCase()})`,
      date: new Date().toISOString().split('T')[0]!,
      paymentMethod: order.paymentMethod,
      tenantId: order.tenantId,
      channel: order.channel,
      ...(order.deviceId ? { deviceId: order.deviceId } : {}),
      referenceId: order.id,
      status: 'cleared',
      isSimulated,
      mode: isSimulated ? 'simulation' : 'real'
    };

    return {
      grossTotal,
      ledgerRecord
    };
  }
}
