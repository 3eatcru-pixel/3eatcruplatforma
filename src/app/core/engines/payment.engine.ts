import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { OrderTransaction, SystemExecutionMode } from '../../models/ecosystem.model';
import { SecurityService } from '../../services/security.service';

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
  status: 'approved' | 'pending_pix' | 'declined';
  gateway: string;
  qrCodePix?: string;
  pixCopyPaste?: string;
  authorizationCode: string;
  processedAt: string;
  feeDeducted: number;
  netAmount: number;
  environment?: 'sandbox' | 'live';
  mode: SystemExecutionMode;
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
  private readonly security = inject(SecurityService);

  async processPayment(req: PaymentTransactionRequest): Promise<PaymentTransactionResult> {
    this.assertRealExecutionMode();
    return firstValueFrom(this.http.post<PaymentTransactionResult>('/api/payments/process', req));
  }

  async confirmPixPayment(transactionId: string): Promise<PaymentConfirmResult> {
    this.assertRealExecutionMode();
    return firstValueFrom(
      this.http.post<PaymentConfirmResult>(`/api/payments/${transactionId}/confirm`, {})
    );
  }

  private assertRealExecutionMode(): void {
    if (this.security.isSimulated()) {
      throw new Error('Pagamentos e confirmações PIX estão indisponíveis em modo de simulação.');
    }
  }
}
