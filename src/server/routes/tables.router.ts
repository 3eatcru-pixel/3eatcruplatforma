import { Router, Request, Response } from 'express';
import { CompanyTenant, TableInfo } from '../../shared/models/ecosystem.model';
import { isTenantManagerRole, isTenantStaffRole, requireAuth } from '../middleware/auth.middleware';
import { adminDb } from '../firebase-admin';
import { Query, QueryDocumentSnapshot } from 'firebase-admin/firestore';

export const tablesRouter = Router();

class TableDomainError extends Error {
  constructor(public readonly statusCode: number, public readonly code: string, message: string) {
    super(message);
  }
}

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
  const body = req.body || {};
  const number = Number(body.number);
  const capacity = Number(body.capacity);
  if (!Number.isInteger(number) || number < 1 || number > 9999 ||
      !Number.isInteger(capacity) || capacity < 1 || capacity > 100) {
    res.status(400).json({ error: 'number deve ser inteiro de 1 a 9999 e capacity de 1 a 100.' });
    return;
  }
  if (body.zone !== undefined && (typeof body.zone !== 'string' || !body.zone.trim() || body.zone.length > 60)) {
    res.status(400).json({ error: 'zone deve conter de 1 a 60 caracteres.' });
    return;
  }

  let assignedTenantId: string;
  if (req.user?.role === 'hq_admin') {
    assignedTenantId = String(body.tenantId || '').trim();
    if (!assignedTenantId) {
      res.status(400).json({ error: 'tenantId é obrigatório para criar mesa.' });
      return;
    }
  } else if (isTenantManagerRole(req.user?.role) && req.user?.tenantId) {
    if (body.tenantId && body.tenantId !== req.user.tenantId) {
      res.status(403).json({
        error: 'Acesso negado: não é permitido criar mesa em outro estabelecimento.',
        code: 'TENANT_MISMATCH'
      });
      return;
    }
    assignedTenantId = req.user.tenantId;
  } else {
    res.status(403).json({ error: 'Somente gestão da unidade pode cadastrar mesas.' });
    return;
  }

  try {
    const id = 't-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 5);
    const tableRef = adminDb.collection('tables').doc(id);
    const tenantRef = adminDb.collection('tenants').doc(assignedTenantId);
    const newTable = await adminDb.runTransaction(async (tx) => {
      const tenantSnap = await tx.get(tenantRef);
      if (!tenantSnap.exists) {
        throw new TableDomainError(404, 'TENANT_NOT_FOUND', 'Estabelecimento não encontrado.');
      }
      const existing = await tx.get(adminDb.collection('tables').where('tenantId', '==', assignedTenantId));
      const duplicateNumber = existing.docs.some((doc) =>
        doc.id !== id && Number(doc.data()?.['number']) === number
      );
      if (duplicateNumber) {
        throw new TableDomainError(409, 'TABLE_NUMBER_EXISTS', 'Já existe uma mesa com este número nesta unidade.');
      }

      const tenantData = tenantSnap.data() as CompanyTenant;
      const table: TableInfo & { staffUids?: string[] } = {
        id,
        tenantId: assignedTenantId,
        number,
        capacity,
        status: 'available',
        zone: String(body.zone || 'Salão Principal').trim().slice(0, 60),
        currentTotal: 0,
        staffUids: Array.isArray(tenantData.staffUids) ? tenantData.staffUids.slice(0, 20) : []
      };
      tx.create(tableRef, table);
      return table;
    });
    res.status(201).json(newTable);
  } catch (err) {
    if (err instanceof TableDomainError) {
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }
    res.status(500).json({ error: 'Failed to create table.' });
  }
});

/**
 * PATCH /api/tables/:id - Update table status or comanda
 */
