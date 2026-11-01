import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { OrderTransaction, SystemExecutionMode } from '../../models/ecosystem.model';

export type PaymentGatewayType = 'pix' | 'credit_card' | 'debit_card' | 'cash' | 'voucher';

export interface PaymentTransactionRequest {
  orderId: string;
  amount: number;
  method: PaymentGatewayType;
  customerName?: string;
  installments?: number;
  tenantId: string;
}

export interface PaymentTransactionResult {
  transactionId: string;
  status: 'approved' | 'pending_pix' | 'declined' | 'platform_escrow_hold';
  gateway: string;
  qrCodePix?: string;
  pixCopyPaste?: string;
  authorizationCode: string;
  processedAt: string;
  feeDeducted: number;
  netAmount: number;
  environment?: 'sandbox' | 'live';
  mode: SystemExecutionMode;
  platformEscrowNote?: string;
}

export interface PaymentConfirmResult {
  transactionId: string;
  status: 'approved';
  environment: 'sandbox' | 'live';
  mode: SystemExecutionMode;
  confirmedAt: string;
  order?: OrderTransaction;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentEngine {
  private readonly http = inject(HttpClient);

  async processPayment(req: PaymentTransactionRequest): Promise<PaymentTransactionResult> {
    return firstValueFrom(this.http.post<PaymentTransactionResult>('/api/payments/process', req));
  }

  async confirmPixPayment(transactionId: string): Promise<PaymentConfirmResult> {
    return firstValueFrom(
      this.http.post<PaymentConfirmResult>(`/api/payments/${transactionId}/confirm`, {})
    );
  }
}
