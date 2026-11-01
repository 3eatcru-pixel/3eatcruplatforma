import { Router, Request, Response } from 'express';
import {
  CompanyTenant,
  POSDevice,
  AuditLog,
  OrderTransaction,
  ProductItem,
  SystemAuditReport,
  LicensePlan,
  RegionalMarketplaceConfig
} from '../../shared/models/ecosystem.model';
import {
  requireHqAdmin
} from '../middleware/auth.middleware';
import { adminDb } from '../firebase-admin';
import { Query, QueryDocumentSnapshot } from 'firebase-admin/firestore';

export const hqRouter = Router();

interface GlobalHqSettings {
  maintenanceMode: boolean;
  globalBroadcastMessage: string | null;
  platformCommissionRate: number;
  updatedAt: string;
}

const DEFAULT_HQ_SETTINGS: GlobalHqSettings = {
  maintenanceMode: false,
  globalBroadcastMessage: null,
  platformCommissionRate: 0.08,
  updatedAt: new Date().toISOString()
};

const DEFAULT_SAAS_PLANS: LicensePlan[] = [
  {
    id: 'Starter',
    name: 'Starter (Iniciante)',
    priceMonthly: 149.0,
    maxDevices: 2,
    includedModules: ['PDV Caixa'],
    description: 'Ideal para pequenos comércios.'
  },
  {
    id: 'Professional',
    name: 'Professional (Avançado)',
    priceMonthly: 299.0,
    maxDevices: 5,
    includedModules: ['Full ERP'],
    description: 'Perfeito para restaurantes.'
  },
  {
    id: 'Enterprise',
    name: 'Enterprise (Corporativo)',
    priceMonthly: 599.0,
    maxDevices: 20,
    includedModules: ['MDM Supremo'],
    description: 'Para redes de lojas.'
  }
];

function getParamId(req: Request): string {
  const p = req.params['id'];
  return Array.isArray(p) ? p[0] : (p || '');
}

async function getHqSettings(): Promise<GlobalHqSettings> {
  try {
    const doc = await adminDb.collection('hq_settings').doc('global').get();
    if (doc.exists) {
      return { ...DEFAULT_HQ_SETTINGS, ...(doc.data() as Partial<GlobalHqSettings>) };
    }
  } catch {
    // Fallback to defaults
  }
  return DEFAULT_HQ_SETTINGS;
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

    const realOrders = orders.filter(
      (o: OrderTransaction) => !o.isSimulated && o.status !== 'cancelled' && (o.paymentStatus === 'approved' || o.status === 'completed')
    );
    const grossVolume = realOrders.reduce(
      (sum: number, o: OrderTransaction) => sum + (o.total || 0),
      0
    );
    const hqRevenue = Number((grossVolume * settings.platformCommissionRate).toFixed(2));

    res.json({
      tenantsCount: tenants.length,
      activeTenantsCount: tenants.filter((t: CompanyTenant) => t.status === 'active').length,
      totalDevices: devices.length,
      onlineDevices: devices.filter((d: POSDevice) => d.status === 'online').length,
      totalOrders: realOrders.length,
      grossPlatformVolume: Number(grossVolume.toFixed(2)),
      hqCommissionRevenue: hqRevenue,
      defaultCommissionPercent: Number((settings.platformCommissionRate * 100).toFixed(2)),
      maintenanceMode: settings.maintenanceMode,
      globalBroadcastMessage: settings.globalBroadcastMessage,
      serverUptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch overview data.' });
  }
});

// POST /api/hq/system/broadcast - Persist global broadcast in private /hq_settings/global
hqRouter.post('/system/broadcast', requireHqAdmin, async (req: Request, res: Response) => {
  const message = req.body?.message ? String(req.body.message).trim().slice(0, 500) : null;
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
    res.json({ broadcast: message });
  } catch {
    res.status(500).json({ error: 'Failed to update broadcast.' });
  }
});

