import { Router, Request, Response } from 'express';
import {
  CompanyTenant,
  DeliveryRoute,
  DeliveryWaypoint,
  OrderTransaction,
  StoreDriver,
  AuditLog
} from '../../shared/models/ecosystem.model';
import { isTenantManagerRole, requireAuth } from '../middleware/auth.middleware';
import { adminDb } from '../firebase-admin';
import { Query, Transaction, QueryDocumentSnapshot } from 'firebase-admin/firestore';

export const logisticsRouter = Router();

logisticsRouter.use(requireAuth);

const ALLOWED_ROUTE_TRANSITIONS: Record<DeliveryRoute['status'], DeliveryRoute['status'][]> = {
  available: ['accepted'],
  accepted: ['at_store', 'available'],
  at_store: ['in_progress'],
  in_progress: ['completed'],
  completed: []
};

function getParamId(req: Request): string {
  const p = req.params['id'];
  return Array.isArray(p) ? p[0] || '' : p || '';
}

async function logLogisticsAudit(
  action: string,
  details: string,
  severity: AuditLog['severity'] = 'info',
  user = 'Operação Logística'
) {
  const id = `aud-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const audit: AuditLog = {
    id,
    timestamp: new Date().toISOString(),
    user,
    action,
    module: 'System',
    details,
    severity
  };
  try {
    await adminDb.collection('audit_logs').doc(id).set(audit);
  } catch {
    // Non-blocking
  }
}

function canActOnAssignedRoute(req: Request, route: DeliveryRoute): boolean {
  if (!req.user) return false;
  if (req.user.role === 'hq_admin') return true;
  if (isTenantManagerRole(req.user.role) && req.user.tenantId === route.tenantId) return true;
  if (req.user.role === 'driver' && Boolean(route.driverId) && route.driverId === req.user.id) {
    return true;
  }
  return false;
}

/**
 * GET /api/logistics/routes
 */
logisticsRouter.get('/routes', async (req: Request, res: Response) => {
  const tenantId = req.query['tenantId'] as string | undefined;

  try {
    let query: Query = adminDb.collection('delivery_routes');

    if (req.user?.role === 'hq_admin') {
      if (tenantId && tenantId !== 'all') {
        query = query.where('tenantId', '==', tenantId);
      }
    } else if (isTenantManagerRole(req.user?.role)) {
      if (!req.user?.tenantId) {
        res.status(403).json({ error: 'Gestor sem estabelecimento vinculado.' });
        return;
      }
      if (tenantId && tenantId !== 'all' && tenantId !== req.user.tenantId) {
        res.status(403).json({ error: 'Acesso negado a rotas de outro estabelecimento.' });
        return;
      }
      query = query.where('tenantId', '==', req.user.tenantId);
    } else if (req.user?.role === 'driver') {
      // P1.5: Enforce tenant boundary for private drivers vs platform pool
      const driverSnap = await adminDb.collection('drivers').doc(req.user.id).get();
      const driverProfile = driverSnap.exists ? (driverSnap.data() as StoreDriver) : undefined;
      const boundTenantId =
        driverProfile?.driverType === 'private'
          ? driverProfile.tenantId || req.user.tenantId
          : req.user.tenantId && req.user.tenantId !== 'marketplace'
            ? req.user.tenantId
            : undefined;

      const availQuery = boundTenantId
        ? adminDb
            .collection('delivery_routes')
            .where('status', '==', 'available')
            .where('tenantId', '==', boundTenantId)
        : adminDb.collection('delivery_routes').where('status', '==', 'available');

      const [availSnap, mySnap] = await Promise.all([
        availQuery.get(),
        adminDb.collection('delivery_routes').where('driverId', '==', req.user.id).get()
      ]);

      const seen = new Set<string>();
      const combined: DeliveryRoute[] = [];
      for (const docSnap of [...mySnap.docs, ...availSnap.docs]) {
        if (!seen.has(docSnap.id)) {
          const rData = docSnap.data() as DeliveryRoute;
          if (boundTenantId && rData.driverId !== req.user.id && rData.tenantId !== boundTenantId) {
            continue;
          }
          seen.add(docSnap.id);
          combined.push(rData);
        }
      }
      res.json(combined);
      return;
    } else {
      res.status(403).json({ error: 'Acesso restrito ao módulo logístico.' });
      return;
    }

    const snap = await query.get();
    res.json(snap.docs.map((d: QueryDocumentSnapshot) => d.data()));
  } catch {
    res.status(500).json({ error: 'Failed to fetch logistics routes.' });
  }
});

/**
 * POST /api/logistics/routes
 */
logisticsRouter.post('/routes', async (req: Request, res: Response) => {
  const body = req.body || {};
  const isHq = req.user?.role === 'hq_admin';
  const isManager = isTenantManagerRole(req.user?.role);

  if (!isHq && !isManager) {
    res.status(403).json({ error: 'Apenas gestores da loja ou HQ podem despachar rotas.' });
    return;
  }

  const assignedTenantId = isHq
    ? String(body.tenantId || '').trim()
    : String(req.user?.tenantId || '').trim();
  if (!assignedTenantId) {
    res.status(400).json({ error: 'tenantId obrigatório para criar rota.' });
    return;
  }

  if (!isHq && body.tenantId && body.tenantId !== assignedTenantId) {
    res.status(403).json({ error: 'Não é permitido despachar rotas para outro estabelecimento.' });
    return;
  }

  try {
    const tenantDoc = await adminDb.collection('tenants').doc(assignedTenantId).get();
    if (!tenantDoc.exists) {
      res.status(404).json({ error: 'Estabelecimento não encontrado.' });
      return;
    }
    const tenant = tenantDoc.data() as CompanyTenant;
    const waypoints: DeliveryWaypoint[] = Array.isArray(body.waypoints) ? body.waypoints : [];

    // Validate linked waypoint orders belong to the same tenant
    for (const wp of waypoints) {
      if (wp.orderId) {
        const ordDoc = await adminDb.collection('orders').doc(wp.orderId).get();
        if (!ordDoc.exists) {
          res.status(400).json({ error: `Pedido vinculado [${wp.orderId}] não encontrado.` });
          return;
        }
        const ordData = ordDoc.data() as OrderTransaction;
        if (ordData.tenantId !== assignedTenantId) {
          res.status(403).json({
            error: 'Proibido vincular pedido de outro estabelecimento na rota.',
            code: 'TENANT_MISMATCH'
          });
          return;
        }
      }
    }

    const id = `rt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    const nowIso = new Date().toISOString();
    const newRoute: DeliveryRoute = {
      id,
      routeCode: String(body.routeCode || `RT-${Math.floor(1000 + Math.random() * 9000)}`),
      tenantId: assignedTenantId,
      date: nowIso,
      timeWindow: String(body.timeWindow || 'Imediato (30-45 min)'),
      totalDistanceKm: Number(body.totalDistanceKm || 4.2),
      estimatedDuration: String(body.estimatedDuration || '25 min'),
      totalEarnings: Number(body.totalEarnings ?? body.totalEstimatedEarnings ?? 12.5),
      waypoints,
      status: 'available',
      totalDeliveredCount: 0,
      staffUids: Array.isArray(tenant.staffUids) ? tenant.staffUids.slice(0, 20) : []
    };

    await adminDb.collection('delivery_routes').doc(id).set(newRoute);
    res.status(201).json(newRoute);
  } catch {
    res.status(500).json({ error: 'Falha ao criar rota de entrega.' });
  }
});

