import { Router, Request, Response } from 'express';
import {
  CompanyTenant,
  ExternalPaymentTerminal,
  ExternalTerminalMethod,
  PublicStorefront
} from '../../shared/models/ecosystem.model';
import {
  isTenantStaffRole,
  requireHqAdmin,
  requireTenantAccess,
  toPublicStorefront
} from '../middleware/auth.middleware';
import { adminAuth, adminDb } from '../firebase-admin';
import { FieldValue, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { isValidCnpj } from '../utils/cnpj';
import { getPlanDeviceLimit } from '../utils/plan-limits';
import { roundCurrencyAmount } from '../../shared/utils/money.util';

export const tenantsRouter = Router();

class TenantOwnerLinkError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

function getParamId(req: Request): string {
  const p = req.params['id'];
  return Array.isArray(p) ? p[0] : (p || '');
}

interface TenantUpdatePayload extends Record<string, unknown> {
  name?: unknown;
  aboutText?: unknown;
  deliveryFee?: unknown;
  storeDeliveryContribution?: unknown;
  minOrderValue?: unknown;
  pixKey?: unknown;
  isOpen?: unknown;
  supportsDelivery?: unknown;
  supportsTakeout?: unknown;
  openingHours?: unknown;
  status?: unknown;
  plan?: unknown;
  devicesLimit?: unknown;
  deliveryRadiusKm?: unknown;
  externalPaymentTerminals?: unknown;
}

function containsControlCharacters(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) || 0;
    return codePoint <= 31 || codePoint === 127;
  });
}

