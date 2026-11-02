import { createHash } from 'node:crypto';
import { Request, Response, Router } from 'express';
import { adminDb } from '../firebase-admin';
import { requireHqAdmin } from '../middleware/auth.middleware';
import {
  BillingServiceError,
  cancelTenantSubscription,
  createSubscriptionCheckout,
  getHqBillingDashboard,
  processMercadoPagoBillingNotification,
  processStripeBillingEvent
} from '../services/billing/billing.service';
import { getBillingWebhookSecret } from '../services/billing/provider-config';
import type { BillingProvider } from '../services/billing/types';
import { verifyMercadoPagoWebhookSignature, verifyStripeWebhookSignature } from '../services/billing/webhook-signatures';

export const billingRouter = Router();

function getParamId(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value || '';
}

function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

async function writeBillingAudit(req: Request, action: string, details: string): Promise<void> {
  try {
    const id = adminDb.collection('audit_logs').doc().id;
    await adminDb.collection('audit_logs').doc(id).set({
      id,
      timestamp: new Date().toISOString(),
      user: req.user?.email || 'HQ ADMIN',
      action,
      module: 'HQ',
      details,
      severity: 'info'
    });
  } catch {
    // Payment-provider state remains authoritative if the optional audit write fails.
  }
}

billingRouter.get('/hq', requireHqAdmin, async (_req: Request, res: Response) => {
  try {
    res.json(await getHqBillingDashboard());
  } catch {
    res.status(500).json({ error: 'Não foi possível carregar as cobranças da plataforma.', code: 'BILLING_DASHBOARD_UNAVAILABLE' });
  }
});

billingRouter.post('/hq/subscriptions/:tenantId/checkout', requireHqAdmin, async (req: Request, res: Response) => {
  const tenantId = getParamId(req, 'tenantId');
  const provider = req.body?.provider;
  if (provider !== 'stripe' && provider !== 'mercadopago') {
    res.status(400).json({ error: 'Selecione Mercado Pago ou Stripe.', code: 'INVALID_BILLING_PROVIDER' });
    return;
  }

  try {
    const result = await createSubscriptionCheckout(tenantId, provider as BillingProvider);
    if (!result.reused) {
      await writeBillingAudit(req, 'Checkout de assinatura criado', `Checkout ${provider} gerado para o tenant ${tenantId}, plano ${result.subscription.planId}.`);
    }
    res.status(result.reused ? 200 : 201).json(result);
  } catch (error) {
    if (error instanceof BillingServiceError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: 'Não foi possível criar a cobrança da assinatura.', code: 'BILLING_CHECKOUT_FAILED' });
  }
});

billingRouter.post('/hq/subscriptions/:tenantId/cancel', requireHqAdmin, async (req: Request, res: Response) => {
  const tenantId = getParamId(req, 'tenantId');
  try {
    const subscription = await cancelTenantSubscription(tenantId);
    await writeBillingAudit(req, 'Assinatura de plataforma cancelada', `Assinatura do tenant ${tenantId} cancelada no provedor ${subscription.provider}.`);
    res.json({ subscription });
  } catch (error) {
    if (error instanceof BillingServiceError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: 'Não foi possível cancelar a assinatura.', code: 'BILLING_CANCELLATION_FAILED' });
  }
});

billingRouter.post('/webhooks/stripe', async (req: Request, res: Response) => {
  let secret: string;
  try {
    secret = getBillingWebhookSecret('stripe');
  } catch {
    res.status(503).json({ error: 'Webhook Stripe não configurado.' });
    return;
  }
  const rawBody = (req as Request & { stripeRawBody?: Buffer }).stripeRawBody;
  if (!rawBody || !verifyStripeWebhookSignature(rawBody, req.header('stripe-signature'), secret)) {
    res.status(400).json({ error: 'Assinatura de webhook inválida.' });
    return;
  }
  try {
    await processStripeBillingEvent(getRecord(req.body));
    res.sendStatus(200);
  } catch {
    res.status(500).json({ error: 'Não foi possível processar o evento Stripe.' });
  }
});

billingRouter.post('/webhooks/mercadopago', async (req: Request, res: Response) => {
  let secret: string;
  try {
    secret = getBillingWebhookSecret('mercadopago');
  } catch {
    res.status(503).json({ error: 'Webhook Mercado Pago não configurado.' });
    return;
  }
  const body = getRecord(req.body);
  const data = getRecord(body['data']);
  const queryDataId = req.query['data.id'];
  const dataId = (typeof queryDataId === 'string' ? queryDataId : undefined)
    || (typeof data['id'] === 'string' || typeof data['id'] === 'number' ? String(data['id']) : undefined);
  const signature = req.header('x-signature');
  const requestId = req.header('x-request-id');
  if (!verifyMercadoPagoWebhookSignature(signature, requestId, dataId, secret)) {
    res.status(400).json({ error: 'Assinatura de webhook inválida.' });
    return;
  }

  const type = (typeof body['type'] === 'string' ? body['type'] : undefined)
    || (typeof req.query['type'] === 'string' ? req.query['type'] : '');
  const action = typeof body['action'] === 'string' ? body['action'] : 'updated';
  const eventTime = typeof body['date_created'] === 'string' ? body['date_created'] : '';
  const eventId = typeof body['id'] === 'string' || typeof body['id'] === 'number' ? String(body['id']) : '';
  if (!dataId || !type) {
    res.status(400).json({ error: 'Notificação Mercado Pago incompleta.' });
    return;
  }
  const eventKey = createHash('sha256')
    .update(`mp:${type}:${eventId}:${dataId}:${action}:${eventTime}`)
    .digest('hex');
  try {
    await processMercadoPagoBillingNotification({ type, dataId, eventKey });
    res.sendStatus(200);
  } catch {
    res.status(500).json({ error: 'Não foi possível processar o evento Mercado Pago.' });
  }
});
