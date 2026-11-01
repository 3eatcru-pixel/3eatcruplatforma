import { Router, Request, Response } from 'express';
import { Appointment, CompanyTenant, TableInfo } from '../../shared/models/ecosystem.model';
import { isTenantStaffRole, requireAuth } from '../middleware/auth.middleware';
import { adminDb } from '../firebase-admin';
import { Query, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { publicReservationRateLimiter } from '../middleware/rate-limiter.middleware';

export const reservationsRouter = Router();

const VALID_STATUSES: ReadonlySet<Appointment['status']> = new Set([
  'pending',
  'confirmed',
  'seated',
  'cancelled',
  'completed',
  'no_show'
]);

function getParamId(req: Request): string {
  const p = req.params['id'];
  return Array.isArray(p) ? p[0] : (p || '');
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = value;
    }
  }
  return clean as T;
}

class ReservationDomainError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}

/**
 * POST /api/reservations/public - Public/Consumer table reservation request from Storefront (/p/:id)
 */
reservationsRouter.post('/public', publicReservationRateLimiter, async (req: Request, res: Response) => {
  const body = req.body || {};
  const tenantId = String(body.tenantId || '').trim();
  const customerName = String(body.customerName || '').trim();
  const customerPhone = String(body.customerPhone || '').trim();
  const date = String(body.date || '').trim();
  const time = String(body.time || '').trim();
  const partySize = Math.min(30, Math.max(1, Number(body.partySize) || 2));

  if (!tenantId || customerName.length < 2 || customerPhone.replace(/\D/g, '').length < 8) {
    res.status(400).json({
      error: 'Estabelecimento, nome completo e telefone de contato são obrigatórios.',
      code: 'INVALID_RESERVATION_PAYLOAD'
    });
    return;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    res.status(400).json({
      error: 'Data (YYYY-MM-DD) e horário (HH:mm) válidos são obrigatórios.',
      code: 'INVALID_DATETIME'
    });
    return;
  }

  try {
    const tenantSnap = await adminDb.collection('tenants').doc(tenantId).get();
    if (!tenantSnap.exists) {
      res.status(404).json({ error: 'Estabelecimento não encontrado.', code: 'TENANT_NOT_FOUND' });
      return;
    }

    const tenant = tenantSnap.data() as CompanyTenant;
    if (tenant.status !== 'active') {
      res.status(403).json({
        error: 'Estabelecimento indisponível para reservas online no momento.',
        code: 'TENANT_INACTIVE'
      });
      return;
    }

    if (tenant.supportsReservation === false) {
      res.status(422).json({
        error: 'Este estabelecimento não aceita reservas online no momento.',
        code: 'RESERVATIONS_DISABLED'
      });
      return;
    }

    const id = 'res-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
    const staffUids = Array.isArray(tenant.staffUids) ? tenant.staffUids.slice(0, 20) : [];
    const authenticatedCustomerId =
      req.user && req.user.role !== 'guest' ? req.user.id : undefined;

    const reservation = stripUndefined<Appointment & Record<string, unknown>>({
      id,
      tenantId,
      customerId: authenticatedCustomerId,
      customerName: customerName.slice(0, 120),
      customerPhone: customerPhone.slice(0, 32),
      partySize,
      zonePreference: body.zonePreference || 'any',
      occasion: body.occasion || 'jantar',
      channel: 'storefront',
      serviceType: body.serviceType ? String(body.serviceType).slice(0, 80) : 'Reserva de Mesa',
      date,
      time,
      durationMinutes: Number(body.durationMinutes) || 90,
      status: 'pending',
      notes: body.notes ? String(body.notes).slice(0, 300) : undefined,
      staffUids,
      createdAt: new Date().toISOString()
    });

    await adminDb.collection('reservations').doc(id).set(reservation);
    res.status(201).json(reservation);
  } catch {
    res.status(500).json({ error: 'Falha ao registrar solicitação de reserva.' });
  }
});

