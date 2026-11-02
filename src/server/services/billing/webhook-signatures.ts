import { createHmac, timingSafeEqual } from 'node:crypto';

function constantTimeHexEqual(expected: string, received: string): boolean {
  if (!/^[a-f0-9]+$/i.test(received) || received.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
}

export function verifyStripeWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000)
): boolean {
  if (!signatureHeader) return false;
  const fields = signatureHeader.split(',').map((part) => part.trim().split('=', 2));
  const timestamp = fields.find(([key]) => key === 't')?.[1];
  const signatures = fields.filter(([key]) => key === 'v1').map(([, value]) => value || '');
  const parsedTimestamp = Number(timestamp);
  if (!Number.isInteger(parsedTimestamp) || Math.abs(nowSeconds - parsedTimestamp) > 300) return false;

  const expected = createHmac('sha256', secret)
    .update(`${parsedTimestamp}.`)
    .update(rawBody)
    .digest('hex');
  return signatures.some((signature) => constantTimeHexEqual(expected, signature));
}

export function verifyMercadoPagoWebhookSignature(
  signatureHeader: string | undefined,
  requestId: string | undefined,
  dataId: string | undefined,
  secret: string
): boolean {
  if (!signatureHeader || !requestId || !dataId) return false;
  const parts = new Map(
    signatureHeader.split(',').map((part) => {
      const [key, value] = part.trim().split('=', 2);
      return [key, value] as const;
    })
  );
  const timestamp = parts.get('ts');
  const signature = parts.get('v1');
  if (!timestamp || !signature) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${timestamp};`;
  const expected = createHmac('sha256', secret).update(manifest).digest('hex');
  return constantTimeHexEqual(expected, signature);
}
