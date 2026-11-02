import { Router, Request, Response } from 'express';
import {
  CompanyTenant,
  POSDevice,
  AuditLog,
  OrderTransaction,
  ProductItem,
  SystemAuditReport,
  LicensePlan,
  RegionalMarketplaceConfig,
  StoreDriver
} from '../../shared/models/ecosystem.model';
import {
  requireHqAdmin
} from '../middleware/auth.middleware';
import { adminDb } from '../firebase-admin';
import { Query, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { isValidCnpj } from '../utils/cnpj';
import { DEFAULT_DEVICE_LIMITS } from '../utils/plan-limits';
import { resolvePlatformDeliveryCommissionStatus } from '../utils/platform-delivery-readiness';

export const hqRouter = Router();

class DeviceRegistrationError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

interface GlobalHqSettings {
  maintenanceMode: boolean;
  globalBroadcastMessage: string | null;
  platformCommissionRate: number;
  platformDeliveryCommissionStatus: 'coming_soon' | 'active';
  updatedAt: string;
}

const DEFAULT_HQ_SETTINGS: GlobalHqSettings = {
  maintenanceMode: false,
  globalBroadcastMessage: null,
  platformCommissionRate: 0.08,
  platformDeliveryCommissionStatus: 'coming_soon',
  updatedAt: new Date().toISOString()
};

function isRealEligibleOrder(order: OrderTransaction): boolean {
  return order.isSimulated === false && order.mode !== 'simulation' && order.status !== 'cancelled' &&
    (order.paymentStatus === 'approved' || order.status === 'completed') &&
    Number.isFinite(order.total) && order.total >= 0;
}

function isPlatformNetworkDriver(driver: StoreDriver): boolean {
  return driver.driverType === 'platform' && driver.tenantId === 'marketplace';
}

function isCompletedPlatformDelivery(
  order: OrderTransaction,
  platformDriverIds: ReadonlySet<string>
): boolean {
  return isRealEligibleOrder(order) && order.type === 'delivery' && order.status === 'delivered' &&
    order.paymentStatus === 'approved' && Boolean(order.driverId && platformDriverIds.has(order.driverId));
}

function sumOrderTotals(orders: OrderTransaction[]): number {
  return Number(orders.reduce((sum, order) => sum + order.total, 0).toFixed(2));
}

const DEFAULT_SAAS_PLANS: LicensePlan[] = [
  {
    id: 'Starter',
    name: 'Starter (Iniciante)',
    priceMonthly: 149.0,
    maxDevices: DEFAULT_DEVICE_LIMITS.Starter,
    includedModules: ['PDV Caixa'],
    description: 'Ideal para pequenos comércios.'
  },
  {
    id: 'Professional',
    name: 'Professional (Avançado)',
    priceMonthly: 299.0,
    maxDevices: DEFAULT_DEVICE_LIMITS.Professional,
    includedModules: ['Full ERP'],
    description: 'Perfeito para restaurantes.'
  },
  {
    id: 'Enterprise',
    name: 'Enterprise (Corporativo)',
    priceMonthly: 599.0,
    maxDevices: DEFAULT_DEVICE_LIMITS.Enterprise,
    includedModules: ['MDM Supremo'],
    description: 'Para redes de lojas.'
  }
];

function getParamId(req: Request): string {
  const p = req.params['id'];
  return Array.isArray(p) ? p[0] : (p || '');
}

async function getHqSettings(): Promise<GlobalHqSettings> {
  const doc = await adminDb.collection('hq_settings').doc('global').get();
  if (doc.exists) {
    const saved = doc.data() as Partial<GlobalHqSettings>;
    return {
      ...DEFAULT_HQ_SETTINGS,
      ...saved,
      platformDeliveryCommissionStatus: resolvePlatformDeliveryCommissionStatus(saved.platformDeliveryCommissionStatus)
    };
  }
  return { ...DEFAULT_HQ_SETTINGS, updatedAt: new Date().toISOString() };
}

async function logHqAudit(
  action: string,
  details: string,
  severity: AuditLog['severity'] = 'info',
  user = 'Dono do App (HQ)'
) {
  const id = `aud-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const audit: AuditLog = {
    id,
    timestamp: new Date().toISOString(),
    user,
    action,
    module: 'HQ',
    details,
    severity
  };
  try {
    await adminDb.collection('audit_logs').doc(id).set(audit);
  } catch {
    // Non-blocking audit write
  }
}

// GET /api/hq/overview - Complete executive overview for HQ Central
hqRouter.get('/overview', requireHqAdmin, async (_req: Request, res: Response) => {
  try {
    const [tenantsSnap, devicesSnap, ordersSnap, settings] = await Promise.all([
      adminDb.collection('tenants').get(),
      adminDb.collection('devices').get(),
      adminDb.collection('orders').get(),
      getHqSettings()
    ]);

    const tenants = tenantsSnap.docs.map((d: QueryDocumentSnapshot) => d.data() as CompanyTenant);
    const devices = devicesSnap.docs.map((d: QueryDocumentSnapshot) => d.data() as POSDevice);
    const orders = ordersSnap.docs.map((d: QueryDocumentSnapshot) => d.data() as OrderTransaction);

    const realOrders = orders.filter(isRealEligibleOrder);
    const grossVolume = sumOrderTotals(realOrders);
    let platformDeliveryOrdersCount: number | null = null;
    let platformDeliveryGrossVolume: number | null = null;
    let estimatedCommissionRevenue: number | null = null;
    let defaultCommissionPercent: number | null = null;
    if (settings.platformDeliveryCommissionStatus === 'active') {
      const platformDriversSnap = await adminDb.collection('drivers').where('driverType', '==', 'platform').get();
      const platformDriverIds = new Set(platformDriversSnap.docs
        .filter((driver) => isPlatformNetworkDriver(driver.data() as StoreDriver))
        .map((driver) => driver.id));
      const completedPlatformDeliveries = realOrders.filter((order) =>
        isCompletedPlatformDelivery(order, platformDriverIds)
      );
      platformDeliveryOrdersCount = completedPlatformDeliveries.length;
      platformDeliveryGrossVolume = sumOrderTotals(completedPlatformDeliveries);
      estimatedCommissionRevenue = Number((platformDeliveryGrossVolume * settings.platformCommissionRate).toFixed(2));
      defaultCommissionPercent = Number((settings.platformCommissionRate * 100).toFixed(2));
    }

    res.json({
      tenantsCount: tenants.length,
      activeTenantsCount: tenants.filter((t: CompanyTenant) => t.status === 'active').length,
      totalDevices: devices.length,
      deviceRecordsMarkedOnline: devices.filter((d: POSDevice) => d.status === 'online').length,
      totalOrders: realOrders.length,
      grossPlatformVolume: grossVolume,
      platformDeliveryCommissionStatus: settings.platformDeliveryCommissionStatus,
      platformDeliveryOrdersCount,
      platformDeliveryGrossVolume,
      estimatedCommissionRevenue,
      defaultCommissionPercent,
      maintenanceMode: settings.maintenanceMode,
      globalBroadcastMessage: settings.globalBroadcastMessage,
      serverUptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch overview data.' });
  }
});

// GET /api/hq/tenants/:id/metrics - Historical eligible order metrics for one tenant
hqRouter.get('/tenants/:id/metrics', requireHqAdmin, async (req: Request, res: Response) => {
  const tenantId = getParamId(req);
  try {
    const tenantSnap = await adminDb.collection('tenants').doc(tenantId).get();
    if (!tenantSnap.exists) {
      res.status(404).json({ error: 'Tenant não encontrado.', code: 'TENANT_NOT_FOUND' });
      return;
    }

    const ordersSnap = await adminDb.collection('orders').where('tenantId', '==', tenantId).get();
    const eligibleOrders = ordersSnap.docs
      .map((document) => document.data() as OrderTransaction)
      .filter(isRealEligibleOrder);

    res.json({
      tenantId,
      eligibleOrderCount: eligibleOrders.length,
      eligibleOrderVolume: sumOrderTotals(eligibleOrders),
      capturedAt: new Date().toISOString()
    });
  } catch {
    res.status(500).json({ error: 'Não foi possível carregar o resumo de pedidos desta loja.' });
  }
});

// GET /api/hq/public-status - Store OS broadcast and maintenance flag only
hqRouter.get('/public-status', async (_req: Request, res: Response) => {
  try {
    const settings = await getHqSettings();
    res.json({
      maintenanceMode: settings.maintenanceMode,
      globalBroadcastMessage: settings.globalBroadcastMessage
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch public HQ status.' });
  }
});

// POST /api/hq/system/broadcast - Persist global broadcast in private /hq_settings/global
hqRouter.post('/system/broadcast', requireHqAdmin, async (req: Request, res: Response) => {
  const rawMessage = req.body?.message;
  if (rawMessage !== null && rawMessage !== undefined && typeof rawMessage !== 'string') {
    res.status(400).json({ error: 'A mensagem deve ser texto ou null.', code: 'INVALID_BROADCAST' });
    return;
  }
  const message = typeof rawMessage === 'string' ? rawMessage.trim().slice(0, 500) || null : null;
  try {
    const current = await getHqSettings();
    const updated: GlobalHqSettings = {
      ...current,
      globalBroadcastMessage: message,
      updatedAt: new Date().toISOString()
    };
    await adminDb.collection('hq_settings').doc('global').set(updated, { merge: true });
    await logHqAudit(
      'Comunicado Global HQ',
      message ? `Broadcast emitido: "${message}"` : 'Broadcast encerrado.',
      'info'
    );
    res.json({ globalBroadcastMessage: message });
  } catch {
    res.status(500).json({ error: 'Failed to update broadcast.' });
  }
});

// POST /api/hq/system/maintenance - Toggle maintenance mode in private /hq_settings/global
hqRouter.post('/system/maintenance', requireHqAdmin, async (req: Request, res: Response) => {
  if (typeof req.body?.enabled !== 'boolean') {
    res.status(400).json({ error: 'O campo enabled deve ser booleano.', code: 'INVALID_MAINTENANCE_FLAG' });
    return;
  }
  const enabled = req.body.enabled;
  try {
    const current = await getHqSettings();
    const updated: GlobalHqSettings = {
      ...current,
      maintenanceMode: enabled,
      updatedAt: new Date().toISOString()
    };
    await adminDb.collection('hq_settings').doc('global').set(updated, { merge: true });
    await logHqAudit(
      'Modo de Manutenção',
      `Modo de manutenção alterado para ${enabled ? 'ATIVO' : 'INATIVO'}.`,
      enabled ? 'warning' : 'info'
    );
    res.json({ maintenanceMode: enabled });
  } catch {
    res.status(500).json({ error: 'Failed to toggle maintenance mode.' });
  }
});

// POST /api/hq/system/commission - Update the platform courier delivery commission rate
hqRouter.post('/system/commission', requireHqAdmin, async (req: Request, res: Response) => {
  const percent = Number(req.body?.percent);
  if (isNaN(percent) || percent < 0 || percent > 50) {
    res.status(400).json({ error: 'Percentual de comissão deve estar entre 0% e 50%.' });
    return;
  }
  try {
    const current = await getHqSettings();
    const updated: GlobalHqSettings = {
      ...current,
      platformCommissionRate: Number((percent / 100).toFixed(4)),
      updatedAt: new Date().toISOString()
    };
    await adminDb.collection('hq_settings').doc('global').set(updated, { merge: true });
    await logHqAudit('Comissão da Rede de Entregadores', `Taxa de comissão da rede ajustada para ${percent}%.`, 'info');
    res.json({ defaultCommissionPercent: percent });
  } catch {
    res.status(500).json({ error: 'Failed to update commission rate.' });
  }
});

// POST /api/hq/system/platform-delivery-commission - Keep future commission disabled until readiness work is complete
hqRouter.post('/system/platform-delivery-commission', requireHqAdmin, async (req: Request, res: Response) => {
  if (req.body?.status !== 'coming_soon') {
    res.status(req.body?.status === 'active' ? 409 : 400).json({
      error: req.body?.status === 'active'
        ? 'A ativação depende da rede própria de entregadores e da inteligência operacional; ainda não está disponível.'
        : 'O status permitido nesta configuração é coming_soon.',
      code: req.body?.status === 'active' ? 'COMMISSION_ACTIVATION_UNAVAILABLE' : 'INVALID_COMMISSION_STATUS'
    });
    return;
  }

  try {
    const current = await getHqSettings();
    const updated: GlobalHqSettings = {
      ...current,
      platformDeliveryCommissionStatus: 'coming_soon',
      updatedAt: new Date().toISOString()
    };
    await adminDb.collection('hq_settings').doc('global').set(updated, { merge: true });
    await logHqAudit(
      'Comissão da Rede de Entregadores',
      'Status mantido como Em breve; cálculos de comissão da plataforma permanecem desativados.',
      'info'
    );
    res.json({ platformDeliveryCommissionStatus: 'coming_soon' });
  } catch {
    res.status(500).json({ error: 'Falha ao manter a comissão da plataforma em breve.' });
  }
});

// GET /api/hq/devices
hqRouter.get('/devices', requireHqAdmin, async (req: Request, res: Response) => {
  const tenantId = req.query['tenantId'] as string | undefined;
  try {
    let query: Query = adminDb.collection('devices');
    if (tenantId && tenantId !== 'all') {
      query = query.where('tenantId', '==', tenantId);
    }
    const snap = await query.get();
    res.json(snap.docs.map((d: QueryDocumentSnapshot) => d.data()));
  } catch {
    res.status(500).json({ error: 'Failed to fetch devices.' });
  }
});

// POST /api/hq/devices
hqRouter.post('/devices', requireHqAdmin, async (req: Request, res: Response) => {
  const body = (req.body || {}) as Record<string, unknown>;
  const tenantId = typeof body['tenantId'] === 'string' ? body['tenantId'].trim() : '';
  const deviceName = typeof body['deviceName'] === 'string' ? body['deviceName'].trim().slice(0, 100) : '';
  const serialNumber = typeof body['serialNumber'] === 'string' ? body['serialNumber'].trim().slice(0, 100) : '';
  if (!deviceName || !serialNumber || !tenantId) {
    res.status(400).json({ error: 'deviceName, serialNumber, and tenantId are required.' });
    return;
  }

  const deviceRef = adminDb.collection('devices').doc();
  const id = deviceRef.id;
  try {
    const createdDevice = await adminDb.runTransaction<POSDevice>(async (transaction) => {
      let tenantName = 'HQ Central (Infraestrutura)';
      let tenant: CompanyTenant | null = null;
      if (tenantId !== 'hq') {
        const tenantSnap = await transaction.get(adminDb.collection('tenants').doc(tenantId));
        if (!tenantSnap.exists) {
          throw new DeviceRegistrationError(404, 'TENANT_NOT_FOUND', 'Tenant de destino não encontrado.');
        }
        tenant = tenantSnap.data() as CompanyTenant;
        tenantName = tenant.name;
      }

      const duplicateSerial = await transaction.get(
        adminDb.collection('devices').where('serialNumber', '==', serialNumber)
      );
      if (!duplicateSerial.empty) {
        throw new DeviceRegistrationError(409, 'DEVICE_SERIAL_EXISTS', 'Este serial já está registrado no inventário.');
      }

      if (tenant) {
        const tenantDevices = await transaction.get(
          adminDb.collection('devices').where('tenantId', '==', tenantId)
        );
        if (!Number.isInteger(tenant.devicesLimit) || tenant.devicesLimit < 1 || tenant.devicesLimit > 999) {
          throw new DeviceRegistrationError(409, 'INVALID_TENANT_DEVICE_QUOTA', 'A cota de dispositivos desta loja está inválida. Corrija a cota na governança do tenant.');
        }
        if (tenantDevices.size >= tenant.devicesLimit) {
          throw new DeviceRegistrationError(
            409,
            'DEVICE_QUOTA_REACHED',
            `A loja já possui ${tenantDevices.size} registro(s) de dispositivo para uma cota de ${tenant.devicesLimit}. Aumente a cota na governança do tenant para continuar.`
          );
        }

        const inventoryVersion = typeof tenant.deviceInventoryVersion === 'number' && Number.isInteger(tenant.deviceInventoryVersion)
          ? tenant.deviceInventoryVersion
          : 0;
        // Writing the tenant document serializes competing registrations for the same quota.
        transaction.update(adminDb.collection('tenants').doc(tenantId), {
          deviceInventoryVersion: inventoryVersion + 1
        });
      }

      const newDevice: POSDevice = {
        id,
        tenantId,
        tenantName,
        deviceName,
        type: body['type'] === 'tablet' || body['type'] === 'mobile' || body['type'] === 'kiosk' ? body['type'] : 'terminal',
        serialNumber,
        status: 'unverified',
        ...(typeof body['location'] === 'string' && body['location'].trim() ? { location: body['location'].trim().slice(0, 120) } : {})
      };
      transaction.create(deviceRef, newDevice);
      return newDevice;
    });
    await logHqAudit(
      'Dispositivo Registrado',
      `Dispositivo [${createdDevice.deviceName}] (${createdDevice.serialNumber}) registrado no inventário de ${createdDevice.tenantName}; conexão física não verificada.`,
      'info'
    );
    res.status(201).json(createdDevice);
  } catch (error) {
    if (error instanceof DeviceRegistrationError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: 'Failed to pair device.' });
  }
});

// POST /api/hq/devices/:id/lock
hqRouter.post('/devices/:id/lock', requireHqAdmin, async (req: Request, res: Response) => {
  const id = getParamId(req);
  try {
    const docRef = adminDb.collection('devices').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      res.status(404).json({ error: 'Device not found.' });
      return;
    }

    const dev = doc.data() as POSDevice;
    const newStatus = dev.status === 'locked' ? 'unverified' : 'locked';
    await docRef.update({ status: newStatus });
    await logHqAudit(
      'Status de Dispositivo Alterado',
      `Registro de ${dev.deviceName} (${dev.serialNumber}) alterado para [${newStatus.toUpperCase()}]. Nenhum comando remoto foi enviado.`,
      newStatus === 'locked' ? 'warning' : 'info'
    );
    res.json({ ...dev, status: newStatus });
  } catch {
    res.status(500).json({ error: 'Failed to lock/unlock device.' });
  }
});

// POST /api/hq/devices/:id/restart
hqRouter.post('/devices/:id/restart', requireHqAdmin, async (req: Request, res: Response) => {
  const id = getParamId(req);
  try {
    const docRef = adminDb.collection('devices').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      res.status(404).json({ error: 'Device not found.' });
      return;
    }

    const dev = doc.data() as POSDevice;
    await logHqAudit(
      'Solicitação de Atualização MDM',
      `Solicitação registrada para ${dev.deviceName} (${dev.serialNumber}); nenhum comando foi enviado a um agente físico.`,
      'warning'
    );
    res.json({
      message: `Solicitação registrada para ${dev.deviceName}; nenhum dispositivo foi reiniciado.`,
      status: dev.status
    });
  } catch {
    res.status(500).json({ error: 'Failed to restart device.' });
  }
});

// GET /api/hq/audit
hqRouter.get('/audit', requireHqAdmin, async (req: Request, res: Response) => {
  const severity = req.query['severity'] as AuditLog['severity'] | undefined;
  try {
    let query: Query = adminDb.collection('audit_logs');
    if (severity) {
      query = query.where('severity', '==', severity);
    }
    const snap = await query.orderBy('timestamp', 'desc').limit(200).get();
    res.json(snap.docs.map((d: QueryDocumentSnapshot) => d.data()));
  } catch {
    res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});

// POST /api/hq/audit/run
hqRouter.post('/audit/run', requireHqAdmin, async (_req: Request, res: Response) => {
  try {
    const [tenantsSnap, productsSnap, ordersSnap, devicesSnap] = await Promise.all([
      adminDb.collection('tenants').get(),
      adminDb.collection('products').get(),
      adminDb.collection('orders').get(),
      adminDb.collection('devices').get()
    ]);

    const tenants = tenantsSnap.docs.map((d: QueryDocumentSnapshot) => ({
      documentId: d.id,
      tenant: d.data() as CompanyTenant
    }));
    const products = productsSnap.docs.map((d: QueryDocumentSnapshot) => d.data() as ProductItem);
    const orders = ordersSnap.docs.map((d: QueryDocumentSnapshot) => d.data() as OrderTransaction);
    const devices = devicesSnap.docs.map((d: QueryDocumentSnapshot) => d.data() as POSDevice);

    const issues: string[] = [];
    const tenantIdSet = new Set(tenants.flatMap(({ documentId, tenant }) => [documentId, tenant.id].filter((id): id is string => typeof id === 'string' && id.length > 0)));
    const seenSerials = new Set<string>();

    for (const { documentId, tenant: t } of tenants) {
      if (!isValidCnpj(typeof t.cnpj === 'string' ? t.cnpj : '')) {
        issues.push(`Estabelecimento [${t.name}] com CNPJ incompleto.`);
      }
      const tenantIdentifiers = new Set([documentId, t.id].filter((id): id is string => typeof id === 'string' && id.length > 0));
      const registeredDevices = devices.filter((device) => tenantIdentifiers.has(device.tenantId)).length;
      if (!Number.isInteger(t.devicesLimit) || t.devicesLimit < 1 || t.devicesLimit > 999) {
        issues.push(`Estabelecimento [${t.name || documentId}] com cota de dispositivos inválida.`);
      } else if (registeredDevices > t.devicesLimit) {
        issues.push(`Estabelecimento [${t.name || documentId}] excedeu a cota de registros de dispositivos (${registeredDevices}/${t.devicesLimit}).`);
      }
    }

    for (const p of products) {
      if (typeof p.tenantId !== 'string' || !tenantIdSet.has(p.tenantId)) {
        issues.push(`Produto [${p.name}] vinculado a tenant inexistente.`);
      }
      if (!Number.isFinite(p.price) || p.price <= 0) {
        issues.push(`Produto [${p.name}] com preço inválido.`);
      }
    }

    let orderTotalsConsistent = true;
    for (const o of orders) {
      const amounts = [o.subtotal, o.deliveryFee ?? 0, o.tax ?? 0, o.discount ?? 0, o.total];
      if (amounts.some((amount) => !Number.isFinite(amount) || amount < 0)) {
        orderTotalsConsistent = false;
        issues.push(`Valores inválidos no pedido #${o.orderNumber}.`);
        continue;
      }
      const expected = Math.max(0, o.subtotal + (o.deliveryFee ?? 0) + (o.tax ?? 0) - (o.discount ?? 0));
      if (Math.abs(expected - o.total) > 0.15) {
        orderTotalsConsistent = false;
        issues.push(`Divergência contábil no pedido #${o.orderNumber}.`);
      }
    }

    for (const device of devices) {
      if (device.tenantId !== 'hq' && (typeof device.tenantId !== 'string' || !tenantIdSet.has(device.tenantId))) {
        issues.push(`Dispositivo [${device.serialNumber || device.id}] vinculado a tenant inexistente.`);
      }
      const serial = typeof device.serialNumber === 'string' ? device.serialNumber.trim().toLocaleLowerCase('pt-BR') : '';
      if (!serial) {
        issues.push(`Dispositivo [${device.id}] sem serial registrado.`);
      } else if (seenSerials.has(serial)) {
        issues.push(`Serial duplicado no inventário de dispositivos: ${device.serialNumber}.`);
      } else {
        seenSerials.add(serial);
      }
    }

    const report: SystemAuditReport = {
      timestamp: new Date().toISOString(),
      tenantsChecked: tenants.length,
      productsChecked: products.length,
      ordersChecked: orders.length,
      devicesChecked: devices.length,
      orderTotalsConsistent,
      issuesFound: issues,
      status: issues.length === 0 ? 'passed' : orderTotalsConsistent ? 'warning' : 'failed'
    };

    await logHqAudit(
      'Auditoria Estrutural do Ecossistema',
      `Executada pelo HQ Central: ${issues.length} apontamentos.`,
      report.status === 'passed' ? 'info' : 'warning'
    );
    res.json(report);
  } catch {
    res.status(500).json({ error: 'Failed to run platform audit.' });
  }
});