/**
 * GET /api/reservations - Authenticated list with strict multi-tenant & consumer isolation
 */
reservationsRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const requestedTenantId = req.query['tenantId'] as string | undefined;
  const requestedDate = req.query['date'] as string | undefined;

  try {
    let query: Query = adminDb.collection('reservations');

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
          error: 'Acesso negado: reservas pertencem a outro estabelecimento.',
          code: 'TENANT_MISMATCH'
        });
        return;
      }
      query = query.where('tenantId', '==', staffTenantId);
    } else if (req.user?.role === 'consumer' && req.user.id) {
      query = query.where('customerId', '==', req.user.id);
    } else {
      res.status(403).json({
        error: 'Acesso restrito: perfil sem permissão para consultar reservas.',
        code: 'FORBIDDEN_ROLE'
      });
      return;
    }

    const snap = await query.get();
    let list = snap.docs.map((doc: QueryDocumentSnapshot) => doc.data() as Appointment);

    if (requestedDate) {
      list = list.filter((item) => item.date === requestedDate);
    }

    list.sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
    res.json(list);
  } catch {
    res.status(500).json({ error: 'Falha ao consultar reservas.' });
  }
});

/**
 * POST /api/reservations - Authenticated creation (Store Staff, HQ Admin, or Consumer)
 */
reservationsRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  const body = req.body || {};
  const customerName = String(body.customerName || '').trim();
  const date = String(body.date || '').trim();
  const time = String(body.time || '').trim();

  if (!customerName || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    res.status(400).json({
      error: 'customerName, date (YYYY-MM-DD) e time (HH:mm) são obrigatórios.',
      code: 'INVALID_RESERVATION_PAYLOAD'
    });
    return;
  }

  // Consumer creating via authenticated endpoint is always pending & unprivileged
  if (req.user?.role === 'consumer') {
    const tenantId = String(body.tenantId || '').trim();
    if (!tenantId) {
      res.status(400).json({ error: 'tenantId é obrigatório.', code: 'MISSING_TENANT' });
      return;
    }

    try {
      const tenantSnap = await adminDb.collection('tenants').doc(tenantId).get();
      if (!tenantSnap.exists) {
        res.status(404).json({ error: 'Estabelecimento não encontrado.' });
        return;
      }
      const tenant = tenantSnap.data() as CompanyTenant;
      if (tenant.status !== 'active') {
        res.status(403).json({ error: 'Estabelecimento inativo.', code: 'TENANT_INACTIVE' });
        return;
      }
      if (tenant.supportsReservation === false) {
        res.status(422).json({ error: 'Reservas online desativadas.', code: 'RESERVATIONS_DISABLED' });
        return;
      }

      const id = 'res-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
      const reservation = stripUndefined<Appointment & Record<string, unknown>>({
        id,
        tenantId,
        customerId: req.user.id,
        customerName: customerName.slice(0, 120),
        customerPhone: body.customerPhone ? String(body.customerPhone).slice(0, 32) : undefined,
        partySize: Math.min(30, Math.max(1, Number(body.partySize) || 2)),
        zonePreference: body.zonePreference || 'any',
        occasion: body.occasion || 'jantar',
        channel: 'storefront',
        serviceType: body.serviceType ? String(body.serviceType).slice(0, 80) : 'Reserva de Mesa',
        date,
        time,
        durationMinutes: Number(body.durationMinutes) || 90,
        status: 'pending',
        notes: body.notes ? String(body.notes).slice(0, 300) : undefined,
        staffUids: Array.isArray(tenant.staffUids) ? tenant.staffUids.slice(0, 20) : [],
        createdAt: new Date().toISOString()
      });

      await adminDb.collection('reservations').doc(id).set(reservation);
      res.status(201).json(reservation);
      return;
    } catch {
      res.status(500).json({ error: 'Falha ao criar reserva.' });
      return;
    }
  }

  let assignedTenantId: string;
  if (req.user?.role === 'hq_admin') {
    assignedTenantId = String(body.tenantId || '').trim();
    if (!assignedTenantId) {
      res.status(400).json({ error: 'tenantId é obrigatório.', code: 'MISSING_TENANT' });
      return;
    }
  } else if (isTenantStaffRole(req.user?.role) && req.user?.tenantId) {
    if (body.tenantId && body.tenantId !== req.user.tenantId) {
      res.status(403).json({
        error: 'Acesso negado: não é permitido criar reserva para outro estabelecimento.',
        code: 'TENANT_MISMATCH'
      });
      return;
    }
    assignedTenantId = req.user.tenantId;
  } else {
    res.status(403).json({ error: 'Sem permissão para registrar reservas.' });
    return;
  }

  const desiredStatus: Appointment['status'] = VALID_STATUSES.has(body.status)
    ? body.status
    : 'confirmed';
  const requestedTableId = body.tableId ? String(body.tableId).trim() : undefined;
  const partySize = Math.min(30, Math.max(1, Number(body.partySize) || 2));

  try {
    const created = await adminDb.runTransaction(async (tx) => {
      const tenantRef = adminDb.collection('tenants').doc(assignedTenantId);
      const tenantSnap = await tx.get(tenantRef);
      const tenantData = tenantSnap.exists ? (tenantSnap.data() as CompanyTenant) : undefined;
      const staffUids = Array.isArray(tenantData?.staffUids)
        ? tenantData!.staffUids!.slice(0, 20)
        : req.user?.id
          ? [req.user.id]
          : [];

      let resolvedTableNumber: number | undefined = body.tableNumber
        ? Number(body.tableNumber)
        : undefined;

      if (requestedTableId) {
        const tableRef = adminDb.collection('tables').doc(requestedTableId);
        const tableSnap = await tx.get(tableRef);
        if (!tableSnap.exists) {
          throw new ReservationDomainError(404, 'TABLE_NOT_FOUND', 'Mesa informada não encontrada.');
        }
        const table = tableSnap.data() as TableInfo;
        if (table.tenantId !== assignedTenantId) {
          throw new ReservationDomainError(
            403,
            'TENANT_MISMATCH',
            'Mesa pertence a outro estabelecimento.'
          );
        }
        if (
          (desiredStatus === 'confirmed' || desiredStatus === 'seated') &&
          (table.status === 'occupied' || table.status === 'billing')
        ) {
          throw new ReservationDomainError(
            409,
            'TABLE_OCCUPIED',
            `Mesa ${table.number} já está ocupada no momento.`
          );
        }
        resolvedTableNumber = table.number;

        if (desiredStatus === 'seated') {
          tx.update(tableRef, { status: 'occupied', guests: partySize });
        } else if (desiredStatus === 'confirmed' && table.status === 'available') {
          tx.update(tableRef, { status: 'reserved', guests: partySize });
        }
      }

      const id = 'res-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
      const reservation = stripUndefined<Appointment & Record<string, unknown>>({
        id,
        tenantId: assignedTenantId,
        customerId: body.customerId ? String(body.customerId) : undefined,
        customerName: customerName.slice(0, 120),
        customerPhone: body.customerPhone ? String(body.customerPhone).slice(0, 32) : undefined,
        partySize,
        tableId: requestedTableId,
        tableNumber: resolvedTableNumber,
        zonePreference: body.zonePreference || 'any',
        occasion: body.occasion || 'jantar',
        channel: body.channel || 'pos',
        serviceId: body.serviceId ? String(body.serviceId) : undefined,
        serviceName: body.serviceName ? String(body.serviceName) : undefined,
        serviceType: body.serviceType ? String(body.serviceType).slice(0, 80) : 'Reserva de Mesa',
        date,
        time,
        durationMinutes: Number(body.durationMinutes) || 90,
        status: desiredStatus,
        notes: body.notes ? String(body.notes).slice(0, 300) : undefined,
        staffUids,
        createdAt: new Date().toISOString()
      });

      tx.set(adminDb.collection('reservations').doc(id), reservation);
      return reservation;
    });

    res.status(201).json(created);
  } catch (err) {
    if (err instanceof ReservationDomainError) {
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }
    res.status(500).json({ error: 'Falha ao registrar reserva.' });
  }
});

