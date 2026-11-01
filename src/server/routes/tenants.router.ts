import { Router, Request, Response } from 'express';
import { CompanyTenant, PublicStorefront } from '../../shared/models/ecosystem.model';
import {
  isTenantStaffRole,
  requireHqAdmin,
  requireTenantAccess,
  toPublicStorefront
} from '../middleware/auth.middleware';
import { adminDb } from '../firebase-admin';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { isValidCnpj } from '../utils/cnpj';

export const tenantsRouter = Router();

function getParamId(req: Request): string {
  const p = req.params['id'];
  return Array.isArray(p) ? p[0] : (p || '');
}

/**
 * GET /api/tenants/public - Explicit Public Marketplace Storefronts
 * Guaranteed free of private CNPJ, contact emails, hardware limits, or staff UIDs.
 */
tenantsRouter.get('/public', async (_req: Request, res: Response) => {
  try {
    const snap = await adminDb.collection('tenants').where('status', '==', 'active').get();
    const publicList = snap.docs.map((doc: QueryDocumentSnapshot) =>
      toPublicStorefront(doc.data() as CompanyTenant)
    );
    res.json(publicList);
  } catch {
    res.status(500).json({ error: 'Failed to fetch public storefronts.' });
  }
});

/**
 * GET /api/tenants - List tenants
 * Returns full internal records ONLY to HQ Admin or staff of that exact tenant.
 */
tenantsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const snap = await adminDb.collection('tenants').get();
    const all = snap.docs.map((doc: QueryDocumentSnapshot) => doc.data() as CompanyTenant);

    if (req.user?.role === 'hq_admin') {
      res.json(all);
      return;
    }

    if (isTenantStaffRole(req.user?.role) && req.user?.tenantId) {
      const staffTenantId = req.user.tenantId;
      const scopedList: (CompanyTenant | PublicStorefront)[] = [];
      for (const t of all) {
        if (t.id === staffTenantId) {
          scopedList.push(t);
        } else if (t.status === 'active') {
          scopedList.push(toPublicStorefront(t));
        }
      }
      res.json(scopedList);
      return;
    }

    const publicList = all
      .filter((t: CompanyTenant) => t.status === 'active')
      .map((t: CompanyTenant) => toPublicStorefront(t));
    res.json(publicList);
  } catch {
    res.status(500).json({ error: 'Failed to list tenants.' });
  }
});

/**
 * GET /api/tenants/:id - Single tenant
 */
