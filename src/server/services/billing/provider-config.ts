import type { BillingProvider, BillingProviderAvailability } from './types';

const PROVIDER_ENV: Record<BillingProvider, { api: string; webhook: string }> = {
  stripe: { api: 'STRIPE_SECRET_KEY', webhook: 'STRIPE_BILLING_WEBHOOK_SECRET' },
  mercadopago: { api: 'MERCADOPAGO_ACCESS_TOKEN', webhook: 'MERCADOPAGO_WEBHOOK_SECRET' }
};

export function getBillingProviderAvailability(provider: BillingProvider): BillingProviderAvailability {
  const env = PROVIDER_ENV[provider];
  const missing = [env.api, env.webhook].filter((key) => !process.env[key]?.trim());
  return { provider, configured: missing.length === 0, missing };
}

export function getConfiguredBillingProviders(): BillingProviderAvailability[] {
  return (Object.keys(PROVIDER_ENV) as BillingProvider[]).map(getBillingProviderAvailability);
}

export function getBillingApiCredential(provider: BillingProvider): string {
  const name = PROVIDER_ENV[provider].api;
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name}_NOT_CONFIGURED`);
  return value;
}

export function getBillingWebhookSecret(provider: BillingProvider): string {
  const name = PROVIDER_ENV[provider].webhook;
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name}_NOT_CONFIGURED`);
  return value;
}

export function getPublicAppUrl(): string {
  const value = process.env['APP_URL']?.trim() || 'http://localhost:3000';
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('APP_URL_INVALID');
  }
  if (process.env['NODE_ENV'] === 'production' && url.protocol !== 'https:') {
    throw new Error('APP_URL_REQUIRES_HTTPS');
  }
  return url.toString().replace(/\/$/, '');
}