/**
 * DRIVER MANAGEMENT ENDPOINTS
 */
logisticsRouter.get('/drivers', async (req: Request, res: Response) => {
  try {
    const caller = req.user;
    if (!caller) {
      res.status(401).json({ error: 'Não autenticado.' });
      return;
    }

    if (caller.role === 'hq_admin') {
      const snap = await adminDb.collection('drivers').get();
      res.json(snap.docs.map((d: QueryDocumentSnapshot) => d.data()));
      return;
    }

    if (isTenantManagerRole(caller.role) && caller.tenantId) {
      const snap = await adminDb
        .collection('drivers')
        .where('tenantId', '==', caller.tenantId)
        .get();
      res.json(snap.docs.map((d: QueryDocumentSnapshot) => d.data()));
      return;
    }

    if (caller.role === 'driver') {
      const snap = await adminDb.collection('drivers').where('id', '==', caller.id).get();
      res.json(snap.docs.map((d: QueryDocumentSnapshot) => d.data()));
      return;
    }

    res.status(403).json({ error: 'Acesso negado à frota de entregadores.' });
  } catch {
    res.status(500).json({ error: 'Failed to fetch drivers.' });
  }
});

logisticsRouter.post('/drivers', async (req: Request, res: Response) => {
  const caller = req.user;
  const isHq = caller?.role === 'hq_admin';
  const isManager = isTenantManagerRole(caller?.role);

  if (!caller || (!isHq && !isManager)) {
    res.status(403).json({ error: 'Apenas HQ ou gestores de loja podem cadastrar entregadores.' });
    return;
  }

  const body = req.body;
  if (!body.name) {
    res.status(400).json({ error: 'Driver name is required.' });
    return;
  }

  const assignedTenantId = isHq
    ? String(body.tenantId || '').trim()
    : String(caller.tenantId || '').trim();

  if (!assignedTenantId) {
    res.status(400).json({ error: 'tenantId é obrigatório para cadastrar entregador.' });
    return;
  }

  const id = body.id || `drv-${Date.now().toString(36)}`;
  const newDriver: StoreDriver = {
    id,
    tenantId: assignedTenantId,
    name: String(body.name).trim(),
    phone: body.phone || '(11) 99999-8888',
    vehicleType: body.vehicleType || 'moto',
    licensePlate: body.licensePlate,
    status: body.status || 'available',
    activeDeliveriesCount: 0,
    rating: 5.0,
    completedTodayCount: 0,
    driverType: body.driverType || 'private',
    complianceVerified: true,
    lastGpsPing: new Date().toISOString()
  };

  try {
    await adminDb.collection('drivers').doc(id).set(newDriver);
    await logLogisticsAudit(
      'Novo Entregador Registrado',
      `Entregador ${newDriver.name} adicionado à frota (${assignedTenantId}).`,
      'info'
    );
    res.status(201).json(newDriver);
  } catch {
    res.status(500).json({ error: 'Failed to create driver.' });
  }
});

