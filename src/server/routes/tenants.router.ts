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
  const body = req.body;
  const rawCnpj = String(body.cnpj || '').replace(/\D/g, '');
  if (rawCnpj.length !== 14) {
    res.status(400).json({ error: 'CNPJ deve possuir exatamente 14 dígitos numéricos.', code: 'INVALID_CNPJ' });
    return;
  }
  const formattedCnpj = `${rawCnpj.slice(0, 2)}.${rawCnpj.slice(2, 5)}.${rawCnpj.slice(5, 8)}/${rawCnpj.slice(8, 12)}-${rawCnpj.slice(12, 14)}`;

  const existingCnpjSnap = await adminDb
    .collection('tenants')
    .where('cnpj', 'in', [formattedCnpj, rawCnpj])
    .limit(1)
    .get();

  if (!existingCnpjSnap.empty) {
    res.status(409).json({
      error: `O CNPJ ${formattedCnpj} já está registrado no ecossistema por outro estabelecimento.`,
      code: 'CNPJ_ALREADY_REGISTERED'
    });
    return;
  }

  const id = 'tenant-' + Date.now().toString(36);
  const newTenant: CompanyTenant = {
    id,
    name: String(body.name).trim(),
    legalName: body.legalName || body.name,
    cnpj: formattedCnpj,
    category: body.category || 'restaurant',
    plan: body.plan || 'Professional',
    status: 'active',
    ...(body.ownerUid ? { ownerUid: String(body.ownerUid) } : {}),
    staffUids: Array.isArray(body.staffUids) ? body.staffUids.slice(0, 20) : [],
    lat: Number(body.lat) || -23.5651,
    lng: Number(body.lng) || -46.6521,
    address:
      body.address && typeof body.address === 'object'
        ? body.address
        : {
            street: String(body.address || 'Av. Principal'),
            number: '100',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01000-000'
          },
    contactEmail: body.contactEmail || `contato@${id}.com.br`,
    phone: body.phone || '(11) 90000-0000',
    createdAt: new Date().toISOString(),
    deliveryRadiusKm: Number(body.deliveryRadiusKm) || 5.0,
    openingHours: body.openingHours || '10:00 às 22:00',
    activeDevicesCount: 1,
    devicesLimit: body.plan === 'Enterprise' ? 20 : body.plan === 'Professional' ? 5 : 2,
    serviceFeePercent: Number(body.serviceFeePercent) || 8,
    minOrderValue: Number(body.minOrderValue) || 25,
    deliveryFee: Number(body.deliveryFee) || 5,
    deliveryFleetType: body.deliveryFleetType || 'hybrid',
    storeSlug: body.storeSlug || id,
    themeColor: 'amber'
  };

  try {
    await adminDb.collection('tenants').doc(id).set(newTenant);
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

    if (req.user?.role === 'hq_admin') {
      const auditId = `aud-tn-${Date.now().toString(36)}`;
      await adminDb.collection('audit_logs').doc(auditId).set({
        id: auditId,
        timestamp: new Date().toISOString(),
        user: req.user.email || 'HQ ADMIN',
        action: 'Governança de Unidade',
        module: 'HQ',
        severity: 'info',
        details: `Administrador HQ alterou configurações da unidade [${id}]. Campos: ${Object.keys(req.body).join(', ')}`
      });
    }

    await docRef.update(updates);
    const updatedDoc = await docRef.get();
    res.json(updatedDoc.data());
  } catch {
    res.status(500).json({ error: 'Failed to update tenant.' });
  }
});
