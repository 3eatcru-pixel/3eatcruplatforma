import { createHash, randomUUID } from 'node:crypto';
import { adminDb } from '../../firebase-admin';
import { DEFAULT_SAAS_PLANS } from '../../../shared/constants/saas-plans';
import type { CompanyTenant, LicensePlan } from '../../../shared/models/ecosystem.model';
import { normalizePlanCatalogEntry } from '../../utils/plan-catalog';
import { resolvePlatformDeliveryCommissionStatus } from '../../utils/platform-delivery-readiness';
import {
  cancelProviderSubscription,
  createBillingCheckout,
  fetchMercadoPagoAuthorizedPayment,
  fetchMercadoPagoResource
} from './payment-providers';
import { getBillingProviderAvailability, getConfiguredBillingProviders } from './provider-config';
import type {
  BillingProvider,
  HqBillingDashboard,
  PlatformBillingInvoiceRecord,
  PlatformSubscriptionRecord,
  PlatformSubscriptionStatus
} from './types';

export class BillingServiceError extends Error {
  constructor(readonly code: string, message: string, readonly status = 400) {
    super(message);
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function safeSubscription(value: Record<string, unknown>): PlatformSubscriptionRecord {
  const rawStatus = value['status'];
  const validStatuses: PlatformSubscriptionStatus[] = [
    'checkout_creating', 'pending_payment', 'active', 'past_due', 'paused', 'cancelled', 'failed'
  ];
  return {
    tenantId: String(value['tenantId'] || ''),
    tenantName: String(value['tenantName'] || ''),
    contactEmail: String(value['contactEmail'] || ''),
    planId: String(value['planId'] || ''),
    planName: String(value['planName'] || ''),
    amountMonthly: Number(value['amountMonthly'] || 0),
    currency: 'BRL',
    provider: value['provider'] === 'stripe' ? 'stripe' : 'mercadopago',
    status: validStatuses.includes(rawStatus as PlatformSubscriptionStatus)
      ? rawStatus as PlatformSubscriptionStatus
      : 'failed',
    providerStatus: nonEmptyString(value['providerStatus']),
    providerSubscriptionId: nonEmptyString(value['providerSubscriptionId']),
    providerCheckoutId: nonEmptyString(value['providerCheckoutId']),
    checkoutUrl: nonEmptyString(value['checkoutUrl']),
    firstPaidAt: nonEmptyString(value['firstPaidAt']),
    cancelledAt: nonEmptyString(value['cancelledAt']),
    createdAt: String(value['createdAt'] || ''),
    updatedAt: String(value['updatedAt'] || '')
  };
}

function safeInvoice(value: Record<string, unknown>): PlatformBillingInvoiceRecord {
  return {
    id: String(value['id'] || ''),
    tenantId: String(value['tenantId'] || ''),
    provider: value['provider'] === 'stripe' ? 'stripe' : 'mercadopago',
    providerInvoiceId: String(value['providerInvoiceId'] || ''),
    providerPaymentId: nonEmptyString(value['providerPaymentId']),
    amount: Number(value['amount'] || 0),
    currency: String(value['currency'] || 'BRL').toUpperCase(),
    status: value['status'] === 'paid' || value['status'] === 'failed' || value['status'] === 'refunded'
      ? value['status']
      : 'pending',
    description: String(value['description'] || 'Assinatura do Store OS'),
    paidAt: nonEmptyString(value['paidAt']),
    createdAt: String(value['createdAt'] || ''),
    updatedAt: String(value['updatedAt'] || '')
  };
}

function providerDocumentId(provider: BillingProvider, externalId: string): string {
  const digest = createHash('sha256').update(`${provider}:${externalId}`).digest('hex');
  return `${provider}_${digest}`;
}

export async function getHqBillingDashboard(): Promise<HqBillingDashboard> {
  const [subscriptionsSnapshot, invoicesSnapshot, settingsSnapshot] = await Promise.all([
    adminDb.collection('platform_subscriptions').orderBy('updatedAt', 'desc').limit(200).get(),
    adminDb.collection('platform_billing_invoices').orderBy('createdAt', 'desc').limit(100).get(),
    adminDb.collection('hq_settings').doc('global').get()
  ]);
  const savedRate = settingsSnapshot.data()?.['platformCommissionRate'];
  const percent = typeof savedRate === 'number' && Number.isFinite(savedRate) ? savedRate * 100 : 8;
  return {
    providers: getConfiguredBillingProviders(),
    subscriptions: subscriptionsSnapshot.docs.map((doc) => safeSubscription(doc.data())),
    invoices: invoicesSnapshot.docs.map((doc) => safeInvoice(doc.data())),
    deliveryCommission: {
      status: resolvePlatformDeliveryCommissionStatus(settingsSnapshot.data()?.['platformDeliveryCommissionStatus']),
      percent,
      note: 'Aplica somente a entregas elegíveis feitas pela rede da plataforma; motoristas da loja não geram comissão.'
    }
  };
}

async function readPlan(planId: string): Promise<LicensePlan> {
  const basePlan = DEFAULT_SAAS_PLANS.find((item) => item.id === planId);
  if (!basePlan) throw new BillingServiceError('PLAN_NOT_FOUND', 'O plano selecionado não existe.', 404);
  const planSnapshot = await adminDb.collection('plans').doc(planId).get();
  return normalizePlanCatalogEntry(basePlan, planSnapshot.exists ? planSnapshot.data() : undefined);
}

export async function createSubscriptionCheckout(tenantId: string, provider: BillingProvider): Promise<{ reused: boolean; subscription: PlatformSubscriptionRecord }> {
  const tenantSnapshot = await adminDb.collection('tenants').doc(tenantId).get();
  if (!tenantSnapshot.exists) throw new BillingServiceError('TENANT_NOT_FOUND', 'Loja não encontrada.', 404);
  const tenant = tenantSnapshot.data() as CompanyTenant | undefined;
  if (!tenant || typeof tenant.plan !== 'string') throw new BillingServiceError('TENANT_PLAN_INVALID', 'A loja não possui um plano válido.', 409);
  const plan = await readPlan(tenant.plan);
  if (plan.priceMonthly <= 0) {
    throw new BillingServiceError('BILLING_PLAN_REQUIRES_POSITIVE_PRICE', 'O plano está gratuito; não é necessário criar uma cobrança recorrente.', 409);
  }
  if (Math.abs(plan.priceMonthly * 100 - Math.round(plan.priceMonthly * 100)) > 0.000001) {
    throw new BillingServiceError('PLAN_PRICE_PRECISION_INVALID', 'A mensalidade precisa ter no máximo duas casas decimais.', 409);
  }
  const providerAvailability = getBillingProviderAvailability(provider);
  if (!providerAvailability.configured) {
    throw new BillingServiceError('BILLING_PROVIDER_NOT_CONFIGURED', `Configure no servidor: ${providerAvailability.missing.join(', ')}.`, 409);
  }
  const email = typeof tenant.contactEmail === 'string' ? tenant.contactEmail.trim() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new BillingServiceError('TENANT_BILLING_EMAIL_REQUIRED', 'Cadastre um e-mail de cobrança válido no cadastro da loja.', 409);
  }

  const ref = adminDb.collection('platform_subscriptions').doc(tenantId);
  const now = new Date().toISOString();
  const reservation = await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const previous = snapshot.exists ? snapshot.data() as Record<string, unknown> : undefined;
    const previousStatus = previous?.['status'];
    const sameSelection = previous?.['provider'] === provider && previous?.['planId'] === plan.id;
    if (previousStatus === 'active' || previousStatus === 'past_due' || previousStatus === 'paused') {
      throw new BillingServiceError('SUBSCRIPTION_ALREADY_EXISTS', 'Cancele ou regularize a assinatura atual antes de gerar outra cobrança.', 409);
    }
    if (previousStatus === 'pending_payment') {
      if (sameSelection && nonEmptyString(previous?.['checkoutUrl'])) {
        return { reused: true as const, attemptId: String(previous?.['checkoutAttemptId'] || ''), record: safeSubscription(previous!) };
      }
      throw new BillingServiceError('CHECKOUT_ALREADY_PENDING', 'Já existe uma cobrança pendente para esta loja; resolva ou cancele esse link antes de trocar plano ou provedor.', 409);
    }
    if (previousStatus === 'pending_payment' || previousStatus === 'checkout_creating') {
      if (!sameSelection) {
        throw new BillingServiceError('CHECKOUT_ALREADY_PENDING', 'Já existe uma cobrança pendente para esta loja; resolva ou cancele esse link antes de trocar plano ou provedor.', 409);
      }
    }

    const attemptId = (previousStatus === 'failed' || previousStatus === 'checkout_creating') && sameSelection
      ? nonEmptyString(previous?.['checkoutAttemptId']) || randomUUID()
      : randomUUID();
    const createdAt = typeof previous?.['createdAt'] === 'string' && previousStatus !== 'cancelled'
      ? previous['createdAt']
      : now;
    const draft: PlatformSubscriptionRecord & { checkoutAttemptId: string } = {
      tenantId,
      tenantName: String(tenant.name || tenant.legalName || tenantId),
      contactEmail: email,
      planId: plan.id,
      planName: plan.name,
      amountMonthly: plan.priceMonthly,
      currency: 'BRL',
      provider,
      status: 'checkout_creating',
      providerStatus: 'checkout_creating',
      checkoutAttemptId: attemptId,
      createdAt,
      updatedAt: now
    };
    transaction.set(ref, draft);
    return { reused: false as const, attemptId, record: safeSubscription(draft as unknown as Record<string, unknown>) };
  });

  if (reservation.reused) return { reused: true, subscription: reservation.record };

  try {
    const checkout = await createBillingCheckout({
      provider,
      tenantId,
      tenantName: reservation.record.tenantName,
      contactEmail: email,
      planId: plan.id,
      planName: plan.name,
      amountMonthly: plan.priceMonthly,
      idempotencyKey: reservation.attemptId
    });
    const updatedAt = new Date().toISOString();
    await ref.set({
      status: 'pending_payment',
      providerStatus: checkout.providerStatus,
      providerSubscriptionId: checkout.subscriptionId,
      providerCheckoutId: checkout.checkoutId,
      checkoutUrl: checkout.checkoutUrl,
      updatedAt
    }, { merge: true });
    const updated = await ref.get();
    return { reused: false, subscription: safeSubscription(updated.data() || {}) };
  } catch (error) {
    await ref.set({ status: 'failed', providerStatus: 'checkout_failed', updatedAt: new Date().toISOString() }, { merge: true });
    if (error instanceof BillingServiceError) throw error;
    if (error instanceof Error && error.message.startsWith('BILLING_')) {
      throw new BillingServiceError(error.message.split(':')[0], error.message.includes('NOT_CONFIGURED')
        ? 'O provedor não está configurado com credenciais e segredo de webhook no servidor.'
        : error.message.includes('POSITIVE_PRICE')
          ? 'O plano está gratuito; não é necessário criar uma cobrança recorrente.'
          : 'Não foi possível criar o checkout no provedor.', 409);
    }
    throw new BillingServiceError('BILLING_PROVIDER_UNAVAILABLE', 'Não foi possível conectar ao provedor de pagamentos.', 502);
  }
}