// POST /api/hq/system/maintenance - Toggle maintenance mode in private /hq_settings/global
hqRouter.post('/system/maintenance', requireHqAdmin, async (req: Request, res: Response) => {
  const enabled = Boolean(req.body?.enabled);
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

// POST /api/hq/system/commission - Update platform SaaS split rate in private /hq_settings/global
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
    await logHqAudit('Taxa SaaS Global', `Split padrão ajustado para ${percent}%.`, 'info');
    res.json({ defaultCommissionPercent: percent });
  } catch {
    res.status(500).json({ error: 'Failed to update commission rate.' });
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
  const body = req.body;
  if (!body.deviceName || !body.serialNumber || !body.tenantId) {
    res.status(400).json({ error: 'deviceName, serialNumber, and tenantId are required.' });
    return;
  }

  const id = `dev-${Date.now().toString(36)}`;
  try {
    const tenantDoc = await adminDb.collection('tenants').doc(body.tenantId).get();
    const tenant = tenantDoc.data() as CompanyTenant;

    const newDevice: POSDevice = {
      id,
      tenantId: body.tenantId,
      tenantName:
        body.tenantId === 'hq' ? 'HQ Central (Infraestrutura)' : tenant?.name || 'Loja',
      deviceName: String(body.deviceName).trim(),
      type: body.type || 'terminal',
      serialNumber: String(body.serialNumber).trim(),
      macAddress:
        body.macAddress ||
        `00:${Math.floor(10 + Math.random() * 89)}:2B:3C:4D:${Math.floor(10 + Math.random() * 89)}`,
      ipAddress: body.ipAddress || '192.168.1.150',
      osVersion: '3EATCRU OS 5.0.0-PRO',
      appVersion: 'v3.0.0',
      status: 'online',
      lastPing: new Date().toISOString(),
      location: body.location || 'Terminal Balcão',
      batteryLevel: 100
    };

    await adminDb.collection('devices').doc(id).set(newDevice);
    await logHqAudit(
      'Terminal Pareado',
      `Novo terminal [${newDevice.deviceName}] (${newDevice.serialNumber}) pareado para ${newDevice.tenantName}.`,
      'info'
    );
    res.status(201).json(newDevice);
  } catch {
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
    const newStatus = dev.status === 'locked' ? 'online' : 'locked';
    await docRef.update({ status: newStatus });
    await logHqAudit(
      'Comando MDM Remoto',
      `Dispositivo ${dev.deviceName} (${dev.serialNumber}) alterado para [${newStatus.toUpperCase()}].`,
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
    await docRef.update({ status: 'updating' });
    await logHqAudit(
      'Reinicialização MDM',
      `Comando de reinicialização remota enviado para ${dev.deviceName} (${dev.serialNumber}).`,
      'info'
    );
    res.json({
      message: `Reboot command dispatched to device ${dev.deviceName}`,
      status: 'updating'
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

    const tenants = tenantsSnap.docs.map((d: QueryDocumentSnapshot) => d.data() as CompanyTenant);
    const products = productsSnap.docs.map((d: QueryDocumentSnapshot) => d.data() as ProductItem);
    const orders = ordersSnap.docs.map((d: QueryDocumentSnapshot) => d.data() as OrderTransaction);
    const devices = devicesSnap.docs.map((d: QueryDocumentSnapshot) => d.data() as POSDevice);

    const issues: string[] = [];
    const tenantIdSet = new Set(tenants.map((t: CompanyTenant) => t.id));

    for (const t of tenants) {
      if (!t.cnpj || t.cnpj.length < 11) {
        issues.push(`Estabelecimento [${t.name}] com CNPJ incompleto.`);
      }
      if (t.activeDevicesCount > t.devicesLimit) {
        issues.push(`Estabelecimento [${t.name}] excedeu limite de terminais.`);
      }
    }

    for (const p of products) {
      if (p.tenantId && !tenantIdSet.has(p.tenantId)) {
        issues.push(`Produto [${p.name}] vinculado a tenant inexistente.`);
      }
      if (p.price <= 0) {
        issues.push(`Produto [${p.name}] com preço inválido.`);
      }
    }

    let ledgerConsistent = true;
    for (const o of orders) {
      const expected = Math.max(
        0,
        o.subtotal + (o.deliveryFee || 0) + (o.tax || 0) - (o.discount || 0)
      );
      if (Math.abs(expected - o.total) > 0.15) {
        ledgerConsistent = false;
        issues.push(`Divergência contábil no pedido #${o.orderNumber}.`);
      }
    }

    const report: SystemAuditReport = {
      timestamp: new Date().toISOString(),
      tenantsChecked: tenants.length,
      productsChecked: products.length,
      ordersChecked: orders.length,
      devicesChecked: devices.length,
      ledgerConsistent,
      issuesFound: issues,
      status: issues.length === 0 ? 'passed' : ledgerConsistent ? 'warning' : 'failed'
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

// GET /api/hq/ledger
hqRouter.get('/ledger', requireHqAdmin, async (_req: Request, res: Response) => {
  try {
    const [ordersSnap, settings] = await Promise.all([
      adminDb.collection('orders').where('isSimulated', '==', false).get(),
      getHqSettings()
    ]);
    const realOrders = ordersSnap.docs
      .map((d: QueryDocumentSnapshot) => d.data() as OrderTransaction)
      .filter((o: OrderTransaction) => o.status !== 'cancelled' && (o.paymentStatus === 'approved' || o.status === 'completed'));

    const entries = realOrders.map((o: OrderTransaction) => {
      const feeRate = settings.platformCommissionRate;
      const hqFee = Number((o.total * feeRate).toFixed(2));
      const storeNet = Number((o.total - hqFee).toFixed(2));
      return {
        orderId: o.id,
        orderNumber: o.orderNumber,
        tenantId: o.tenantId,
        channel: o.channel,
        date: o.createdAt,
        orderTotal: o.total,
        platformFeeRate: `${(feeRate * 100).toFixed(0)}%`,
        platformFeeAmount: hqFee,
        storeNetAmount: storeNet
      };
    });

    const totalPlatformFees = Number(
      entries.reduce((sum: number, e) => sum + e.platformFeeAmount, 0).toFixed(2)
    );

    res.json({
      totalPlatformFees,
      platformSplitPercent: Number((settings.platformCommissionRate * 100).toFixed(2)),
      recordsCount: entries.length,
      entries
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch revenue ledger.' });
  }
});

// GET /api/hq/communications/messages
hqRouter.get('/communications/messages', async (_req: Request, res: Response) => {
  try {
    const snap = await adminDb.collection('social_messages').get();
    res.json(snap.docs.map(d => d.data()));
  } catch {
    res.status(500).json({ error: 'Failed to fetch social communications.' });
  }
});

// POST /api/hq/communications/messages
hqRouter.post('/communications/messages', async (req: Request, res: Response) => {
  const caller = req.user;
  const body = req.body || {};
  const id = `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const message = {
    id,
    senderName: String(body.senderName || caller?.name || 'Central Lojista'),
    senderHandle: String(body.senderHandle || '@loja'),
    channel: body.channel || 'whatsapp',
    content: String(body.content || '').slice(0, 1000),
    timestamp: new Date().toISOString(),
    unread: false,
    direction: 'outgoing',
    tenantId: caller?.tenantId || body.tenantId || 'hq_central'
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
    if (!snap.empty) {
      res.json(snap.docs.map((d: QueryDocumentSnapshot) => d.data()));
      return;
    }
    res.json(DEFAULT_SAAS_PLANS);
  } catch {
    res.json(DEFAULT_SAAS_PLANS);
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
    const updated: LicensePlan = {
      ...existing,
      ...req.body,
      id
    };
    await docRef.set(updated);
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