/**
 * PATCH /api/reservations/:id/status - Atomic status transition + floor table sync
 */
reservationsRouter.patch('/:id/status', requireAuth, async (req: Request, res: Response) => {
  const id = getParamId(req);
  const body = req.body || {};
  const nextStatus = body.status as Appointment['status'];
  const explicitTableId = body.tableId ? String(body.tableId).trim() : undefined;

  if (!VALID_STATUSES.has(nextStatus)) {
    res.status(400).json({
      error: 'Status de reserva inválido.',
      code: 'INVALID_STATUS'
    });
    return;
  }

  try {
    const updated = await adminDb.runTransaction(async (tx) => {
      const resRef = adminDb.collection('reservations').doc(id);
      const resSnap = await tx.get(resRef);
      if (!resSnap.exists) {
        throw new ReservationDomainError(404, 'RESERVATION_NOT_FOUND', 'Reserva não encontrada.');
      }

      const current = resSnap.data() as Appointment;

      if (req.user?.role === 'consumer') {
        if (!current.customerId || current.customerId !== req.user.id || nextStatus !== 'cancelled') {
          throw new ReservationDomainError(
            403,
            'FORBIDDEN_RESERVATION_TRANSITION',
            'Consumidor só pode cancelar a própria reserva.'
          );
        }
      } else if (isTenantStaffRole(req.user?.role)) {
        if (!req.user?.tenantId || req.user.tenantId !== current.tenantId) {
          throw new ReservationDomainError(
            403,
            'TENANT_MISMATCH',
            'Acesso negado: reserva pertence a outro estabelecimento.'
          );
        }
      } else if (req.user?.role !== 'hq_admin') {
        throw new ReservationDomainError(
          403,
          'FORBIDDEN_ROLE',
          'Perfil sem autorização para alterar reservas.'
        );
      }

      const targetTableId = explicitTableId || current.tableId;
      let resolvedTableNumber = current.tableNumber;

      if (targetTableId) {
        const tableRef = adminDb.collection('tables').doc(targetTableId);
        const tableSnap = await tx.get(tableRef);
        if (!tableSnap.exists) {
          if (explicitTableId) {
            throw new ReservationDomainError(404, 'TABLE_NOT_FOUND', 'Mesa não encontrada.');
          }
        } else {
          const table = tableSnap.data() as TableInfo;
          if (table.tenantId !== current.tenantId) {
            throw new ReservationDomainError(
              403,
              'TENANT_MISMATCH',
              'Mesa pertence a outro estabelecimento.'
            );
          }
          resolvedTableNumber = table.number;

          if (nextStatus === 'seated') {
            if (table.status === 'occupied' || table.status === 'billing') {
              throw new ReservationDomainError(
                409,
                'TABLE_OCCUPIED',
                `Mesa ${table.number} já está ocupada.`
              );
            }
            tx.update(tableRef, { status: 'occupied', guests: current.partySize || 2 });
          } else if (nextStatus === 'confirmed' && table.status === 'available') {
            tx.update(tableRef, { status: 'reserved', guests: current.partySize || 2 });
          } else if (
            (nextStatus === 'cancelled' || nextStatus === 'no_show') &&
            table.status === 'reserved'
          ) {
            tx.update(tableRef, { status: 'available', guests: 0 });
          }
        }
      }

      const nextDoc = stripUndefined<Appointment & Record<string, unknown>>({
        ...current,
        status: nextStatus,
        tableId: targetTableId,
        tableNumber: resolvedTableNumber
      });

      tx.set(resRef, nextDoc);
      return nextDoc;
    });

    res.json(updated);
  } catch (err) {
    if (err instanceof ReservationDomainError) {
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }
    res.status(500).json({ error: 'Falha ao atualizar status da reserva.' });
  }
});