tenantsRouter.get('/:id', async (req: Request, res: Response) => {
  const id = getParamId(req);
  try {
    const doc = await adminDb.collection('tenants').doc(id).get();
    if (!doc.exists) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    const tenant = doc.data() as CompanyTenant;
    const isAuthorized =
      req.user?.role === 'hq_admin' ||
      (isTenantStaffRole(req.user?.role) && req.user?.tenantId === id);

    if (isAuthorized) {
      res.json(tenant);
      return;
    }

    if (tenant.status !== 'active') {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    res.json(toPublicStorefront(tenant));
  } catch {
    res.status(500).json({ error: 'Failed to fetch tenant details.' });
  }
});

/**
 * POST /api/tenants - Provision new tenant (HQ Central Only)
 */
tenantsRouter.post('/', requireHqAdmin, async (req: Request, res: Response) => {
  const body = (req.body || {}) as Record<string, unknown>;
  const name = typeof body['name'] === 'string' ? body['name'].trim().slice(0, 120) : '';
  if (!name) {
    res.status(400).json({ error: 'Nome da empresa é obrigatório.', code: 'INVALID_TENANT_NAME' });
    return;
  }

  const rawCnpj = String(body['cnpj'] || '').replace(/\D/g, '');
  if (!isValidCnpj(rawCnpj)) {
    res.status(400).json({ error: 'Informe um CNPJ válido, com 14 dígitos verificadores corretos.', code: 'INVALID_CNPJ' });
    return;
  }
  const formattedCnpj = `${rawCnpj.slice(0, 2)}.${rawCnpj.slice(2, 5)}.${rawCnpj.slice(5, 8)}/${rawCnpj.slice(8, 12)}-${rawCnpj.slice(12, 14)}`;

  let cnpjAlreadyExists: boolean;
  try {
    const existingCnpjSnap = await adminDb
      .collection('tenants')
      .where('cnpj', 'in', [formattedCnpj, rawCnpj])
      .limit(1)
      .get();
    cnpjAlreadyExists = !existingCnpjSnap.empty;
  } catch {
    res.status(500).json({ error: 'Não foi possível verificar se o CNPJ já está cadastrado.' });
    return;
  }

  if (cnpjAlreadyExists) {
    res.status(409).json({
      error: `O CNPJ ${formattedCnpj} já está registrado no ecossistema por outro estabelecimento.`,
      code: 'CNPJ_ALREADY_REGISTERED'
    });
    return;
  }

  const validCategories: CompanyTenant['category'][] = ['restaurant', 'retail', 'services', 'hybrid', 'health', 'education', 'automotive', 'beauty', 'petshop'];
  const category = validCategories.includes(body['category'] as CompanyTenant['category'])
    ? body['category'] as CompanyTenant['category']
    : 'restaurant';
  const validPlans: CompanyTenant['plan'][] = ['Starter', 'Professional', 'Enterprise'];
  const plan = validPlans.includes(body['plan'] as CompanyTenant['plan'])
    ? body['plan'] as CompanyTenant['plan']
    : 'Starter';
  const tenantsCollection = adminDb.collection('tenants');
  const tenantRef = tenantsCollection.doc();
  const id = tenantRef.id;
  const newTenant: CompanyTenant = {
    id,
    name,
    legalName: typeof body['legalName'] === 'string' && body['legalName'].trim() ? body['legalName'].trim().slice(0, 140) : '',
    cnpj: formattedCnpj,
    category,
    plan,
    status: 'trial',
    isOpen: false,
    ...(typeof body['ownerUid'] === 'string' && body['ownerUid'].trim() ? { ownerUid: body['ownerUid'].trim() } : {}),
    staffUids: Array.isArray(body['staffUids']) ? (body['staffUids'] as string[]).slice(0, 20) : [],
    ...(Number.isFinite(Number(body['lat'])) ? { lat: Number(body['lat']) } : {}),
    ...(Number.isFinite(Number(body['lng'])) ? { lng: Number(body['lng']) } : {}),
    address:
      body['address'] && typeof body['address'] === 'object'
        ? body['address'] as CompanyTenant['address']
        : {
            street: '',
            number: '',
            neighborhood: '',
            city: '',
            state: '',
            zipCode: ''
          },
    contactEmail: typeof body['contactEmail'] === 'string' ? body['contactEmail'].trim().slice(0, 120) : '',
    phone: typeof body['phone'] === 'string' ? body['phone'].trim().slice(0, 32) : '',
    createdAt: new Date().toISOString(),
    deliveryRadiusKm: Number(body['deliveryRadiusKm']) || 5.0,
    openingHours: typeof body['openingHours'] === 'string' ? body['openingHours'].slice(0, 60) : '10:00 às 22:00',
    activeDevicesCount: 0,
    devicesLimit: plan === 'Enterprise' ? 20 : plan === 'Professional' ? 5 : 2,
    serviceFeePercent: Number.isFinite(Number(body['serviceFeePercent']))
      ? Number(body['serviceFeePercent'])
      : 8,
    minOrderValue: Number(body['minOrderValue']) || 25,
    deliveryFee: Number(body['deliveryFee']) || 5,
    deliveryFleetType: body['deliveryFleetType'] === 'own' || body['deliveryFleetType'] === 'platform' ? body['deliveryFleetType'] : 'hybrid',
    storeSlug: typeof body['storeSlug'] === 'string' && body['storeSlug'].trim() ? body['storeSlug'].trim().slice(0, 80) : id,
    themeColor: 'amber'
  };

  try {
    await tenantRef.set(newTenant);
    try {
      const auditId = adminDb.collection('audit_logs').doc().id;
      await adminDb.collection('audit_logs').doc(auditId).set({
        id: auditId,
        timestamp: new Date().toISOString(),
        user: req.user?.email || 'HQ ADMIN',
        action: 'Tenant Provisionado',
        module: 'HQ',
        severity: 'info',
        details: `Tenant [${id}] criado em período de teste.`
      });
    } catch {
      // The provisioning result remains authoritative even if audit persistence is unavailable.
    }
    res.status(201).json(newTenant);
  } catch {
    res.status(500).json({ error: 'Failed to create tenant.' });
  }
});

/**
 * PATCH /api/tenants/:id - Update tenant governance or store profile
 */
tenantsRouter.patch('/:id', requireTenantAccess(), async (req: Request, res: Response) => {
  const id = getParamId(req);
  try {
    const docRef = adminDb.collection('tenants').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).json({ error: 'Tenant not found.' });
      return;
    }

    const updates = { ...req.body };
    if (req.user?.role !== 'hq_admin') {
      delete updates.status;
      delete updates.plan;
      delete updates.devicesLimit;
      delete updates.serviceFeePercent;
      delete updates.cnpj;
      delete updates.id;
      delete updates.createdAt;
      delete updates.ownerUid;
      delete updates.staffUids;
      delete updates.isSimulated;
    }

    const validPlans: CompanyTenant['plan'][] = ['Starter', 'Professional', 'Enterprise'];
    const validStatuses: CompanyTenant['status'][] = ['trial', 'active', 'suspended'];
    if ('plan' in updates && !validPlans.includes(updates.plan as CompanyTenant['plan'])) {
      res.status(400).json({ error: 'Plano inválido.', code: 'INVALID_TENANT_PLAN' });
      return;
    }
    if ('status' in updates && !validStatuses.includes(updates.status as CompanyTenant['status'])) {
      res.status(400).json({ error: 'Status de tenant inválido.', code: 'INVALID_TENANT_STATUS' });
      return;
    }
    if ('serviceFeePercent' in updates &&
        (typeof updates.serviceFeePercent !== 'number' || !Number.isFinite(updates.serviceFeePercent) || updates.serviceFeePercent < 0 || updates.serviceFeePercent > 50)) {
      res.status(400).json({ error: 'A taxa de serviço deve estar entre 0% e 50%.', code: 'INVALID_SERVICE_FEE' });
      return;
    }
    if ('devicesLimit' in updates &&
        (typeof updates.devicesLimit !== 'number' || !Number.isInteger(updates.devicesLimit) || updates.devicesLimit < 1 || updates.devicesLimit > 999)) {
      res.status(400).json({ error: 'A cota deve ser um inteiro entre 1 e 999.', code: 'INVALID_DEVICE_QUOTA' });
      return;
    }
    if ('deliveryRadiusKm' in updates &&
        (typeof updates.deliveryRadiusKm !== 'number' || !Number.isFinite(updates.deliveryRadiusKm) || updates.deliveryRadiusKm < 1 || updates.deliveryRadiusKm > 50)) {
      res.status(400).json({ error: 'O raio de entrega deve estar entre 1 e 50 km.', code: 'INVALID_DELIVERY_RADIUS' });
      return;
    }
    if ('isOpen' in updates && typeof updates.isOpen !== 'boolean') {
      res.status(400).json({ error: 'O campo isOpen deve ser booleano.', code: 'INVALID_STORE_OPEN_STATE' });
      return;
    }

    await docRef.update(updates);
    const updatedDoc = await docRef.get();
    if (req.user?.role === 'hq_admin') {
      try {
        const auditId = `aud-tn-${Date.now().toString(36)}`;
        await adminDb.collection('audit_logs').doc(auditId).set({
          id: auditId,
          timestamp: new Date().toISOString(),
          user: req.user.email || 'HQ ADMIN',
          action: 'Governança de Unidade',
          module: 'HQ',
          severity: 'info',
          details: `Administrador HQ atualizou a unidade [${id}]. Campos enviados: ${Object.keys(updates).join(', ')}`
        });
      } catch {
        // The tenant update is authoritative even if the audit log is unavailable.
      }
    }
    res.json(updatedDoc.data());
  } catch {
    res.status(500).json({ error: 'Failed to update tenant.' });
  }
});