export async function cancelTenantSubscription(tenantId: string): Promise<PlatformSubscriptionRecord> {
  const ref = adminDb.collection('platform_subscriptions').doc(tenantId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new BillingServiceError('SUBSCRIPTION_NOT_FOUND', 'A loja ainda não possui uma assinatura de plataforma.', 404);
  const record = safeSubscription(snapshot.data() || {});
  if (record.status === 'cancelled') return record;
  if (record.status === 'failed') {
    await ref.set({ status: 'cancelled', providerStatus: 'cancelled', cancelledAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, { merge: true });
  } else {
    let providerStatus: string;
    try {
      providerStatus = await cancelProviderSubscription(record);
    } catch {
      throw new BillingServiceError('PROVIDER_CANCELLATION_FAILED', 'O provedor não confirmou o cancelamento. A assinatura permanece sem alteração.', 502);
    }
    await ref.set({ status: 'cancelled', providerStatus, cancelledAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, { merge: true });
  }
  const updated = await ref.get();
  return safeSubscription(updated.data() || {});
}

async function findTenantByProviderSubscription(provider: BillingProvider, providerSubscriptionId: string): Promise<string | undefined> {
  const result = await adminDb.collection('platform_subscriptions')
    .where('providerSubscriptionId', '==', providerSubscriptionId)
    .limit(1)
    .get();
  const record = result.docs[0]?.data();
  return record?.['provider'] === provider ? record['tenantId'] as string | undefined : undefined;
}

async function applyProviderEvent(input: {
  provider: BillingProvider;
  eventKey: string;
  tenantId: string;
  subscriptionPatch?: Partial<PlatformSubscriptionRecord>;
  invoice?: Omit<PlatformBillingInvoiceRecord, 'id' | 'createdAt' | 'updatedAt'>;
}): Promise<void> {
  const markerId = providerDocumentId(input.provider, input.eventKey);
  const markerRef = adminDb.collection('billing_webhook_events').doc(markerId);
  const subscriptionRef = adminDb.collection('platform_subscriptions').doc(input.tenantId);
  const invoiceId = input.invoice
    ? providerDocumentId(input.provider, input.invoice.providerInvoiceId)
    : undefined;
  const invoiceRef = invoiceId ? adminDb.collection('platform_billing_invoices').doc(invoiceId) : undefined;
  const now = new Date().toISOString();

  await adminDb.runTransaction(async (transaction) => {
    const marker = await transaction.get(markerRef);
    if (marker.exists) return;
    const current = await transaction.get(subscriptionRef);
    const oldInvoice = invoiceRef ? await transaction.get(invoiceRef) : undefined;
    if (!current.exists) {
      transaction.create(markerRef, { provider: input.provider, tenantId: input.tenantId, processedAt: now, ignored: true });
      return;
    }
    const currentStatus = current.data()?.['status'];
    const patch = { ...(input.subscriptionPatch || {}) };
    if (currentStatus === 'cancelled' && (patch.status === 'active' || patch.status === 'past_due')) {
      delete patch.status;
    }
    transaction.create(markerRef, { provider: input.provider, tenantId: input.tenantId, processedAt: now });
    transaction.set(subscriptionRef, { ...patch, updatedAt: now }, { merge: true });
    if (input.invoice && invoiceRef) {
      const invoice: PlatformBillingInvoiceRecord = {
        ...input.invoice,
        id: invoiceId!,
        createdAt: oldInvoice?.exists ? String(oldInvoice.data()?.['createdAt'] || now) : now,
        updatedAt: now
      };
      transaction.set(invoiceRef, invoice);
    }
  });
}

function metadataTenantId(value: Record<string, unknown>): string | undefined {
  const metadata = asRecord(value['metadata']);
  const direct = nonEmptyString(metadata['tenantId']) || nonEmptyString(value['client_reference_id']);
  if (direct) return direct;
  const subscriptionDetails = asRecord(value['subscription_details']);
  const subscriptionMetadata = asRecord(subscriptionDetails['metadata']);
  if (nonEmptyString(subscriptionMetadata['tenantId'])) return nonEmptyString(subscriptionMetadata['tenantId']);
  const parent = asRecord(value['parent']);
  const parentDetails = asRecord(parent['subscription_details']);
  return nonEmptyString(asRecord(parentDetails['metadata'])['tenantId']);
}

function stripeSubscriptionId(value: Record<string, unknown>): string | undefined {
  const direct = value['subscription'];
  if (typeof direct === 'string') return direct;
  const parent = asRecord(value['parent']);
  const details = asRecord(parent['subscription_details']);
  return typeof details['subscription'] === 'string' ? details['subscription'] : undefined;
}

function stripeStatus(providerStatus: unknown): PlatformSubscriptionStatus | undefined {
  switch (providerStatus) {
    case 'active': return 'active';
    case 'past_due':
    case 'unpaid': return 'past_due';
    case 'paused': return 'paused';
    case 'canceled': return 'cancelled';
    case 'incomplete':
    case 'incomplete_expired': return 'pending_payment';
    default: return undefined;
  }
}

async function resolveStripeTenantId(value: Record<string, unknown>, providerSubscriptionId?: string): Promise<string | undefined> {
  const direct = metadataTenantId(value);
  if (direct) return direct;
  return providerSubscriptionId
    ? findTenantByProviderSubscription('stripe', providerSubscriptionId)
    : undefined;
}

export async function processStripeBillingEvent(event: Record<string, unknown>): Promise<void> {
  const eventId = nonEmptyString(event['id']);
  const eventType = nonEmptyString(event['type']);
  const data = asRecord(event['data']);
  const object = asRecord(data['object']);
  if (!eventId || !eventType) return;

  const subscriptionId = eventType.startsWith('invoice.')
    ? stripeSubscriptionId(object)
    : nonEmptyString(object['id']) && eventType.startsWith('customer.subscription.')
      ? nonEmptyString(object['id'])
      : nonEmptyString(object['subscription']);
  const tenantId = await resolveStripeTenantId(object, subscriptionId);
  if (!tenantId) return;
  const providerStatus = nonEmptyString(object['status']);
  const subscriptionPatch: Partial<PlatformSubscriptionRecord> = {};
  if (subscriptionId) subscriptionPatch.providerSubscriptionId = subscriptionId;
  if (providerStatus) {
    subscriptionPatch.providerStatus = providerStatus;
    const mapped = stripeStatus(providerStatus);
    if (mapped) subscriptionPatch.status = mapped;
  }

  if (eventType === 'checkout.session.completed') {
    subscriptionPatch.providerCheckoutId = nonEmptyString(object['id']);
    subscriptionPatch.status = 'pending_payment';
    subscriptionPatch.providerStatus = nonEmptyString(object['payment_status']) || 'checkout_completed';
  }
  if (eventType === 'checkout.session.expired') {
    subscriptionPatch.status = 'failed';
    subscriptionPatch.providerStatus = 'checkout_expired';
  }

  let invoice: Omit<PlatformBillingInvoiceRecord, 'id' | 'createdAt' | 'updatedAt'> | undefined;
  if (eventType === 'invoice.paid' || eventType === 'invoice.payment_succeeded' || eventType === 'invoice.payment_failed') {
    const invoiceExternalId = nonEmptyString(object['id']);
    const amountRaw = eventType === 'invoice.payment_failed' ? object['amount_due'] : object['amount_paid'];
    const amount = typeof amountRaw === 'number' ? amountRaw / 100 : 0;
    if (invoiceExternalId) {
      const paid = eventType !== 'invoice.payment_failed';
      const paidTimestamp = typeof object['status_transitions'] === 'object'
        ? asRecord(object['status_transitions'])['paid_at']
        : undefined;
      invoice = {
        tenantId,
        provider: 'stripe',
        providerInvoiceId: invoiceExternalId,
        amount,
        currency: String(object['currency'] || 'brl').toUpperCase(),
        status: paid ? 'paid' : 'failed',
        description: 'Assinatura mensal do Store OS',
        paidAt: paid && typeof paidTimestamp === 'number' ? new Date(paidTimestamp * 1000).toISOString() : paid ? new Date().toISOString() : undefined
      };
      if (paid) {
        subscriptionPatch.status = 'active';
        subscriptionPatch.firstPaidAt = subscriptionPatch.firstPaidAt || invoice.paidAt;
      } else {
        subscriptionPatch.status = 'past_due';
      }
    }
  }

  if (!Object.keys(subscriptionPatch).length && !invoice) return;
  await applyProviderEvent({ provider: 'stripe', eventKey: eventId, tenantId, subscriptionPatch, invoice });
}

function mercadoPagoSubscriptionStatus(providerStatus: unknown, firstPaidAt?: string): PlatformSubscriptionStatus | undefined {
  switch (providerStatus) {
    case 'authorized': return firstPaidAt ? 'active' : 'pending_payment';
    case 'pending': return 'pending_payment';
    case 'paused': return 'paused';
    case 'cancelled':
    case 'canceled': return 'cancelled';
    default: return undefined;
  }
}

export async function processMercadoPagoBillingNotification(input: {
  type: string;
  dataId: string;
  eventKey: string;
}): Promise<void> {
  if (input.type === 'subscription_preapproval') {
    const resource = await fetchMercadoPagoResource(`/preapproval/${encodeURIComponent(input.dataId)}`);
    const tenantId = nonEmptyString(resource['external_reference']);
    if (!tenantId) return;
    const subscriptionSnapshot = await adminDb.collection('platform_subscriptions').doc(tenantId).get();
    if (!subscriptionSnapshot.exists) return;
    const firstPaidAt = nonEmptyString(subscriptionSnapshot.data()?.['firstPaidAt']);
    const providerStatus = nonEmptyString(resource['status']);
    const status = mercadoPagoSubscriptionStatus(providerStatus, firstPaidAt);
    await applyProviderEvent({
      provider: 'mercadopago',
      eventKey: input.eventKey,
      tenantId,
      subscriptionPatch: {
        providerSubscriptionId: String(resource['id'] || input.dataId),
        providerStatus,
        ...(status ? { status } : {})
      }
    });
    return;
  }

  if (input.type !== 'payment' && input.type !== 'subscription_authorized_payment') return;
  const isAuthorizedSubscriptionPayment = input.type === 'subscription_authorized_payment';
  const resource = isAuthorizedSubscriptionPayment
    ? await fetchMercadoPagoAuthorizedPayment(input.dataId)
    : await fetchMercadoPagoResource(`/v1/payments/${encodeURIComponent(input.dataId)}`);
  const providerSubscriptionId = nonEmptyString(resource['preapproval_id']);
  if (!providerSubscriptionId) return;
  const tenantId = await findTenantByProviderSubscription('mercadopago', providerSubscriptionId);
  if (!tenantId) return;
  const payment = asRecord(resource['payment']);
  const providerStatus = (isAuthorizedSubscriptionPayment
    ? nonEmptyString(payment['status']) || nonEmptyString(resource['summarized'])
    : nonEmptyString(resource['status'])) || 'unknown';
  const amountValue = resource['transaction_amount'];
  const parsedAmount = typeof amountValue === 'number'
    ? amountValue
    : typeof amountValue === 'string' && amountValue.trim()
      ? Number(amountValue)
      : 0;
  const amount = Number.isFinite(parsedAmount) ? parsedAmount : 0;
  const providerPaymentId = isAuthorizedSubscriptionPayment
    ? (typeof payment['id'] === 'string' || typeof payment['id'] === 'number' ? String(payment['id']) : undefined)
    : String(resource['id'] || input.dataId);
  const status: PlatformBillingInvoiceRecord['status'] = providerStatus === 'approved'
    ? 'paid'
    : providerStatus === 'refunded' || providerStatus === 'charged_back'
      ? 'refunded'
      : ['rejected', 'cancelled'].includes(providerStatus)
        ? 'failed'
        : 'pending';
  const paidAt = nonEmptyString(payment['date_approved']) || nonEmptyString(resource['date_approved']);
  const invoiceId = String(resource['id'] || input.dataId);
  await applyProviderEvent({
    provider: 'mercadopago',
    eventKey: input.eventKey,
    tenantId,
    subscriptionPatch: status === 'paid'
      ? { status: 'active', providerStatus: 'authorized', firstPaidAt: paidAt || new Date().toISOString() }
      : status === 'failed' || status === 'refunded'
        ? { status: 'past_due', providerStatus }
        : {},
    invoice: {
      tenantId,
      provider: 'mercadopago',
      providerInvoiceId: invoiceId,
      ...(providerPaymentId ? { providerPaymentId } : {}),
      amount,
      currency: String(resource['currency_id'] || 'BRL'),
      status,
      description: 'Assinatura mensal do Store OS',
      paidAt: status === 'paid' ? paidAt || new Date().toISOString() : undefined
    }
  });
}
