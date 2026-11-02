import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyMercadoPagoWebhookSignature, verifyStripeWebhookSignature } from './webhook-signatures';

describe('billing webhook signatures', () => {
  it('accepts only a fresh Stripe signature for the exact raw payload', () => {
    const secret = 'whsec_test_secret';
    const now = 1_800_000_000;
    const body = Buffer.from('{"id":"evt_123","type":"invoice.paid"}');
    const digest = createHmac('sha256', secret).update(`${now}.`).update(body).digest('hex');
    const header = `t=${now},v1=${digest}`;

    expect(verifyStripeWebhookSignature(body, header, secret, now)).toBe(true);
    expect(verifyStripeWebhookSignature(Buffer.from('{"id":"evt_other"}'), header, secret, now)).toBe(false);
    expect(verifyStripeWebhookSignature(body, header, secret, now + 301)).toBe(false);
    expect(verifyStripeWebhookSignature(body, 't=bad,v1=not-a-signature', secret, now)).toBe(false);
  });

  it('validates the Mercado Pago manifest and rejects changed request data', () => {
    const secret = 'mp_test_secret';
    const requestId = 'req-123';
    const dataId = 'payment-456';
    const timestamp = '1800000000';
    const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
    const digest = createHmac('sha256', secret).update(manifest).digest('hex');
    const header = `ts=${timestamp},v1=${digest}`;

    expect(verifyMercadoPagoWebhookSignature(header, requestId, dataId, secret)).toBe(true);
    expect(verifyMercadoPagoWebhookSignature(header, 'different-request', dataId, secret)).toBe(false);
    expect(verifyMercadoPagoWebhookSignature(header, requestId, 'different-payment', secret)).toBe(false);
    expect(verifyMercadoPagoWebhookSignature(undefined, requestId, dataId, secret)).toBe(false);
  });
});