tablesRouter.patch('/:id', async (req: Request, res: Response) => {
  const id = getParamId(req);
  const body = req.body || {};
  const allowedFields = new Set(['status', 'guests', 'server', 'number', 'capacity', 'zone']);
  const suppliedFields = Object.keys(body);
  if (suppliedFields.length === 0 || suppliedFields.some((field) => !allowedFields.has(field))) {
    res.status(400).json({ error: 'Campos inválidos para atualizar mesa.', code: 'INVALID_TABLE_FIELDS' });
    return;
  }

  if (body.number !== undefined && (!Number.isInteger(Number(body.number)) || Number(body.number) < 1 || Number(body.number) > 9999)) {
    res.status(400).json({ error: 'number deve ser inteiro de 1 a 9999.', code: 'INVALID_TABLE_NUMBER' });
    return;
  }
  if (body.capacity !== undefined && (!Number.isInteger(Number(body.capacity)) || Number(body.capacity) < 1 || Number(body.capacity) > 100)) {
    res.status(400).json({ error: 'capacity deve ser inteiro de 1 a 100.', code: 'INVALID_TABLE_CAPACITY' });
    return;
  }
  if (body.guests !== undefined && (!Number.isInteger(Number(body.guests)) || Number(body.guests) < 0 || Number(body.guests) > 100)) {
    res.status(400).json({ error: 'guests deve ser um inteiro de 0 a 100.', code: 'INVALID_TABLE_GUESTS' });
    return;
  }
  if (body.status !== undefined && !['available', 'occupied', 'billing'].includes(body.status)) {
    res.status(400).json({ error: 'Transição de status deve ser feita pelo fluxo de reservas.', code: 'INVALID_TABLE_STATUS' });
    return;
  }
  if (body.zone !== undefined && (typeof body.zone !== 'string' || body.zone.trim().length < 1 || body.zone.length > 60)) {
    res.status(400).json({ error: 'zone deve conter de 1 a 60 caracteres.', code: 'INVALID_TABLE_ZONE' });
    return;
  }
  if (body.server !== undefined && (typeof body.server !== 'string' || body.server.length > 120)) {
    res.status(400).json({ error: 'server deve conter no máximo 120 caracteres.', code: 'INVALID_TABLE_SERVER' });
    return;
  }

  try {
    const docRef = adminDb.collection('tables').doc(id);
    const updatedTable = await adminDb.runTransaction(async (tx) => {
      const doc = await tx.get(docRef);
      if (!doc.exists) {
        throw new TableDomainError(404, 'TABLE_NOT_FOUND', 'Mesa não encontrada.');
      }

      const table = doc.data() as TableInfo;
      const isAuthorized = req.user?.role === 'hq_admin' ||
        (isTenantStaffRole(req.user?.role) && req.user?.tenantId === table.tenantId);
      if (!isAuthorized) {
        throw new TableDomainError(403, 'TENANT_MISMATCH', 'Acesso negado para alterar esta mesa.');
      }

      const updates: Partial<TableInfo> = {};
      const hasLayoutUpdate = ['number', 'capacity', 'zone'].some((field) => body[field] !== undefined);
      if (hasLayoutUpdate && req.user?.role !== 'hq_admin' && !isTenantManagerRole(req.user?.role)) {
        throw new TableDomainError(403, 'FORBIDDEN_TABLE_LAYOUT', 'Somente gestão pode alterar o cadastro da mesa.');
      }

      if (body.number !== undefined) updates.number = Number(body.number);
      if (body.capacity !== undefined) updates.capacity = Number(body.capacity);
      if (body.zone !== undefined) updates.zone = body.zone.trim();
      if (body.server !== undefined) updates.server = body.server.trim();
      const nextCapacity = updates.capacity ?? table.capacity;
      if (body.guests !== undefined) {
        const guests = Number(body.guests);
        if (body.status !== 'occupied' && table.status !== 'occupied') {
          throw new TableDomainError(409, 'TABLE_NOT_OCCUPIED', 'Só é possível editar ocupação de uma mesa aberta.');
        }
        if (guests > nextCapacity) {
          throw new TableDomainError(400, 'TABLE_CAPACITY_EXCEEDED', 'O número de pessoas excede a capacidade da mesa.');
        }
        updates.guests = guests;
      }
      if (body.server !== undefined && body.status !== 'occupied' && table.status !== 'occupied') {
        throw new TableDomainError(409, 'TABLE_NOT_OCCUPIED', 'Só é possível atribuir garçom a uma mesa aberta.');
      }
      if (body.capacity !== undefined && Number(table.guests || 0) > nextCapacity) {
        throw new TableDomainError(409, 'TABLE_CAPACITY_EXCEEDED', 'A capacidade não pode ficar abaixo da ocupação atual.');
      }

      if (body.number !== undefined && Number(body.number) !== table.number) {
        const sameTenantTables = await tx.get(adminDb.collection('tables').where('tenantId', '==', table.tenantId));
        const duplicateNumber = sameTenantTables.docs.some((item) =>
          item.id !== id && Number(item.data()?.['number']) === Number(body.number)
        );
        if (duplicateNumber) {
          throw new TableDomainError(409, 'TABLE_NUMBER_EXISTS', 'Já existe uma mesa com este número nesta unidade.');
        }
      }

      if (body.status === 'occupied' && table.status !== 'available') {
        throw new TableDomainError(409, 'TABLE_NOT_AVAILABLE', 'Somente uma mesa livre pode ser aberta.');
      }
      if (body.status === 'billing' && table.status !== 'occupied') {
        throw new TableDomainError(409, 'TABLE_NOT_OCCUPIED', 'Somente uma mesa ocupada pode solicitar a conta.');
      }
      if (body.status === 'available' && (table.status !== 'occupied' || Number(table.currentTotal || 0) > 0)) {
        throw new TableDomainError(409, 'TABLE_BALANCE_OPEN', 'A mesa só pode ser liberada após encerrar a ocupação e quitar o saldo.');
      }
      if (body.status !== undefined) {
        updates.status = body.status;
        if (body.status === 'occupied' && body.guests === undefined) updates.guests = Math.min(2, nextCapacity);
        if (body.status === 'available') {
          updates.guests = 0;
          updates.server = '';
        }
      }

      if (Object.keys(updates).length === 0) {
        throw new TableDomainError(400, 'EMPTY_TABLE_UPDATE', 'Nenhuma alteração válida foi enviada.');
      }
      tx.update(docRef, updates);
      return { ...table, ...updates };
    });
    res.json(updatedTable);
  } catch (err) {
    if (err instanceof TableDomainError) {
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }
    res.status(500).json({ error: 'Failed to update table.' });
  }
});
