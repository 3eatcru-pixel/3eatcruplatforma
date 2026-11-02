export type BillingProvider = 'stripe' | 'mercadopago';

export type PlatformSubscriptionStatus =
  | 'checkout_creating'
  | 'pending_payment'
  | 'active'
  | 'past_due'
  | 'paused'
  | 'cancelled'
  | 'failed';

export interface BillingProviderAvailability {
  provider: BillingProvider;
  configured: boolean;
  missing: string[];
}

export interface PlatformSubscriptionRecord {
  tenantId: string;
  tenantName: string;
  contactEmail: string;
  planId: string;
  planName: string;
  amountMonthly: number;
  currency: 'BRL';
  provider: BillingProvider;
  status: PlatformSubscriptionStatus;
  providerStatus?: string;
  providerSubscriptionId?: string;
  providerCheckoutId?: string;
  checkoutUrl?: string;
  firstPaidAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformBillingInvoiceRecord {
  id: string;
  tenantId: string;
  provider: BillingProvider;
  providerInvoiceId: string;
  providerPaymentId?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  description: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HqBillingDashboard {
  providers: BillingProviderAvailability[];
  subscriptions: PlatformSubscriptionRecord[];
  invoices: PlatformBillingInvoiceRecord[];
  deliveryCommission: {
    status: 'coming_soon' | 'active';
    percent: number;
    note: string;
  };
}