logisticsRouter.patch('/drivers/:id', async (req: Request, res: Response) => {
  const caller = req.user;
  if (!caller) {
    res.status(401).json({ error: 'Não autenticado.' });
    return;
  }

  const id = getParamId(req);
  try {
    const docRef = adminDb.collection('drivers').doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      res.status(404).json({ error: 'Entregador não encontrado.' });
      return;
    }
    const existing = snap.data() as StoreDriver;
    const isAllowed =
      caller.role === 'hq_admin' ||
      (isTenantManagerRole(caller.role) && caller.tenantId === existing.tenantId) ||
      (caller.role === 'driver' && caller.id === existing.id);

    if (!isAllowed) {
      res.status(403).json({ error: 'Acesso negado.' });
      return;
    }

    const updates = { ...req.body };
    delete updates.id;
    if (caller.role !== 'hq_admin') {
      delete updates.tenantId;
      delete updates.complianceVerified;
    }

    await docRef.update(updates);
    res.json({ ...existing, ...updates });
  } catch {
    res.status(500).json({ error: 'Falha ao atualizar entregador.' });
  }
});

logisticsRouter.post('/drivers/:id/ping', async (req: Request, res: Response) => {
  const caller = req.user;
  const id = getParamId(req);
  if (!caller || (caller.role !== 'hq_admin' && caller.id !== id)) {
    res.status(403).json({ error: 'Apenas o próprio entregador pode atualizar GPS.' });
    return;
  }
  try {
    const docRef = adminDb.collection('drivers').doc(id);
    const updates: Record<string, string | number> = { lastGpsPing: new Date().toISOString() };
    const lat = Number(req.body?.lat);
    const lng = Number(req.body?.lng);
    const locationName = String(req.body?.locationName || '').trim().slice(0, 120);
    const hasLat = req.body?.lat !== undefined && req.body?.lat !== null && req.body?.lat !== '';
    const hasLng = req.body?.lng !== undefined && req.body?.lng !== null && req.body?.lng !== '';
    if (hasLat && Number.isFinite(lat) && lat >= -90 && lat <= 90) updates['lat'] = lat;
    if (hasLng && Number.isFinite(lng) && lng >= -180 && lng <= 180) updates['lng'] = lng;
    if (locationName) updates['currentLocationName'] = locationName;
    await docRef.set(updates, { merge: true });
    res.json({ id, ...updates });
  } catch {
    res.status(500).json({ error: 'Falha ao registrar localização.' });
  }
});

logisticsRouter.post('/drivers/:id/clock-in', async (req: Request, res: Response) => {
  const caller = req.user;
  const id = getParamId(req);
  if (!caller || (caller.role !== 'hq_admin' && caller.id !== id)) {
    res.status(403).json({ error: 'Apenas o próprio entregador pode iniciar turno.' });
    return;
  }
  const nowIso = new Date().toISOString();
  const boundTenant =
    caller.role === 'hq_admin'
      ? String(req.body?.tenantId || 'marketplace')
      : caller.tenantId || 'marketplace';

  const driverDoc: StoreDriver = {
    id,
    tenantId: boundTenant,
    name: String(req.body?.name || caller.name || 'Entregador'),
    phone: String(req.body?.phone || ''),
    vehicleType: req.body?.vehicleType || 'moto',
    status: 'available',
    activeDeliveriesCount: 0,
    rating: 5.0,
    completedTodayCount: 0,
    driverType: boundTenant === 'marketplace' ? 'platform' : 'private',
    complianceVerified: true,
    lastGpsPing: nowIso
  };
  try {
    await adminDb.collection('drivers').doc(id).set(driverDoc, { merge: true });
    res.json(driverDoc);
  } catch {
    res.status(500).json({ error: 'Falha ao iniciar turno.' });
  }
});

