import { Request, Response, Router } from 'express';
import { ExternalOrder } from '../../shared/models/ecosystem.model';
import { adminDb } from '../firebase-admin';
import { isTenantManagerRole, requireAuth } from '../middleware/auth.middleware';

export const marketplaceDeliveryRouter = Router();

marketplaceDeliveryRouter.get('/orders', requireAuth, async (req: Request, res: Response) => {
  if (!isTenantManagerRole(req.user?.role)) {
    res.status(403).json({ error: 'A fila externa fica restrita ao proprietário ou operador da loja.', code: 'MARKETPLACE_ORDER_ACCESS_DENIED' });
    return;
  }
  const tenantId = req.user?.tenantId?.trim();
  if (!tenantId) {
    res.status(403).json({ error: 'Usuário sem loja vinculada.', code: 'NO_TENANT_BOUND' });
    return;
  }
  const requestedLimit = Number(req.query['limit'] || 100);
  const limit = Number.isFinite(requestedLimit) ? Math.min(200, Math.max(1, Math.floor(requestedLimit))) : 100;

  try {
    const snapshot = await adminDb.collection('tenants').doc(tenantId)
      .collection('marketplace_delivery_orders')
      .orderBy('receivedAt', 'desc')
      .limit(limit)
      .get();
    res.json(snapshot.docs.map((document) => document.data() as ExternalOrder));
  } catch {
    res.status(500).json({ error: 'Não foi possível carregar pedidos de marketplaces.', code: 'MARKETPLACE_ORDER_LIST_FAILED' });
  }
});

marketplaceDeliveryRouter.get('/connections', requireAuth, async (req: Request, res: Response) => {
  if (!isTenantManagerRole(req.user?.role)) {
    res.status(403).json({ error: 'As conexões externas ficam restritas ao proprietário ou operador da loja.', code: 'MARKETPLACE_CONNECTION_ACCESS_DENIED' });
    return;
  }
  const tenantId = req.user?.tenantId?.trim();
  if (!tenantId) {
    res.status(403).json({ error: 'Usuário sem loja vinculada.', code: 'NO_TENANT_BOUND' });
    return;
  }

  try {
    const snapshot = await adminDb.collection('marketplace_delivery_connections')
      .where('tenantId', '==', tenantId)
      .get();
    const safeConnections = snapshot.docs.flatMap((document) => {
      const data = document.data();
      const provider = data['provider'];
      const status = data['status'];
      if (!['ifood', '99food', 'rappi'].includes(String(provider)) ||
          !['pending_authorization', 'active', 'error', 'suspended'].includes(String(status))) return [];
      return [{
        provider,
        status,
        ...(typeof data['connectedAt'] === 'string' ? { connectedAt: data['connectedAt'] } : {}),
        ...(typeof data['lastSyncAt'] === 'string' ? { lastSyncAt: data['lastSyncAt'] } : {})
      }];
    });
    res.json(safeConnections);
  } catch {
    res.status(500).json({ error: 'Não foi possível carregar as conexões de marketplaces.', code: 'MARKETPLACE_CONNECTION_LIST_FAILED' });
  }
});
