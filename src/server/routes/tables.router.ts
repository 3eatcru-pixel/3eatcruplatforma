import { Router, Request, Response } from 'express';
import { CompanyTenant, TableInfo } from '../../shared/models/ecosystem.model';
import { isTenantStaffRole, requireAuth } from '../middleware/auth.middleware';
import { adminDb } from '../firebase-admin';
import { Query, QueryDocumentSnapshot } from 'firebase-admin/firestore';

export const tablesRouter = Router();

function getParamId(req: Request): string {
  const p = req.params['id'];
  return Array.isArray(p) ? p[0] : (p || '');
}

tablesRouter.use(requireAuth);

/**
 * GET /api/tables - List tables with strict multi-tenant isolation
 */
tablesRouter.get('/', async (req: Request, res: Response) => {
  const requestedTenantId = req.query['tenantId'] as string | undefined;

  try {
    let query: Query = adminDb.collection('tables');

    if (req.user?.role === 'hq_admin') {
      if (requestedTenantId) {
        query = query.where('tenantId', '==', requestedTenantId);
      }
    } else if (isTenantStaffRole(req.user?.role)) {
      const staffTenantId = req.user?.tenantId;
      if (!staffTenantId) {
        res.status(403).json({ error: 'Colaborador sem estabelecimento vinculado.' });
        return;
      }
      if (requestedTenantId && requestedTenantId !== staffTenantId) {
        res.status(403).json({
          error: 'Acesso negado: mesas pertencem a outro estabelecimento.',
          code: 'TENANT_MISMATCH'
        });
        return;
      }
      query = query.where('tenantId', '==', staffTenantId);
    } else {
      res.status(403).json({ error: 'Acesso restrito à equipe do salão ou gestão.' });
      return;
    }

    const snap = await query.get();
    res.json(snap.docs.map((doc: QueryDocumentSnapshot) => doc.data()));
  } catch {
    res.status(500).json({ error: 'Failed to fetch tables.' });
  }
});

/**
 * GET /api/tables/:id - Single table with tenant staff verification
 */
tablesRouter.get('/:id', async (req: Request, res: Response) => {
  const id = getParamId(req);
  try {
    const doc = await adminDb.collection('tables').doc(id).get();
    if (!doc.exists) {
      res.status(404).json({ error: 'Mesa não encontrada.' });
      return;
    }

    const table = doc.data() as TableInfo;
    const isAuthorized =
      req.user?.role === 'hq_admin' ||
      (isTenantStaffRole(req.user?.role) && req.user?.tenantId === table.tenantId);

    if (!isAuthorized) {
      res.status(403).json({ error: 'Acesso negado: mesa pertence a outro estabelecimento.' });
      return;
    }

    res.json(table);
  } catch {
    res.status(500).json({ error: 'Failed to fetch table details.' });
  }
});

/**
 * POST /api/tables - Create new table (Tenant Owner, Operator, Waiter, or HQ Admin)
 */
tablesRouter.post('/', async (req: Request, res: Response) => {
  const body = req.body;
  if (!body.number || !body.capacity) {
    res.status(400).json({ error: 'number e capacity são obrigatórios.' });
    return;
  }

  let assignedTenantId: string;
  if (req.user?.role === 'hq_admin') {
    assignedTenantId = String(body.tenantId || '').trim();
    if (!assignedTenantId) {
      res.status(400).json({ error: 'tenantId é obrigatório para criar mesa.' });
      return;
    }
  } else if (isTenantStaffRole(req.user?.role) && req.user?.tenantId) {
    if (body.tenantId && body.tenantId !== req.user.tenantId) {
      res.status(403).json({
        error: 'Acesso negado: não é permitido criar mesa em outro estabelecimento.',
        code: 'TENANT_MISMATCH'
      });
      return;
    }
    assignedTenantId = req.user.tenantId;
  } else {
    res.status(403).json({ error: 'Sem permissão para criar mesas.' });
    return;
  }

  try {
    const tenantSnap = await adminDb.collection('tenants').doc(assignedTenantId).get();
    const tenantData = tenantSnap.exists ? (tenantSnap.data() as CompanyTenant) : undefined;
    const id = 't-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 5);

    const newTable: TableInfo & { staffUids?: string[] } = {
      id,
      tenantId: assignedTenantId,
      number: Number(body.number),
      capacity: Number(body.capacity),
      status: body.status || 'available',
      zone: body.zone || 'Salão Principal',
      ...(body.server ? { server: String(body.server) } : {}),
      ...(body.guests !== undefined ? { guests: Number(body.guests) } : {}),
      currentTotal: Number(body.currentTotal || 0),
      ...(body.currentOrderId ? { currentOrderId: String(body.currentOrderId) } : {}),
      staffUids: Array.isArray(tenantData?.staffUids) ? tenantData!.staffUids.slice(0, 20) : []
    };

    await adminDb.collection('tables').doc(id).set(newTable);
    res.status(201).json(newTable);
  } catch {
    res.status(500).json({ error: 'Failed to create table.' });
  }
});

/**
 * PATCH /api/tables/:id - Update table status or comanda
 */
tablesRouter.patch('/:id', async (req: Request, res: Response) => {
  const id = getParamId(req);
  try {
    const docRef = adminDb.collection('tables').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).json({ error: 'Mesa não encontrada.' });
      return;
    }

    const table = doc.data() as TableInfo;
    const isAuthorized =
      req.user?.role === 'hq_admin' ||
      (isTenantStaffRole(req.user?.role) && req.user?.tenantId === table.tenantId);

    if (!isAuthorized) {
      res.status(403).json({ error: 'Acesso negado para alterar esta mesa.' });
      return;
    }

    const updates = { ...req.body };
    delete updates.id;
    delete updates.tenantId;
    delete updates.staffUids;

    await docRef.update(updates);
    const updatedDoc = await docRef.get();
    res.json(updatedDoc.data());
  } catch {
    res.status(500).json({ error: 'Failed to update table.' });
  }
});