/**
 * ROUTE OPERATIONS (P1.5: Strict Cross-Tenant Isolation + Atomic Order driverId Propagation)
 */
logisticsRouter.post('/routes/:id/accept', async (req: Request, res: Response) => {
  const id = getParamId(req);
  const caller = req.user;

  if (
    !caller ||
    (caller.role !== 'driver' &&
      caller.role !== 'hq_admin' &&
      !isTenantManagerRole(caller.role))
  ) {
    res.status(403).json({ error: 'Apenas entregadores ou gestores habilitados podem atribuir rotas.' });
    return;
  }

  try {
    const docRef = adminDb.collection('delivery_routes').doc(id);
    const result = await adminDb.runTransaction(async (transaction: Transaction) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) throw { status: 404, code: 'ROUTE_NOT_FOUND', message: 'Rota não encontrada.' };

      const route = doc.data() as DeliveryRoute;

      // P1.5a: Store manager MUST belong to the exact same tenant as the route
      if (isTenantManagerRole(caller.role)) {
        if (!caller.tenantId || caller.tenantId !== route.tenantId) {
          throw {
            status: 403,
            code: 'TENANT_MISMATCH',
            message: 'Acesso negado: gestor não pode aceitar/atribuir rota de outro estabelecimento.'
          };
        }
      }

      const assignedDriverId =
        caller.role === 'driver'
          ? caller.id
          : String(req.body?.driverId || '').trim();

      if (!assignedDriverId) {
        throw {
          status: 400,
          code: 'MISSING_DRIVER_ID',
          message: 'Identificador do entregador (driverId) é obrigatório para atribuição.'
        };
      }

      // Read driver profile & waypoint orders BEFORE any writes
      const driverRef = adminDb.collection('drivers').doc(assignedDriverId);
      const waypointOrderIds = (route.waypoints || [])
        .map((wp) => wp.orderId)
        .filter((oid): oid is string => Boolean(oid && oid.trim()));

      const [driverSnap, orderSnaps] = await Promise.all([
        transaction.get(driverRef),
        Promise.all(
          waypointOrderIds.map((oid) => transaction.get(adminDb.collection('orders').doc(oid)))
        )
      ]);

      const driverProfile = driverSnap.exists ? (driverSnap.data() as StoreDriver) : undefined;

      // P1.5b: Enforce private driver tenant boundary
      if (caller.role === 'driver') {
        const callerBoundTenant =
          driverProfile?.driverType === 'private'
            ? driverProfile.tenantId || caller.tenantId
            : caller.tenantId && caller.tenantId !== 'marketplace'
              ? caller.tenantId
              : undefined;

        if (callerBoundTenant && callerBoundTenant !== route.tenantId) {
          throw {
            status: 403,
            code: 'TENANT_MISMATCH',
            message: 'Entregador exclusivo vinculado a outro estabelecimento não pode aceitar esta rota.'
          };
        }
      } else if (driverProfile && driverProfile.driverType === 'private') {
        if (driverProfile.tenantId && driverProfile.tenantId !== route.tenantId) {
          throw {
            status: 403,
            code: 'DRIVER_TENANT_MISMATCH',
            message: 'Entregador selecionado pertence exclusivamente a outro estabelecimento.'
          };
        }
      }

      const currentStatus = route.status;
      const newStatus: DeliveryRoute['status'] = 'accepted';
      const allowed = ALLOWED_ROUTE_TRANSITIONS[currentStatus] || [];

      if (!allowed.includes(newStatus)) {
        throw {
          status: 409,
          code: 'ROUTE_ALREADY_TAKEN',
          message: `Transição inválida: rota já está em status ${currentStatus}.`
        };
      }

      // Validate all linked orders belong to `route.tenantId`
      for (let i = 0; i < waypointOrderIds.length; i++) {
        const ordSnap = orderSnaps[i]!;
        if (ordSnap.exists) {
          const ordData = ordSnap.data() as OrderTransaction;
          if (ordData.tenantId !== route.tenantId) {
            throw {
              status: 403,
              code: 'CROSS_TENANT_ORDER_IN_ROUTE',
              message: 'Rota contém pedido pertencente a outro estabelecimento.'
            };
          }
        }
      }

      const updates = {
        status: newStatus,
        driverId: assignedDriverId,
        driverName: driverProfile?.name || caller.name || 'Entregador'
      };

      transaction.update(docRef, updates);

      // P1.5c: Atomically propagate `driverId` onto linked waypoint orders
      for (let i = 0; i < waypointOrderIds.length; i++) {
        const ordSnap = orderSnaps[i]!;
        const oid = waypointOrderIds[i]!;
        if (ordSnap.exists) {
          const ordData = ordSnap.data() as OrderTransaction;
          const orderUpdates: Partial<OrderTransaction> = {
            driverId: assignedDriverId,
            ...(ordData.status === 'ready' || ordData.status === 'pending' || ordData.status === 'preparing'
              ? { status: 'dispatched' }
              : {})
          };
          transaction.update(adminDb.collection('orders').doc(oid), orderUpdates);
        }
      }

      return { ...route, ...updates };
    });

    res.json(result);
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string; message?: string };
    res.status(err.status || 500).json({
      error: err.message || 'Erro ao aceitar rota.',
      ...(err.code ? { code: err.code } : {})
    });
  }
});

