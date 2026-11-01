import { Request, Response, Router } from 'express';
import { ServiceOrder } from '../../shared/models/ecosystem.model';
import { isTenantManagerRole, requireAuth } from '../middleware/auth.middleware';
import { adminDb } from '../firebase-admin';
import { Transaction } from 'firebase-admin/firestore';

export const serviceOrdersRouter = Router();
serviceOrdersRouter.use(requireAuth);

const ALLOWED_TRANSITIONS: Partial<Record<ServiceOrder['status'], ServiceOrder['status'][]>> = {
  draft: ['open'],
  open: ['in_progress', 'parts_pending', 'triagem'],
  parts_pending: ['in_progress'],
  in_progress: ['parts_pending', 'ready'],
  ready: ['delivered'],
  triagem: ['execucao'],
  execucao: ['finalizado']
};

function managerTenant(req: Request, requestedTenantId?: unknown): string | null {
  if (!isTenantManagerRole(req.user?.role) || !req.user?.tenantId) return null;
  if (requestedTenantId && requestedTenantId !== req.user.tenantId) return null;
  return req.user.tenantId;
}

function forbidden(res: Response): void {
  res.status(403).json({ error: 'Somente proprietário ou operador da unidade pode gerenciar ordens de serviço.', code: 'FORBIDDEN_ROLE' });
}

serviceOrdersRouter.get('/', async (req: Request, res: Response) => {
  const tenantId = managerTenant(req, req.query['tenantId']);
  if (!tenantId) {
    forbidden(res);
    return;
  }
  try {
    const query = adminDb.collection('service_orders').where('tenantId', '==', tenantId).limit(200);
    const snapshot = await query.get();
    const orders = snapshot.docs.map((doc) => doc.data() as ServiceOrder)
      .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')));
    res.json(orders);
  } catch {
    res.status(500).json({ error: 'Falha ao consultar ordens de serviço.' });
  }
});

serviceOrdersRouter.post('/', async (req: Request, res: Response) => {
  const body = req.body || {};
  const tenantId = managerTenant(req, body.tenantId);
  if (!tenantId) {
    forbidden(res);
    return;
  }
  const customerName = typeof body.customerName === 'string' ? body.customerName.trim().slice(0, 100) : '';
  const description = typeof body.description === 'string' ? body.description.trim().slice(0, 1000) : '';
  if (!customerName || !description) {
    res.status(400).json({ error: 'Nome do cliente e descrição do serviço são obrigatórios.', code: 'INVALID_SERVICE_ORDER' });
    return;
  }
  const priority = ['low', 'medium', 'high', 'urgent'].includes(body.priority) ? body.priority : 'medium';
  const ref = adminDb.collection('service_orders').doc();
  const now = new Date().toISOString();
  const order: ServiceOrder = {
    id: ref.id,
    tenantId,
    osNumber: `OS-${now.slice(0, 7).replace('-', '')}-${ref.id.slice(-6).toUpperCase()}`,
    customerName,
    description,
    ...(typeof body.equipment === 'string' ? { equipment: body.equipment.trim().slice(0, 120) } : {}),
    ...(typeof body.vehicleInfo === 'string' ? { vehicleInfo: body.vehicleInfo.trim().slice(0, 120) } : {}),
    ...(typeof body.technician === 'string' ? { technician: body.technician.trim().slice(0, 100) } : {}),
    priority,
    progressPercent: 0,
    status: 'open',
    createdAt: now
  };
  try {
    await ref.set(order as unknown as Record<string, unknown>);
    res.status(201).json(order);
  } catch {
    res.status(500).json({ error: 'Falha ao criar ordem de serviço.' });
  }
});

serviceOrdersRouter.patch('/:id/status', async (req: Request, res: Response) => {
  const tenantId = managerTenant(req, req.body?.tenantId);
  if (!tenantId) {
    forbidden(res);
    return;
  }
  const id = String(req.params['id'] || '');
  const nextStatus = req.body?.status as ServiceOrder['status'];
  if (!Object.prototype.hasOwnProperty.call(ALLOWED_TRANSITIONS, nextStatus)) {
    res.status(400).json({ error: 'Status de destino inválido.', code: 'INVALID_SERVICE_ORDER_STATUS' });
    return;
  }
  try {
    const ref = adminDb.collection('service_orders').doc(id);
    const result = await adminDb.runTransaction(async (transaction: Transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists || snapshot.data()?.['tenantId'] !== tenantId) {
        throw { status: 404, message: 'Ordem de serviço não encontrada nesta unidade.' };
      }
      const order = snapshot.data() as ServiceOrder;
      if (!ALLOWED_TRANSITIONS[order.status]?.includes(nextStatus)) {
        throw { status: 409, message: 'Transição de status inválida para esta ordem.' };
      }
      const progressPercent = nextStatus === 'ready' || nextStatus === 'delivered' || nextStatus === 'finalizado'
        ? 100
        : nextStatus === 'in_progress' || nextStatus === 'execucao'
          ? Math.max(1, Math.min(99, Number(req.body?.progress) || 25))
          : order.progressPercent || 0;
      const updates: Record<string, unknown> = { status: nextStatus, progressPercent, updatedAt: new Date().toISOString() };
      if (nextStatus === 'delivered' || nextStatus === 'finalizado') updates['finishedAt'] = new Date().toISOString();
      transaction.update(ref, updates);
      return { ...order, ...updates };
    });
    res.json(result);
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ error: err.message || 'Falha ao atualizar ordem de serviço.' });
  }
});
