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
import { FieldValue, Query, Transaction, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import {
  isPlatformDeliveryTenantUnavailable,
  PLATFORM_DELIVERY_NETWORK_READY
} from '../utils/platform-delivery-readiness';

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

function omitLiveLocation(driver: StoreDriver): StoreDriver {
  const profile = { ...driver };
  delete profile.lat;
  delete profile.lng;
  delete profile.gpsAccuracyMeters;
  delete profile.locationSharing;
  delete profile.gpsRouteId;
  delete profile.lastGpsPing;
  delete profile.currentLocationName;
  return profile;
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
  if (isTenantManagerRole(req.user.role) && req.user.tenantId === route.tenantId) return true;
  if (req.user.role === 'driver' && Boolean(route.driverId) &&
    (route.driverId === req.user.driverId || route.driverId === req.user.id)) {
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
      if (!PLATFORM_DELIVERY_NETWORK_READY) {
        res.status(409).json({
          error: 'A rede própria de entregadores da plataforma ainda está em breve.',
          code: 'PLATFORM_DELIVERY_NETWORK_UNAVAILABLE'
        });
        return;
      }
      if (tenantId && tenantId !== 'all' && tenantId !== 'marketplace') {
        res.status(403).json({ error: 'O HQ não consulta rotas da frota privada das lojas.', code: 'STORE_LOGISTICS_PRIVATE' });
        return;
      }
      query = query.where('tenantId', '==', 'marketplace');
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
      // Only a registered store driver receives unassigned routes. Platform pooling is not active yet.
      const driverSnap = await adminDb.collection('drivers').doc(req.user.driverId || req.user.id).get();
      const driverProfile = driverSnap.exists ? (driverSnap.data() as StoreDriver) : undefined;
      const candidateTenantId =
        driverProfile?.driverType === 'private'
          ? driverProfile.tenantId
          : undefined;
      const boundTenantId = candidateTenantId && candidateTenantId !== 'marketplace' ? candidateTenantId : undefined;

      const [availSnap, mySnap] = await Promise.all([
        boundTenantId
          ? adminDb.collection('delivery_routes').where('status', '==', 'available').where('tenantId', '==', boundTenantId).get()
          : Promise.resolve(null),
        adminDb.collection('delivery_routes').where('driverId', '==', req.user.driverId || req.user.id).get()
      ]);

      const seen = new Set<string>();
      const combined: DeliveryRoute[] = [];
      for (const docSnap of [...mySnap.docs, ...(availSnap?.docs || [])]) {
        if (!seen.has(docSnap.id)) {
          const rData = docSnap.data() as DeliveryRoute;
          if (rData.driverId !== (req.user.driverId || req.user.id) && (!boundTenantId || rData.tenantId !== boundTenantId)) {
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

    const snap = await query.limit(100).get();
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
  const isManager = isTenantManagerRole(req.user?.role);

  if (!isManager) {
    res.status(403).json({ error: 'Apenas gestores da própria loja podem despachar rotas.' });
    return;
  }

  const assignedTenantId = String(req.user?.tenantId || '').trim();
  if (!assignedTenantId) {
    res.status(400).json({ error: 'tenantId obrigatório para criar rota.' });
    return;
  }

  if (isPlatformDeliveryTenantUnavailable(assignedTenantId)) {
    res.status(409).json({
      error: 'A rede própria de entregadores da plataforma ainda está em breve.',
      code: 'PLATFORM_DELIVERY_NETWORK_UNAVAILABLE'
    });
    return;
  }

  if (body.tenantId && body.tenantId !== assignedTenantId) {
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
    if (waypoints.length < 1 || waypoints.length > 50) {
      res.status(400).json({ error: 'A rota deve conter de 1 a 50 paradas.', code: 'INVALID_ROUTE_WAYPOINTS' });
      return;
    }
    const waypointIds = new Set<string>();
    const linkedOrderIds = new Set<string>();
    for (const waypoint of waypoints) {
      const waypointId = String(waypoint.id || '').trim();
      if (!waypointId || waypointIds.has(waypointId) || !String(waypoint.customerName || '').trim() || !String(waypoint.address || '').trim()) {
        res.status(400).json({ error: 'Cada parada precisa de identificador único, cliente e endereço.', code: 'INVALID_ROUTE_WAYPOINT' });
        return;
      }
      waypointIds.add(waypointId);
      if (waypoint.orderId) {
        if (linkedOrderIds.has(waypoint.orderId)) {
          res.status(400).json({ error: 'Um pedido não pode aparecer mais de uma vez na rota.', code: 'DUPLICATE_ROUTE_ORDER' });
          return;
        }
        linkedOrderIds.add(waypoint.orderId);
      }
    }
    const rawStoreDriverAmount = body.storeDriverCompensation ?? body.totalEarnings ?? body.totalEstimatedEarnings;
    const storeDriverAmount = rawStoreDriverAmount === undefined ? 0 : Number(rawStoreDriverAmount);
    const rawDistance = body.totalDistanceKm;
    const totalDistanceKm = rawDistance === undefined || rawDistance === null || rawDistance === ''
      ? 0
      : Number(rawDistance);
    const estimatedDuration = typeof body.estimatedDuration === 'string'
      ? body.estimatedDuration.trim().slice(0, 50)
      : '';
    const timeWindow = typeof body.timeWindow === 'string'
      ? body.timeWindow.trim().slice(0, 50)
      : '';

    if (linkedOrderIds.size === 0 && (!Number.isFinite(storeDriverAmount) || storeDriverAmount < 0)) {
      res.status(400).json({ error: 'O valor combinado com o entregador deve ser um número igual ou maior que zero.' });
      return;
    }
    if (!Number.isFinite(totalDistanceKm) || totalDistanceKm < 0) {
      res.status(400).json({ error: 'A distância informada deve ser um número igual ou maior que zero.', code: 'INVALID_ROUTE_DISTANCE' });
      return;
    }

    // Validate linked orders before making a route available to the tenant's drivers.
    let customerDeliveryFeesTotal = 0;
    let storeDeliveryContributionTotal = 0;
    let orderDriverCompensationTotal = 0;
    for (const orderId of linkedOrderIds) {
        const ordDoc = await adminDb.collection('orders').doc(orderId).get();
        if (!ordDoc.exists) {
          res.status(400).json({ error: `Pedido vinculado [${orderId}] não encontrado.` });
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
        if (ordData.type !== 'delivery' || ['completed', 'cancelled', 'delivered'].includes(ordData.status) || ordData.driverId) {
          res.status(409).json({ error: 'O pedido não está disponível para uma nova rota.', code: 'ORDER_NOT_ROUTABLE' });
          return;
        }
        const customerFee = typeof ordData.deliveryFee === 'number' && Number.isFinite(ordData.deliveryFee) && ordData.deliveryFee >= 0
          ? ordData.deliveryFee
          : 0;
        const storeContribution = typeof ordData.storeDeliveryContribution === 'number' && Number.isFinite(ordData.storeDeliveryContribution) && ordData.storeDeliveryContribution >= 0
          ? ordData.storeDeliveryContribution
          : 0;
        customerDeliveryFeesTotal += customerFee;
        storeDeliveryContributionTotal += storeContribution;
        orderDriverCompensationTotal += typeof ordData.driverCompensation === 'number' && Number.isFinite(ordData.driverCompensation) && ordData.driverCompensation >= 0
          ? ordData.driverCompensation
          : customerFee + storeContribution;
    }

    if (linkedOrderIds.size > 0) {
      const existingRoutes = await adminDb.collection('delivery_routes')
        .where('tenantId', '==', assignedTenantId)
        .get();
      const alreadyRouted = existingRoutes.docs.some((routeDoc) => {
        const route = routeDoc.data() as DeliveryRoute;
        return route.status !== 'completed' && route.waypoints.some((waypoint) =>
          waypoint.orderId && linkedOrderIds.has(waypoint.orderId)
        );
      });
      if (alreadyRouted) {
        res.status(409).json({ error: 'Um ou mais pedidos já pertencem a uma rota ativa.', code: 'ORDER_ALREADY_ROUTED' });
        return;
      }
    }

    const id = `rt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    const nowIso = new Date().toISOString();
    const totalRouteCompensation = linkedOrderIds.size > 0
      ? Number(orderDriverCompensationTotal.toFixed(2))
      : storeDriverAmount;
    const newRoute: DeliveryRoute = {
      id,
      routeCode: String(body.routeCode || `RT-${Math.floor(1000 + Math.random() * 9000)}`),
      tenantId: assignedTenantId,
      date: nowIso,
      timeWindow: timeWindow || 'Sem janela definida',
      totalDistanceKm,
      estimatedDuration: estimatedDuration || 'Não informado',
      // Store-defined route amount only; this is not a payment record.
      totalEarnings: totalRouteCompensation,
      ...(linkedOrderIds.size > 0 ? {
        customerDeliveryFeesTotal: Number(customerDeliveryFeesTotal.toFixed(2)),
        storeDeliveryContributionTotal: Number(storeDeliveryContributionTotal.toFixed(2))
      } : {}),
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
      if (!PLATFORM_DELIVERY_NETWORK_READY) {
        res.status(409).json({
          error: 'A rede própria de entregadores da plataforma ainda está em breve.',
          code: 'PLATFORM_DELIVERY_NETWORK_UNAVAILABLE'
        });
        return;
      }
      const snap = await adminDb.collection('drivers').where('driverType', '==', 'platform').limit(100).get();
      res.json(snap.docs.map((d: QueryDocumentSnapshot) => omitLiveLocation({ ...d.data(), id: d.id } as StoreDriver)));
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
      const driverId = caller.driverId || caller.id;
      const driverDoc = await adminDb.collection('drivers').doc(driverId).get();
      if (driverDoc.exists) {
        res.json([{ ...driverDoc.data(), id: driverDoc.id }]);
        return;
      }
      const snap = await adminDb.collection('drivers').where('userUid', '==', caller.id).limit(1).get();
      res.json(snap.docs.map((d: QueryDocumentSnapshot) => ({ ...d.data(), id: d.id })));
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
    res.status(403).json({ error: 'Apenas gestores da própria loja ou o HQ para a rede própria podem cadastrar entregadores.' });
    return;
  }

  const body = req.body;
  if (typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.trim().length > 100) {
    res.status(400).json({ error: 'Driver name is required.' });
    return;
  }

  if (isHq && body.driverType !== 'platform') {
    res.status(403).json({ error: 'O HQ só pode administrar a frota própria da plataforma.', code: 'HQ_STORE_FLEET_FORBIDDEN' });
    return;
  }
  const assignedTenantId = isHq ? 'marketplace' : String(caller.tenantId || '').trim();
  const driverType: StoreDriver['driverType'] = isHq ? 'platform' : 'private';

  if (!PLATFORM_DELIVERY_NETWORK_READY && (driverType === 'platform' || isPlatformDeliveryTenantUnavailable(assignedTenantId))) {
    res.status(409).json({
      error: 'A rede própria de entregadores da plataforma ainda está em breve.',
      code: 'PLATFORM_DELIVERY_NETWORK_UNAVAILABLE'
    });
    return;
  }

  if (!assignedTenantId) {
    res.status(400).json({ error: 'tenantId é obrigatório para cadastrar entregador.' });
    return;
  }
  if (driverType === 'platform' && assignedTenantId !== 'marketplace') {
    res.status(400).json({ error: 'Entregadores da plataforma devem pertencer à frota marketplace.' });
    return;
  }
  const vehicleType = body.vehicleType || 'moto';
  if (!['moto', 'bike', 'carro'].includes(vehicleType)) {
    res.status(400).json({ error: 'Tipo de veículo inválido.', code: 'INVALID_VEHICLE_TYPE' });
    return;
  }

  const driverRef = adminDb.collection('drivers').doc();
  const id = driverRef.id;
  const newDriver: StoreDriver = {
    id,
    tenantId: assignedTenantId,
    name: String(body.name).trim(),
    phone: typeof body.phone === 'string' ? body.phone.trim().slice(0, 32) : '',
    vehicleType,
    licensePlate: typeof body.licensePlate === 'string' ? body.licensePlate.trim().slice(0, 12) : undefined,
    status: 'available',
    activeDeliveriesCount: 0,
    rating: 5.0,
    completedTodayCount: 0,
    driverType,
    complianceVerified: false
  };

  try {
    await driverRef.create(newDriver);
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
    if (caller.role === 'hq_admin' && existing.driverType !== 'platform') {
      res.status(403).json({ error: 'O HQ não altera cadastros da frota privada das lojas.', code: 'HQ_STORE_FLEET_FORBIDDEN' });
      return;
    }
    if (caller.role === 'hq_admin' && !PLATFORM_DELIVERY_NETWORK_READY) {
      res.status(409).json({
        error: 'A rede própria de entregadores da plataforma ainda está em breve.',
        code: 'PLATFORM_DELIVERY_NETWORK_UNAVAILABLE'
      });
      return;
    }
    const isAllowed =
      (caller.role === 'hq_admin' && existing.driverType === 'platform') ||
      (isTenantManagerRole(caller.role) && caller.tenantId === existing.tenantId) ||
      (caller.role === 'driver' && (caller.driverId === existing.id || caller.id === existing.id));

    if (!isAllowed) {
      res.status(403).json({ error: 'Acesso negado.' });
      return;
    }

    const updates = { ...req.body };
    delete updates.id;
    delete updates.userUid;
    delete updates.lat;
    delete updates.lng;
    delete updates.gpsAccuracyMeters;
    delete updates.locationSharing;
    delete updates.gpsRouteId;
    delete updates.lastGpsPing;
    delete updates.currentLocationName;
    if (caller.role !== 'hq_admin') {
      delete updates.tenantId;
      delete updates.complianceVerified;
      delete updates.driverType;
    } else {
      const nextTenantId = typeof updates.tenantId === 'string' ? updates.tenantId : existing.tenantId;
      const nextDriverType = updates.driverType === 'platform' || updates.driverType === 'private'
        ? updates.driverType
        : existing.driverType;
      if ((nextDriverType === 'platform') !== (nextTenantId === 'marketplace')) {
        res.status(400).json({ error: 'Entregadores da plataforma devem pertencer à frota marketplace.' });
        return;
      }
      const requestsPlatformFleet =
        (updates.driverType === 'platform' && existing.driverType !== 'platform') ||
        (updates.tenantId === 'marketplace' && existing.tenantId !== 'marketplace');
      if (!PLATFORM_DELIVERY_NETWORK_READY && (requestsPlatformFleet || isPlatformDeliveryTenantUnavailable(nextTenantId))) {
        res.status(409).json({
          error: 'A rede própria de entregadores da plataforma ainda está em breve.',
          code: 'PLATFORM_DELIVERY_NETWORK_UNAVAILABLE'
        });
        return;
      }
      if (nextDriverType === 'platform' && nextTenantId !== 'marketplace') {
        res.status(400).json({ error: 'Entregadores da plataforma devem pertencer à frota marketplace.' });
        return;
      }
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
  if (!caller || caller.role !== 'driver' || (caller.driverId !== id && caller.id !== id)) {
    res.status(403).json({ error: 'Apenas o próprio entregador pode atualizar GPS.' });
    return;
  }
  try {
    const docRef = adminDb.collection('drivers').doc(id);
    const driverSnap = await docRef.get();
    if (!driverSnap.exists) {
      res.status(404).json({ error: 'Entregador não encontrado.' });
      return;
    }
    const driver = driverSnap.data() as StoreDriver;
    if (driver.driverType !== 'private' || !driver.tenantId || driver.tenantId === 'marketplace') {
      res.status(403).json({ error: 'GPS disponível somente para entregadores próprios de uma loja.' });
      return;
    }
    if ((driver.userUid && driver.userUid !== caller.id) || (!driver.userUid && driver.id !== caller.id)) {
      res.status(403).json({ error: 'A conta autenticada não está vinculada a este cadastro de entregador.' });
      return;
    }

    if (req.body?.sharing !== true) {
      await docRef.update({
        locationSharing: false,
        gpsRouteId: FieldValue.delete(),
        lat: FieldValue.delete(),
        lng: FieldValue.delete(),
        gpsAccuracyMeters: FieldValue.delete(),
        lastGpsPing: FieldValue.delete(),
        currentLocationName: FieldValue.delete()
      });
      res.json({ id, locationSharing: false });
      return;
    }

    const routeId = typeof req.body?.routeId === 'string' ? req.body.routeId.trim() : '';
    const lat = req.body?.lat;
    const lng = req.body?.lng;
    const accuracyMeters = req.body?.accuracyMeters;
    if (!routeId || typeof lat !== 'number' || !Number.isFinite(lat) || lat < -90 || lat > 90 ||
      typeof lng !== 'number' || !Number.isFinite(lng) || lng < -180 || lng > 180 ||
      (accuracyMeters !== undefined && (typeof accuracyMeters !== 'number' || !Number.isFinite(accuracyMeters) || accuracyMeters < 0 || accuracyMeters > 10000))) {
      res.status(400).json({ error: 'Coordenadas, precisão e rota ativa inválidas.' });
      return;
    }

    const routeSnap = await adminDb.collection('delivery_routes').doc(routeId).get();
    if (!routeSnap.exists) {
      res.status(404).json({ error: 'Rota não encontrada.' });
      return;
    }
    const route = routeSnap.data() as DeliveryRoute;
    if (route.status !== 'in_progress' || route.driverId !== id || route.tenantId !== driver.tenantId ||
      isPlatformDeliveryTenantUnavailable(route.tenantId)) {
      res.status(403).json({ error: 'GPS permitido somente durante rota ativa atribuída ao entregador da mesma loja.' });
      return;
    }

    const updates = {
      locationSharing: true,
      gpsRouteId: route.id,
      lat,
      lng,
      ...(accuracyMeters === undefined ? {} : { gpsAccuracyMeters: accuracyMeters }),
      lastGpsPing: new Date().toISOString()
    };
    await docRef.update(updates);
    res.json({ id, ...updates });
  } catch {
    res.status(500).json({ error: 'Falha ao registrar localização.' });
  }
});

logisticsRouter.post('/drivers/:id/clock-in', async (req: Request, res: Response) => {
  const caller = req.user;
  const id = getParamId(req);
  if (!caller || caller.role !== 'driver' || (caller.driverId || caller.id) !== id) {
    res.status(403).json({ error: 'Apenas o próprio entregador pode iniciar turno.' });
    return;
  }
  const boundTenant = caller.tenantId || 'marketplace';

  if (boundTenant === 'marketplace') {
    res.status(403).json({ error: 'A rede própria de entregadores da plataforma ainda está em breve.' });
    return;
  }

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
    complianceVerified: false
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
          ? (caller.driverId || caller.id)
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

      if (
        !PLATFORM_DELIVERY_NETWORK_READY &&
        (driverProfile?.driverType === 'platform' || driverProfile?.tenantId === 'marketplace' || route.tenantId === 'marketplace')
      ) {
        throw {
          status: 409,
          code: 'PLATFORM_DELIVERY_NETWORK_UNAVAILABLE',
          message: 'A rede própria de entregadores da plataforma ainda está em breve.'
        };
      }

      // Current driver app serves registered store drivers only; platform pooling is still coming soon.
      if (caller.role === 'driver') {
        if (!driverProfile || driverProfile.driverType !== 'private' || !driverProfile.tenantId) {
          throw {
            status: 403,
            code: 'STORE_DRIVER_REQUIRED',
            message: 'O app está disponível para motoristas cadastrados e vinculados a uma loja.'
          };
        }
        if (driverProfile.tenantId !== route.tenantId) {
          throw {
            status: 403,
            code: 'TENANT_MISMATCH',
            message: 'Entregador exclusivo vinculado a outro estabelecimento não pode aceitar esta rota.'
          };
        }
        if ((driverProfile.userUid && driverProfile.userUid !== caller.id) || (!driverProfile.userUid && driverProfile.id !== caller.id)) {
          throw { status: 403, code: 'DRIVER_ACCOUNT_MISMATCH', message: 'A conta autenticada não corresponde ao cadastro do entregador.' };
        }
      } else if (isTenantManagerRole(caller.role)) {
        if (!driverProfile || driverProfile.driverType !== 'private' || driverProfile.tenantId !== route.tenantId) {
          throw {
            status: 403,
            code: 'DRIVER_TENANT_MISMATCH',
            message: 'Gestores só podem atribuir rotas a motoristas vinculados à própria loja.'
          };
        }
        if (!driverProfile.userUid) {
          throw { status: 409, code: 'DRIVER_ACCOUNT_REQUIRED', message: 'Vincule uma conta autenticada ao entregador antes de atribuir a rota.' };
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
      if (isPlatformDeliveryTenantUnavailable(route.tenantId)) {
        throw {
          status: 409,
          code: 'PLATFORM_DELIVERY_NETWORK_UNAVAILABLE',
          message: 'A rede própria de entregadores da plataforma ainda está em breve.'
        };
      }
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
      if (isPlatformDeliveryTenantUnavailable(route.tenantId)) {
        throw {
          status: 409,
          code: 'PLATFORM_DELIVERY_NETWORK_UNAVAILABLE',
          message: 'A rede própria de entregadores da plataforma ainda está em breve.'
        };
      }
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
        if (isPlatformDeliveryTenantUnavailable(route.tenantId)) {
          throw {
            status: 409,
            code: 'PLATFORM_DELIVERY_NETWORK_UNAVAILABLE',
            message: 'A rede própria de entregadores da plataforma ainda está em breve.'
          };
        }
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

        const driverRef = route.driverId ? adminDb.collection('drivers').doc(route.driverId) : null;
        const driverDoc = driverRef && newStatus === 'completed' ? await transaction.get(driverRef) : null;

        const updates = {
          waypoints: updatedWaypoints,
          status: newStatus,
          totalDeliveredCount: updatedWaypoints.filter((w) => w.status === 'completed').length
        };

        transaction.update(docRef, updates);
        if (driverRef && driverDoc?.exists && driverDoc.get('gpsRouteId') === route.id) {
          transaction.update(driverRef, {
            locationSharing: false,
            gpsRouteId: FieldValue.delete(),
            lat: FieldValue.delete(),
            lng: FieldValue.delete(),
            gpsAccuracyMeters: FieldValue.delete(),
            lastGpsPing: FieldValue.delete(),
            currentLocationName: FieldValue.delete()
          });
        }
        return { ...route, ...updates };
      });

      res.json(result);
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      res.status(err.status || 500).json({ error: err.message || 'Erro operacional.' });
    }
  }
);