// GET /api/hq/ledger - Platform courier commission (currently coming soon)
hqRouter.get('/ledger', requireHqAdmin, async (_req: Request, res: Response) => {
  try {
    const settings = await getHqSettings();
    if (settings.platformDeliveryCommissionStatus !== 'active') {
      res.json({
        commissionStatus: 'coming_soon',
        totalEligibleDeliveryVolume: null,
        totalEstimatedCommission: null,
        currentCommissionRatePercent: null,
        recordsCount: 0,
        entries: []
      });
      return;
    }

    const [ordersSnap, platformDriversSnap] = await Promise.all([
      adminDb.collection('orders').where('isSimulated', '==', false).get(),
      adminDb.collection('drivers').where('driverType', '==', 'platform').get()
    ]);
    const platformDrivers = new Map<string, StoreDriver>(platformDriversSnap.docs
      .filter((doc) => isPlatformNetworkDriver(doc.data() as StoreDriver))
      .map((doc): [string, StoreDriver] => [
        doc.id,
        { ...(doc.data() as StoreDriver), id: doc.id }
      ]));
    const platformDriverIds = new Set(platformDrivers.keys());
    const realOrders = ordersSnap.docs
      .map((d: QueryDocumentSnapshot) => d.data() as OrderTransaction)
      .filter((order) => isCompletedPlatformDelivery(order, platformDriverIds));

    const entries = realOrders.map((o: OrderTransaction) => {
      const feeRate = settings.platformCommissionRate;
      const estimatedCommission = Number((o.total * feeRate).toFixed(2));
      return {
        orderId: o.id,
        orderNumber: o.orderNumber,
        tenantId: o.tenantId,
        channel: o.channel,
        driverId: o.driverId!,
        driverName: platformDrivers.get(o.driverId!)?.name || o.driverId!,
        date: o.createdAt,
        orderTotal: o.total,
        currentCommissionRatePercent: Number((feeRate * 100).toFixed(2)),
        estimatedCommissionAmount: estimatedCommission
      };
    });

    const totalEligibleDeliveryVolume = sumOrderTotals(realOrders);

    const totalEstimatedCommission = Number(
      entries.reduce((sum: number, e) => sum + e.estimatedCommissionAmount, 0).toFixed(2)
    );

    res.json({
      commissionStatus: 'active',
      totalEligibleDeliveryVolume,
      totalEstimatedCommission,
      currentCommissionRatePercent: Number((settings.platformCommissionRate * 100).toFixed(2)),
      recordsCount: entries.length,
      entries
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch revenue ledger.' });
  }
});

// GET /api/hq/communications/messages
hqRouter.get('/communications/messages', requireHqAdmin, async (_req: Request, res: Response) => {
  try {
    const snap = await adminDb.collection('social_messages').get();
    res.json(snap.docs.map(d => d.data()));
  } catch {
    res.status(500).json({ error: 'Failed to fetch social communications.' });
  }
});

// POST /api/hq/communications/messages
hqRouter.post('/communications/messages', requireHqAdmin, async (req: Request, res: Response) => {
  const caller = req.user;
  const body = (req.body || {}) as Record<string, unknown>;
  const content = typeof body['content'] === 'string' ? body['content'].trim().slice(0, 1000) : '';
  if (!content) {
    res.status(400).json({ error: 'O conteúdo da mensagem é obrigatório.', code: 'EMPTY_MESSAGE' });
    return;
  }

  const id = `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const message = {
    id,
    senderName: caller?.email || caller?.name || 'HQ Central',
    senderHandle: '@hq',
    channel: typeof body['channel'] === 'string' ? body['channel'].slice(0, 32) : 'internal',
    content,
    timestamp: new Date().toISOString(),
    unread: false,
    direction: 'outgoing',
    tenantId: 'hq_central'
  };

  try {
    await adminDb.collection('social_messages').doc(id).set(message);
    res.status(201).json(message);
  } catch {
    res.status(500).json({ error: 'Failed to dispatch social message.' });
  }
});

// GET /api/hq/plans - Public SaaS pricing tiers stored in `/plans/{id}`
hqRouter.get('/plans', async (_req: Request, res: Response) => {
  try {
    const snap = await adminDb.collection('plans').get();
    const storedPlans = new Map<string, Partial<LicensePlan>>(
      snap.docs.map((d: QueryDocumentSnapshot): [string, Partial<LicensePlan>] => [d.id, d.data() as Partial<LicensePlan>])
    );
    const plans = DEFAULT_SAAS_PLANS.map((basePlan) => ({
      ...basePlan,
      ...(storedPlans.get(basePlan.id) || {}),
      id: basePlan.id
    }));
    const savedPlanCount = DEFAULT_SAAS_PLANS.filter((plan) => storedPlans.has(plan.id)).length;
    const source = savedPlanCount === 0 ? 'defaults' : savedPlanCount === DEFAULT_SAAS_PLANS.length ? 'firestore' : 'mixed';
    res.setHeader('X-HQ-Plan-Catalog-Source', source);
    res.json(plans);
  } catch {
    res.status(500).json({ error: 'Failed to fetch plan catalog.' });
  }
});

// PATCH /api/hq/plans/:id - Update SaaS plan (HQ Only)
hqRouter.patch('/plans/:id', requireHqAdmin, async (req: Request, res: Response) => {
  const id = getParamId(req) as LicensePlan['id'];
  const basePlan = DEFAULT_SAAS_PLANS.find((p) => p.id === id);
  if (!basePlan) {
    res.status(404).json({ error: 'Plano não encontrado.' });
    return;
  }

  try {
    const docRef = adminDb.collection('plans').doc(id);
    const snap = await docRef.get();
    const existing = snap.exists ? (snap.data() as LicensePlan) : basePlan;
    const body = (req.body || {}) as Record<string, unknown>;
    const updated: LicensePlan = { ...existing, id };
    if ('priceMonthly' in body) {
      const price = body['priceMonthly'];
      if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
        res.status(400).json({ error: 'Mensalidade deve ser um número finito maior ou igual a zero.', code: 'INVALID_PLAN_PRICE' });
        return;
      }
      updated.priceMonthly = price;
    }
    if ('maxDevices' in body) {
      const maxDevices = body['maxDevices'];
      if (typeof maxDevices !== 'number' || !Number.isInteger(maxDevices) || maxDevices < 1 || maxDevices > 999) {
        res.status(400).json({ error: 'A cota deve ser um inteiro entre 1 e 999.', code: 'INVALID_PLAN_DEVICE_LIMIT' });
        return;
      }
      updated.maxDevices = maxDevices;
    }
    if (Object.keys(body).some((key) => key !== 'priceMonthly' && key !== 'maxDevices')) {
      res.status(400).json({ error: 'Somente mensalidade e cota podem ser alteradas nesta rota.', code: 'INVALID_PLAN_FIELDS' });
      return;
    }
    await docRef.set(updated);
    try {
      await logHqAudit(
        'Plano SaaS Atualizado',
        `Plano ${id} atualizado pelo HQ: ${Object.keys(body).join(', ')}.`,
        'info',
        req.user?.email || 'HQ ADMIN'
      );
    } catch {
      // Keep the plan update authoritative if audit persistence is unavailable.
    }
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Falha ao atualizar plano.' });
  }
});

// GET /api/hq/regional - Public marketplace banner/region config in `/public_regional/default`
hqRouter.get('/regional', async (_req: Request, res: Response) => {
  try {
    const doc = await adminDb.collection('public_regional').doc('default').get();
    if (doc.exists) {
      res.json(doc.data());
    } else {
      res.json({
        heroTitle: 'Encontre Estabelecimentos pelo Ecossistema 3eatcru',
        activeRegionName: 'Grande São Paulo'
      });
    }
  } catch {
    res.status(500).json({ error: 'Failed to fetch regional config.' });
  }
});

// POST /api/hq/regional - Save public regional marketplace config (HQ Only)
hqRouter.post('/regional', requireHqAdmin, async (req: Request, res: Response) => {
  const newConfig = req.body as RegionalMarketplaceConfig;
  try {
    await adminDb.collection('public_regional').doc('default').set(newConfig);
    await logHqAudit(
      'Configuração Regional Atualizada',
      `Praça "${newConfig.activeRegionName || 'Principal'}" reconfigurada.`,
      'info'
    );
    res.json({ config: newConfig });
  } catch {
    res.status(500).json({ error: 'Failed to update regional config.' });
  }
});