logisticsRouter.post('/routes/:id/arrive', async (req: Request, res: Response) => {
  const id = getParamId(req);
  try {
    const docRef = adminDb.collection('delivery_routes').doc(id);
    const result = await adminDb.runTransaction(async (transaction: Transaction) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) throw { status: 404, message: 'Rota não encontrada.' };

      const route = doc.data() as DeliveryRoute;
      if (!canActOnAssignedRoute(req, route)) {
        throw { status: 403, message: 'Acesso negado a esta rota.' };
      }

      const newStatus = 'at_store';
      const allowed = ALLOWED_ROUTE_TRANSITIONS[route.status] || [];
      if (!allowed.includes(newStatus)) {
        throw { status: 400, message: 'Transição inválida.' };
      }

      transaction.update(docRef, { status: newStatus });
      return { ...route, status: newStatus };
    });
    res.json(result);
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ error: err.message || 'Erro operacional.' });
  }
});

logisticsRouter.post('/routes/:id/pickup', async (req: Request, res: Response) => {
  const id = getParamId(req);
  try {
    const docRef = adminDb.collection('delivery_routes').doc(id);
    const result = await adminDb.runTransaction(async (transaction: Transaction) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) throw { status: 404, message: 'Rota não encontrada.' };

      const route = doc.data() as DeliveryRoute;
      if (!canActOnAssignedRoute(req, route)) {
        throw { status: 403, message: 'Acesso negado a esta rota.' };
      }

      const newStatus = 'in_progress';
      const allowed = ALLOWED_ROUTE_TRANSITIONS[route.status] || [];
      if (!allowed.includes(newStatus)) {
        throw { status: 400, message: 'Transição inválida.' };
      }

      transaction.update(docRef, { status: newStatus });
      return { ...route, status: newStatus };
    });
    res.json(result);
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ error: err.message || 'Erro operacional.' });
  }
});

logisticsRouter.post(
  '/routes/:id/waypoints/:wpId/status',
  async (req: Request, res: Response) => {
    const routeId = req.params['id'] as string;
    const wpId = req.params['wpId'] as string;
    const { status } = req.body;

    try {
      const docRef = adminDb.collection('delivery_routes').doc(routeId);
      const result = await adminDb.runTransaction(async (transaction: Transaction) => {
        const doc = await transaction.get(docRef);
        if (!doc.exists) throw { status: 404, message: 'Rota não encontrada.' };

        const route = doc.data() as DeliveryRoute;
        if (!canActOnAssignedRoute(req, route)) {
          throw { status: 403, message: 'Acesso negado a esta rota.' };
        }

        const wpIndex = route.waypoints.findIndex((w) => w.id === wpId);
        if (wpIndex === -1) throw { status: 404, message: 'Parada não encontrada.' };

        const updatedWaypoints = [...route.waypoints];
        updatedWaypoints[wpIndex] = {
          ...updatedWaypoints[wpIndex]!,
          status: status as DeliveryWaypoint['status']
        };

        let newStatus = route.status;
        const allDone = updatedWaypoints.every(
          (w) => w.status === 'completed' || w.status === 'failed'
        );
        if (allDone) {
          newStatus = 'completed';
        }

        const updates = {
          waypoints: updatedWaypoints,
          status: newStatus,
          totalDeliveredCount: updatedWaypoints.filter((w) => w.status === 'completed').length
        };

        transaction.update(docRef, updates);
        return { ...route, ...updates };
      });

      res.json(result);
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      res.status(err.status || 500).json({ error: err.message || 'Erro operacional.' });
    }
  }
);
