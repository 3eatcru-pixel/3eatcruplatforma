import type { BillingProvider, PlatformSubscriptionRecord } from './types';
import { getBillingApiCredential, getBillingProviderAvailability, getPublicAppUrl } from './provider-config';

export interface BillingCheckoutInput {
  provider: BillingProvider;
  tenantId: string;
  tenantName: string;
  contactEmail: string;
  planId: string;
  planName: string;
  amountMonthly: number;
  idempotencyKey: string;
}

export interface BillingCheckoutResult {
  checkoutId: string;
  subscriptionId?: string;
  checkoutUrl: string;
  providerStatus: string;
}

interface ProviderResponse {
  id?: string | number;
  url?: string;
  init_point?: string;
  subscription_id?: string | number;
  subscription?: string | number | null;
  status?: string;
  message?: string;
  error?: string;
}

async function readProviderResponse(response: Response): Promise<ProviderResponse> {
  const body = await response.json().catch(() => ({})) as ProviderResponse;
  if (!response.ok) {
    throw new Error(`BILLING_PROVIDER_ERROR_${response.status}:${body.message || body.error || 'request failed'}`);
  }
  return body;
}

function buildStripeForm(input: BillingCheckoutInput, appUrl: string): URLSearchParams {
  const form = new URLSearchParams();
  form.set('mode', 'subscription');
  form.set('success_url', `${appUrl}/home?billing=processing`);
  form.set('cancel_url', `${appUrl}/home?billing=cancelled`);
  form.set('customer_email', input.contactEmail);
  form.set('client_reference_id', input.tenantId);
  form.set('locale', 'pt-BR');
  form.set('line_items[0][quantity]', '1');
  form.set('line_items[0][price_data][currency]', 'brl');
  form.set('line_items[0][price_data][unit_amount]', String(Math.round(input.amountMonthly * 100)));
  form.set('line_items[0][price_data][product_data][name]', `3EATCRU Store OS · ${input.planName}`);
  form.set('line_items[0][price_data][product_data][description]', `Assinatura mensal da loja ${input.tenantName}; acesso completo ao Store OS e cota do plano ${input.planName}.`);
  form.set('line_items[0][price_data][recurring][interval]', 'month');
  form.set('subscription_data[metadata][tenantId]', input.tenantId);
  form.set('subscription_data[metadata][planId]', input.planId);
  form.set('subscription_data[metadata][billingType]', 'saas_subscription');
  form.set('metadata[tenantId]', input.tenantId);
  form.set('metadata[planId]', input.planId);
  form.set('metadata[billingType]', 'saas_subscription');
  return form;
}

export async function createBillingCheckout(input: BillingCheckoutInput): Promise<BillingCheckoutResult> {
  if (!getBillingProviderAvailability(input.provider).configured) {
    throw new Error('BILLING_PROVIDER_NOT_CONFIGURED');
  }
  if (!Number.isFinite(input.amountMonthly) || input.amountMonthly <= 0) {
    throw new Error('BILLING_PLAN_REQUIRES_POSITIVE_PRICE');
  }
  const appUrl = getPublicAppUrl();
  const credential = getBillingApiCredential(input.provider);

  if (input.provider === 'stripe') {
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credential}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': `saas-${input.idempotencyKey}`
      },
      body: buildStripeForm(input, appUrl),
      signal: AbortSignal.timeout(15_000)
    });
    const result = await readProviderResponse(response);
    const checkoutUrl = result.url;
    const checkoutId = result.id === undefined ? '' : String(result.id);
    const subscriptionValue = result.subscription ?? result.subscription_id;
    const subscriptionId = subscriptionValue === undefined || subscriptionValue === null ? undefined : String(subscriptionValue);
    if (!checkoutUrl || !checkoutId) throw new Error('BILLING_PROVIDER_INVALID_RESPONSE');
    return { checkoutId, subscriptionId, checkoutUrl, providerStatus: result.status || 'open' };
  }

  const response = await fetch('https://api.mercadopago.com/preapproval', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${credential}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': `saas-${input.idempotencyKey}`
    },
    body: JSON.stringify({
      reason: `3EATCRU Store OS · Plano ${input.planName}`,
      external_reference: input.tenantId,
      payer_email: input.contactEmail,
      back_url: `${appUrl}/home?billing=processing`,
      notification_url: `${appUrl}/api/billing/webhooks/mercadopago`,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: input.amountMonthly,
        currency_id: 'BRL'
      }
    }),
    signal: AbortSignal.timeout(15_000)
  });
  const result = await readProviderResponse(response);
  const checkoutUrl = result.init_point;
  const checkoutId = result.id === undefined ? '' : String(result.id);
  if (!checkoutUrl || !checkoutId) throw new Error('BILLING_PROVIDER_INVALID_RESPONSE');
  return { checkoutId, subscriptionId: checkoutId, checkoutUrl, providerStatus: result.status || 'pending' };
}

export async function cancelProviderSubscription(subscription: PlatformSubscriptionRecord): Promise<string> {
  const credential = getBillingApiCredential(subscription.provider);

  if (subscription.provider === 'stripe') {
    if (!subscription.providerSubscriptionId && subscription.providerCheckoutId) {
      const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(subscription.providerCheckoutId)}/expire`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${credential}` },
        signal: AbortSignal.timeout(15_000)
      });
      const result = await readProviderResponse(response);
      return result.status || 'expired';
    }
    const externalId = subscription.providerSubscriptionId;
    if (!externalId) throw new Error('BILLING_PROVIDER_SUBSCRIPTION_NOT_FOUND');
    const response = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(externalId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${credential}` },
      signal: AbortSignal.timeout(15_000)
    });
    const result = await readProviderResponse(response);
    return result.status || 'canceled';
  }

  const externalId = subscription.providerSubscriptionId;
  if (!externalId) throw new Error('BILLING_PROVIDER_SUBSCRIPTION_NOT_FOUND');
  const response = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(externalId)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${credential}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'canceled' }),
    signal: AbortSignal.timeout(15_000)
  });
  const result = await readProviderResponse(response);
  return result.status || 'cancelled';
}

export async function fetchMercadoPagoResource(path: string): Promise<Record<string, unknown>> {
  const credential = getBillingApiCredential('mercadopago');
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    headers: { Authorization: `Bearer ${credential}` },
    signal: AbortSignal.timeout(15_000)
  });
  return await readProviderResponse(response) as Record<string, unknown>;
}

export async function fetchMercadoPagoAuthorizedPayment(id: string): Promise<Record<string, unknown>> {
  return fetchMercadoPagoResource(`/authorized_payments/${encodeURIComponent(id)}`);
}