function normalizeExternalPaymentTerminals(value: unknown): ExternalPaymentTerminal[] | null {
  if (!Array.isArray(value) || value.length > 8) return null;
  const ids = new Set<string>();
  const allowedMethods = new Set<ExternalTerminalMethod>(['pix', 'credit_card', 'debit_card']);
  const terminals: ExternalPaymentTerminal[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
    const terminal = entry as Record<string, unknown>;
    if (Object.keys(terminal).some((key) => !['id', 'name', 'brand', 'enabled', 'methods'].includes(key))) return null;
    if (typeof terminal['id'] !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(terminal['id'])) return null;
    const id = terminal['id'];
    if (ids.has(id)) return null;
    ids.add(id);
    if (typeof terminal['name'] !== 'string' || !terminal['name'].trim() || terminal['name'].trim().length > 80) return null;
    if (containsControlCharacters(terminal['name'])) return null;
    if (typeof terminal['enabled'] !== 'boolean' || !Array.isArray(terminal['methods']) || terminal['methods'].length > 3) return null;
    if (terminal['methods'].some((method) => typeof method !== 'string' || !allowedMethods.has(method as ExternalTerminalMethod))) return null;
    const methods = [...new Set(terminal['methods'] as ExternalTerminalMethod[])];
    if (terminal['enabled'] && methods.length === 0) return null;
    if (terminal['brand'] !== undefined && (
      typeof terminal['brand'] !== 'string' ||
      terminal['brand'].trim().length > 80 ||
      containsControlCharacters(terminal['brand'])
    )) return null;

    terminals.push({
      id,
      name: terminal['name'].trim(),
      ...(typeof terminal['brand'] === 'string' && terminal['brand'].trim()
        ? { brand: terminal['brand'].trim() }
        : {}),
      enabled: terminal['enabled'],
      methods
    });
  }

  return terminals;
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
 * GET /api/tenants/:id/owner - Resolve the linked owner's current account details (HQ only).
 */
tenantsRouter.get('/:id/owner', requireHqAdmin, async (req: Request, res: Response) => {
  const tenantId = getParamId(req);
  try {
    const tenantSnap = await adminDb.collection('tenants').doc(tenantId).get();
    if (!tenantSnap.exists) {
      res.status(404).json({ error: 'Loja não encontrada.', code: 'TENANT_NOT_FOUND' });
      return;
    }

    const tenant = tenantSnap.data() as CompanyTenant;
    const ownerUid = typeof tenant.ownerUid === 'string' ? tenant.ownerUid : '';
    if (!ownerUid) {
      res.json({ tenantId, ownerUid: null, ownerEmail: null, emailVerified: null });
      return;
    }

    try {
      const owner = await adminAuth.getUser(ownerUid);
      res.json({
        tenantId,
        ownerUid,
        ownerEmail: owner.email || null,
        emailVerified: owner.emailVerified
      });
    } catch (error) {
      if ((error as { code?: string })?.code === 'auth/user-not-found') {
        res.json({ tenantId, ownerUid, ownerEmail: null, emailVerified: null });
        return;
      }
      throw error;
    }
  } catch {
    res.status(500).json({ error: 'Não foi possível consultar a conta responsável.' });
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
  for (const field of ['deliveryFee', 'minOrderValue'] as const) {
    const value = body[field];
    if (value !== undefined && value !== null && value !== '' &&
        (typeof value !== 'number' || !Number.isFinite(value) || value < 0)) {
      res.status(400).json({ error: `${field} deve ser um valor numérico igual ou maior que zero.`, code: field === 'deliveryFee' ? 'INVALID_DELIVERY_FEE' : 'INVALID_MIN_ORDER_VALUE' });
      return;
    }
  }
  if (body['openingHours'] !== undefined && body['openingHours'] !== null &&
      (typeof body['openingHours'] !== 'string' || body['openingHours'].trim().length > 60)) {
    res.status(400).json({ error: 'O horário informado deve ter até 60 caracteres.', code: 'INVALID_OPENING_HOURS' });
    return;
  }
  const validPlans: CompanyTenant['plan'][] = ['Starter', 'Professional', 'Enterprise'];
  const plan = validPlans.includes(body['plan'] as CompanyTenant['plan'])
    ? body['plan'] as CompanyTenant['plan']
    : 'Starter';
  let initialDeviceLimit: number;
  try {
    initialDeviceLimit = await getPlanDeviceLimit(plan);
  } catch {
    res.status(503).json({ error: 'Não foi possível carregar a cota cadastrada para este plano.', code: 'PLAN_CONFIGURATION_UNAVAILABLE' });
    return;
  }
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
    supportsDelivery: false,
    supportsTakeout: true,
    storeDeliveryContribution: 0,
    staffUids: [],
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
    ...(typeof body['openingHours'] === 'string' && body['openingHours'].trim()
      ? { openingHours: body['openingHours'].trim() }
      : {}),
    activeDevicesCount: 0,
    devicesLimit: initialDeviceLimit,
    ...(typeof body['minOrderValue'] === 'number' ? { minOrderValue: body['minOrderValue'] } : {}),
    ...(typeof body['deliveryFee'] === 'number' ? { deliveryFee: roundCurrencyAmount(body['deliveryFee']) } : {}),
    deliveryFleetType: 'own',
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
 * POST /api/tenants/:id/owner - Link an existing, verified account as tenant owner (HQ only).
 */
tenantsRouter.post('/:id/owner', requireHqAdmin, async (req: Request, res: Response) => {
  const tenantId = getParamId(req);
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'Informe um e-mail válido da conta do responsável.', code: 'INVALID_OWNER_EMAIL' });
    return;
  }

  let ownerRecord: Awaited<ReturnType<typeof adminAuth.getUserByEmail>>;
  try {
    ownerRecord = await adminAuth.getUserByEmail(email);
  } catch (error) {
    if ((error as { code?: string })?.code === 'auth/user-not-found') {
      res.status(404).json({ error: 'Não existe uma conta cadastrada com esse e-mail.', code: 'OWNER_ACCOUNT_NOT_FOUND' });
      return;
    }
    res.status(500).json({ error: 'Não foi possível consultar a conta do responsável.' });
    return;
  }

  if (!ownerRecord.emailVerified) {
    res.status(409).json({ error: 'A conta precisa confirmar o e-mail antes de ser vinculada.', code: 'OWNER_EMAIL_NOT_VERIFIED' });
    return;
  }

  const claims = ownerRecord.customClaims || {};
  if (claims['role'] === 'hq_admin') {
    res.status(409).json({ error: 'Uma conta administradora do HQ não pode ser responsável de uma loja.', code: 'OWNER_ACCOUNT_IS_HQ_ADMIN' });
    return;
  }

  try {
    const existingOwnerships = await adminDb.collection('tenants').where('ownerUid', '==', ownerRecord.uid).get();
    if (existingOwnerships.docs.some((doc) => doc.id !== tenantId)) {
      res.status(409).json({ error: 'Esta conta já está vinculada como responsável de outro estabelecimento.', code: 'OWNER_LINKED_TO_ANOTHER_TENANT' });
      return;
    }
  } catch {
    res.status(500).json({ error: 'Não foi possível verificar os vínculos atuais do responsável.' });
    return;
  }

  const tenantRef = adminDb.collection('tenants').doc(tenantId);
  const userRef = adminDb.collection('users').doc(ownerRecord.uid);
  const adminRef = adminDb.collection('admins').doc(ownerRecord.uid);
  const nowIso = new Date().toISOString();
  let previousUser: Record<string, unknown> | null = null;
  let wasAlreadyOwner = false;
  let wasAlreadyStaff = false;
  let reservationCommitted = false;
  let claimsUpdateAttempted = false;

  try {
    await adminDb.runTransaction(async (transaction) => {
      const tenantSnap = await transaction.get(tenantRef);
      const userSnap = await transaction.get(userRef);
      const adminSnap = await transaction.get(adminRef);
      if (!tenantSnap.exists) {
        throw new TenantOwnerLinkError(404, 'TENANT_NOT_FOUND', 'Loja não encontrada.');
      }
      const tenant = tenantSnap.data() as CompanyTenant;
      const userData = (userSnap.data() || {}) as Record<string, unknown>;
      if (adminSnap.exists || userData['role'] === 'hq_admin') {
        throw new TenantOwnerLinkError(409, 'OWNER_ACCOUNT_IS_HQ_ADMIN', 'Uma conta administradora do HQ não pode ser responsável de uma loja.');
      }
      const existingOwnerUid = typeof tenant.ownerUid === 'string' ? tenant.ownerUid : '';
      const staffUids = Array.isArray(tenant.staffUids)
        ? tenant.staffUids.filter((uid): uid is string => typeof uid === 'string')
        : [];
      const userTenantId = typeof userData['tenantId'] === 'string' ? userData['tenantId'] : '';
      const claimsTenantId = typeof claims['tenantId'] === 'string' ? claims['tenantId'] : '';

      if (existingOwnerUid && existingOwnerUid !== ownerRecord.uid) {
        throw new TenantOwnerLinkError(409, 'TENANT_OWNER_ALREADY_LINKED', 'Esta loja já possui outro responsável vinculado.');
      }
      if ((userTenantId && userTenantId !== tenantId) || (claimsTenantId && claimsTenantId !== tenantId)) {
        throw new TenantOwnerLinkError(409, 'OWNER_LINKED_TO_ANOTHER_TENANT', 'Esta conta já está vinculada a outro estabelecimento.');
      }
      if (staffUids.length >= 20 && !staffUids.includes(ownerRecord.uid)) {
        throw new TenantOwnerLinkError(409, 'TENANT_STAFF_LIMIT_REACHED', 'A lista de equipe desta loja atingiu o limite cadastrado.');
      }

      previousUser = userSnap.exists ? { ...userData } : null;
      wasAlreadyOwner = existingOwnerUid === ownerRecord.uid;
      wasAlreadyStaff = staffUids.includes(ownerRecord.uid);
      transaction.update(tenantRef, {
        ownerUid: ownerRecord.uid,
        staffUids: wasAlreadyStaff ? staffUids : [...staffUids, ownerRecord.uid],
        updatedAt: nowIso
      });
      transaction.set(userRef, {
        uid: ownerRecord.uid,
        role: 'tenant_owner',
        tenantId,
        updatedAt: nowIso
      }, { merge: true });
    });
    reservationCommitted = true;

    claimsUpdateAttempted = true;
    await adminAuth.setCustomUserClaims(ownerRecord.uid, {
      ...claims,
      role: 'tenant_owner',
      tenantId
    });

    try {
      const auditRef = adminDb.collection('audit_logs').doc();
      await auditRef.set({
        id: auditRef.id,
        timestamp: nowIso,
        user: req.user?.email || 'HQ ADMIN',
        action: 'Responsável de tenant vinculado',
        module: 'HQ',
        severity: 'info',
        details: `Usuário [${ownerRecord.uid}] vinculado como responsável do tenant [${tenantId}].`
      });
    } catch {
      // Owner linking remains authoritative even if audit persistence is unavailable.
    }

    res.json({ tenantId, ownerUid: ownerRecord.uid, ownerEmail: ownerRecord.email || email, role: 'tenant_owner' });
  } catch (error) {
    if (reservationCommitted) {
      let claimsRollbackFailed = false;
      if (claimsUpdateAttempted) {
        try {
          await adminAuth.setCustomUserClaims(ownerRecord.uid, claims);
        } catch {
          claimsRollbackFailed = true;
        }
      }

      try {
        await adminDb.runTransaction(async (transaction) => {
          const tenantSnap = await transaction.get(tenantRef);
          const userSnap = await transaction.get(userRef);
          if (!tenantSnap.exists || !userSnap.exists) throw new Error('Reservation records are no longer available.');

          const currentTenant = tenantSnap.data() as CompanyTenant;
          const currentUser = (userSnap.data() || {}) as Record<string, unknown>;
          if (currentTenant.ownerUid !== ownerRecord.uid || currentUser['tenantId'] !== tenantId || currentUser['role'] !== 'tenant_owner') {
            throw new Error('Reservation changed before rollback.');
          }

          const currentStaff = Array.isArray(currentTenant.staffUids)
            ? currentTenant.staffUids.filter((uid): uid is string => typeof uid === 'string')
            : [];
          const tenantRollback: Record<string, unknown> = {
            staffUids: wasAlreadyStaff ? currentStaff : currentStaff.filter(uid => uid !== ownerRecord.uid)
          };
          if (!wasAlreadyOwner) tenantRollback['ownerUid'] = FieldValue.delete();
          transaction.update(tenantRef, tenantRollback);

          transaction.update(userRef, {
            uid: previousUser && typeof previousUser['uid'] === 'string' ? previousUser['uid'] : FieldValue.delete(),
            role: previousUser && typeof previousUser['role'] === 'string' ? previousUser['role'] : FieldValue.delete(),
            tenantId: previousUser && typeof previousUser['tenantId'] === 'string' ? previousUser['tenantId'] : FieldValue.delete(),
            updatedAt: previousUser && typeof previousUser['updatedAt'] === 'string' ? previousUser['updatedAt'] : FieldValue.delete()
          });
        });
      } catch {
        res.status(500).json({
          error: 'A vinculação falhou e a reversão automática do Firestore ficou incompleta. Revise o vínculo no HQ antes de tentar novamente.',
          code: 'OWNER_LINK_ROLLBACK_INCOMPLETE'
        });
        return;
      }

      if (claimsRollbackFailed) {
        res.status(500).json({
          error: 'A vinculação falhou e a reversão automática das permissões ficou incompleta. Revise a conta no HQ antes de tentar novamente.',
          code: 'OWNER_LINK_ROLLBACK_INCOMPLETE'
        });
        return;
      }
    }

    if (error instanceof TenantOwnerLinkError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: 'Não foi possível vincular o responsável. Nenhuma confirmação foi registrada.' });
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

    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
      ? req.body as Record<string, unknown>
      : {};
    const isHqAdmin = req.user?.role === 'hq_admin';
    const isConfiguringExternalTerminals = Object.prototype.hasOwnProperty.call(body, 'externalPaymentTerminals');
    if (isHqAdmin && isConfiguringExternalTerminals) {
      res.status(403).json({
        error: 'A configuração dos terminais externos pertence ao proprietário e aos operadores da loja.',
        code: 'STORE_PERIPHERALS_STORE_ONLY'
      });
      return;
    }
    const storeProfileFields = [
      'name', 'aboutText', 'deliveryFee', 'storeDeliveryContribution', 'minOrderValue', 'pixKey', 'isOpen',
      'supportsDelivery', 'supportsTakeout', 'openingHours'
    ];
    const merchantOnlyFields = ['externalPaymentTerminals'];
    const hqGovernanceFields = ['status', 'plan', 'devicesLimit', 'deliveryRadiusKm'];
    const allowedFields = new Set(isHqAdmin
      ? [...storeProfileFields.filter((field) => field !== 'storeDeliveryContribution'), ...hqGovernanceFields]
      : [...storeProfileFields, ...merchantOnlyFields]);
    const ignoredLegacyFields = new Set(['ownerUid', 'staffUids', 'serviceFeePercent', 'deliveryFleetType']);
    const rejectedFields = Object.keys(body).filter((field) => !allowedFields.has(field) && !ignoredLegacyFields.has(field));
    if (rejectedFields.length > 0) {
      res.status(400).json({
        error: 'A atualização contém campos fora das permissões deste perfil.',
        code: 'INVALID_TENANT_UPDATE_FIELDS',
        fields: rejectedFields
      });
      return;
    }

    const updates: TenantUpdatePayload = {};
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) updates[field] = body[field];
    }
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'Informe ao menos um campo editável.', code: 'EMPTY_TENANT_UPDATE' });
      return;
    }

    const validPlans: CompanyTenant['plan'][] = ['Starter', 'Professional', 'Enterprise'];
    const validStatuses: CompanyTenant['status'][] = ['trial', 'active', 'suspended'];
    if ('plan' in updates && !validPlans.includes(updates.plan as CompanyTenant['plan'])) {
      res.status(400).json({ error: 'Plano inválido.', code: 'INVALID_TENANT_PLAN' });
      return;
    }
    if ('externalPaymentTerminals' in updates) {
      const terminals = normalizeExternalPaymentTerminals(updates.externalPaymentTerminals);
      if (!terminals) {
        res.status(400).json({
          error: 'Configure até 8 terminais, com nome, métodos válidos e ao menos um método em cada terminal ativo.',
          code: 'INVALID_EXTERNAL_TERMINAL_CONFIGURATION'
        });
        return;
      }
      updates.externalPaymentTerminals = terminals;
    }
    if ('status' in updates && !validStatuses.includes(updates.status as CompanyTenant['status'])) {
      res.status(400).json({ error: 'Status de tenant inválido.', code: 'INVALID_TENANT_STATUS' });
      return;
    }
    if ('name' in updates) {
      if (typeof updates.name !== 'string' || !updates.name.trim() || updates.name.trim().length > 120) {
        res.status(400).json({ error: 'O nome da loja deve conter de 1 a 120 caracteres.', code: 'INVALID_TENANT_NAME' });
        return;
      }
      updates.name = updates.name.trim();
    }
    if ('aboutText' in updates) {
      if (updates.aboutText === null) {
        // Null removes this optional public field.
      } else if (typeof updates.aboutText !== 'string' || updates.aboutText.length > 500) {
        res.status(400).json({ error: 'A descrição pública pode ter até 500 caracteres.', code: 'INVALID_TENANT_ABOUT_TEXT' });
        return;
      } else if (!updates.aboutText.trim()) {
        updates.aboutText = null;
      } else {
        updates.aboutText = updates.aboutText.trim();
      }
    }
    if ('deliveryFee' in updates &&
        updates.deliveryFee !== null &&
        (typeof updates.deliveryFee !== 'number' || !Number.isFinite(updates.deliveryFee) || updates.deliveryFee < 0)) {
      res.status(400).json({ error: 'A taxa de entrega deve ser um valor igual ou maior que zero.', code: 'INVALID_DELIVERY_FEE' });
      return;
    }
    if (typeof updates.deliveryFee === 'number') updates.deliveryFee = roundCurrencyAmount(updates.deliveryFee);
    if ('storeDeliveryContribution' in updates &&
        updates.storeDeliveryContribution !== null &&
        (typeof updates.storeDeliveryContribution !== 'number' || !Number.isFinite(updates.storeDeliveryContribution) || updates.storeDeliveryContribution < 0)) {
      res.status(400).json({ error: 'O complemento pago pela loja deve ser um valor igual ou maior que zero.', code: 'INVALID_STORE_DELIVERY_CONTRIBUTION' });
      return;
    }
    if (typeof updates.storeDeliveryContribution === 'number') {
      updates.storeDeliveryContribution = roundCurrencyAmount(updates.storeDeliveryContribution);
    }
    if ('pixKey' in updates) {
      if (updates.pixKey === null) {
        // Null removes the optional payment key.
      } else if (typeof updates.pixKey !== 'string' || updates.pixKey.trim().length > 77) {
        res.status(400).json({ error: 'Informe uma chave Pix com até 77 caracteres.', code: 'INVALID_TENANT_PIX_KEY' });
        return;
      } else if (!updates.pixKey.trim()) {
        updates.pixKey = null;
      } else {
        updates.pixKey = updates.pixKey.trim();
      }
    }
    if ('minOrderValue' in updates &&
        updates.minOrderValue !== null &&
        (typeof updates.minOrderValue !== 'number' || !Number.isFinite(updates.minOrderValue) || updates.minOrderValue < 0)) {
      res.status(400).json({ error: 'O pedido mínimo deve ser um valor igual ou maior que zero.', code: 'INVALID_MIN_ORDER_VALUE' });
      return;
    }
    if ('supportsDelivery' in updates && typeof updates.supportsDelivery !== 'boolean') {
      res.status(400).json({ error: 'supportsDelivery deve ser booleano.', code: 'INVALID_DELIVERY_SUPPORT' });
      return;
    }
    if ('supportsTakeout' in updates && typeof updates.supportsTakeout !== 'boolean') {
      res.status(400).json({ error: 'supportsTakeout deve ser booleano.', code: 'INVALID_TAKEOUT_SUPPORT' });
      return;
    }
    if ('openingHours' in updates) {
      if (typeof updates.openingHours !== 'string' || updates.openingHours.length > 60) {
        res.status(400).json({ error: 'O horário informado deve ter até 60 caracteres.', code: 'INVALID_OPENING_HOURS' });
        return;
      }
      updates.openingHours = updates.openingHours.trim();
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

    for (const field of ['deliveryFee', 'storeDeliveryContribution', 'minOrderValue', 'aboutText', 'pixKey']) {
      if (updates[field] === null) updates[field] = FieldValue.delete();
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
    } else if ('externalPaymentTerminals' in updates) {
      try {
        const auditId = `aud-periph-${Date.now().toString(36)}`;
        const terminalCount = Array.isArray(updates.externalPaymentTerminals)
          ? updates.externalPaymentTerminals.filter((terminal) => (terminal as ExternalPaymentTerminal).enabled).length
          : 0;
        await adminDb.collection('audit_logs').doc(auditId).set({
          id: auditId,
          timestamp: new Date().toISOString(),
          user: req.user?.email || 'Store operator',
          action: 'Configuração de terminais externos',
          module: 'OS',
          severity: 'info',
          details: `A loja [${id}] atualizou os perfis de terminais externos (${terminalCount} ativo(s)).`
        });
      } catch {
        // Terminal configuration is authoritative even if the audit log is unavailable.
      }
    }
    res.json(updatedDoc.data());
  } catch {
    res.status(500).json({ error: 'Failed to update tenant.' });
  }
});
