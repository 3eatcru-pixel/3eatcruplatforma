import { Router, Request, Response } from 'express';
import { OrderTransaction } from '../../shared/models/ecosystem.model';
import { isTenantStaffRole, requireAuth } from '../middleware/auth.middleware';
import { adminDb } from '../firebase-admin';
import { Query, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import {
  CommercialEngineError,
  executeCommercialOrder,
  normalizeCommercialChannel,
  transitionCommercialOrderStatus
} from '../core/commerce.engine';
import { publicOrderRateLimiter } from '../middleware/rate-limiter.middleware';

export const ordersRouter = Router();

function getParam(req: Request, key: string): string {
  const p = req.params[key];
  return Array.isArray(p) ? p[0] || '' : p || '';
}

function sendCommerceError(res: Response, error: unknown, fallbackMessage: string): void {
  const err = error as Partial<CommercialEngineError>;
  if (err && typeof err.status === 'number') {
    res.status(err.status).json({
      error: err.message || fallbackMessage,
      code: err.code || 'COMMERCE_ERROR',
      ...(err.details ? { details: err.details } : {})
    });
    return;
  }
  res.status(500).json({ error: fallbackMessage, code: 'INTERNAL_ERROR' });
}

function extractIdempotencyKey(req: Request, body: Record<string, unknown>): string | undefined {
  const headerKey = req.headers['x-idempotency-key'];
  const resolved =
    (typeof headerKey === 'string' && headerKey.trim()) ||
    (typeof body['idempotencyKey'] === 'string' && body['idempotencyKey'].trim()) ||
    (typeof body['externalOrderId'] === 'string' && body['externalOrderId'].trim()
      ? `ext-${body['externalOrderId'].trim()}`
      : undefined) ||
    (typeof body['id'] === 'string' && body['id'].startsWith('off-') ? body['id'] : undefined);
  return resolved || undefined;
}

ordersRouter.get('/', async (req: Request, res: Response) => {
  const requestedTenantId = req.query['tenantId'] as string | undefined;

  try {
    let query: Query = adminDb.collection('orders');

    if (req.user?.role === 'hq_admin') {
      if (requestedTenantId) {
        query = query.where('tenantId', '==', requestedTenantId);
      }
    } else if (isTenantStaffRole(req.user?.role)) {
      const staffTenantId = req.user?.tenantId;
      if (!staffTenantId) {
        res.status(403).json({
          error: 'Colaborador sem estabelecimento vinculado.',
          code: 'NO_TENANT_BOUND'
        });
        return;
      }
      if (requestedTenantId && requestedTenantId !== staffTenantId) {
        res.status(403).json({
          error: 'Acesso negado: tentativa de consultar pedidos de outro estabelecimento.',
          code: 'TENANT_MISMATCH'
        });
        return;
      }
      query = query.where('tenantId', '==', staffTenantId);
    } else if (req.user?.role === 'driver') {
      if (!req.user.id) {
        res.status(401).json({ error: 'Identidade do entregador inválida.', code: 'UNAUTHORIZED' });
        return;
      }
      // P1.4: Strict filter — driver ONLY sees orders already assigned to their UID
      query = query.where('driverId', '==', req.user.id);
    } else if (req.user?.id) {
      query = query.where('customerId', '==', req.user.id);
    } else {
      res.status(401).json({ error: 'Autenticação necessária para consultar pedidos.', code: 'UNAUTHORIZED' });
      return;
    }

    const limitQuery = Number(req.query['limit'] || 50);
    const pageLimit = Number.isFinite(limitQuery) && limitQuery > 0 ? Math.min(limitQuery, 200) : 50;

    const snap = await query.orderBy('createdAt', 'desc').limit(pageLimit).get();
    res.json(snap.docs.map((doc: QueryDocumentSnapshot) => doc.data()));
  } catch {
    res.status(500).json({ error: 'Failed to list orders.' });
  }
});

ordersRouter.get('/:id', async (req: Request, res: Response) => {
  const id = getParam(req, 'id');
  try {
    const doc = await adminDb.collection('orders').doc(id).get();
    if (!doc.exists) {
      res.status(404).json({ error: 'Pedido não encontrado.' });
      return;
    }

    const order = doc.data() as OrderTransaction;

    // P1.4: Driver can NEVER read unassigned orders (`!order.driverId`)
    const isDriverAuthorized =
      req.user?.role === 'driver' &&
      order.type === 'delivery' &&
      Boolean(order.driverId) &&
      order.driverId === req.user.id;

    const isCustomerAuthorized =
      Boolean(req.user?.id) &&
      Boolean(order.customerId) &&
      order.customerId === req.user?.id;

    const isAuthorized =
      req.user?.role === 'hq_admin' ||
      (isTenantStaffRole(req.user?.role) && req.user?.tenantId === order.tenantId) ||
      isDriverAuthorized ||
      isCustomerAuthorized;

    if (!isAuthorized) {
      res.status(403).json({
        error: 'Acesso negado para consultar este pedido.',
        code: 'FORBIDDEN_ORDER_ACCESS'
      });
      return;
    }

    res.json(order);
  } catch {
    res.status(500).json({ error: 'Failed to fetch order.' });
  }
});

ordersRouter.post('/', publicOrderRateLimiter, async (req: Request, res: Response) => {
  const body = (req.body || {}) as Record<string, unknown>;
  const idempotencyKey = extractIdempotencyKey(req, body);

  try {
    const { order, alreadyExisted } = await executeCommercialOrder({
      body,
      user: req.user,
      idempotencyKey
    });

    res.status(alreadyExisted ? 200 : 201).json(order);
  } catch (error: unknown) {
    sendCommerceError(res, error, 'Erro ao processar operação comercial.');
  }
});

ordersRouter.post('/channels/:channel', async (req: Request, res: Response) => {
  const rawChannel = getParam(req, 'channel');
  const forcedChannel = normalizeCommercialChannel(rawChannel, 'Online Marketplace');
  const body = (req.body || {}) as Record<string, unknown>;
  const idempotencyKey = extractIdempotencyKey(req, body);

  try {
    const { order, alreadyExisted } = await executeCommercialOrder({
      body,
      user: req.user,
      idempotencyKey,
      forcedChannel
    });

    res.status(alreadyExisted ? 200 : 201).json(order);
  } catch (error: unknown) {
    sendCommerceError(res, error, `Erro ao processar pedido via canal ${forcedChannel}.`);
  }
});

ordersRouter.patch('/:id/status', requireAuth, async (req: Request, res: Response) => {
  const id = getParam(req, 'id');
  const newStatus = req.body?.status as OrderTransaction['status'];

  if (!newStatus) {
    res.status(400).json({ error: 'Novo status é obrigatório.', code: 'MISSING_STATUS' });
    return;
  }

  try {
    const updated = await transitionCommercialOrderStatus({
      orderId: id,
      newStatus,
      user: req.user
    });
    res.json(updated);
  } catch (error: unknown) {
    sendCommerceError(res, error, 'Erro ao atualizar status do pedido.');
  }
});
