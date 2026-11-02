import { Router, Request, Response } from 'express';
import { AppRole, CompanyTenant, StoreAddress, StoreDriver } from '../../shared/models/ecosystem.model';
import { adminAuth, adminDb } from '../firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  isHqAdminEmail,
  isTenantManagerRole,
  requireAuth,
  ROLE_PERMISSION_MATRIX
} from '../middleware/auth.middleware';
import { authRegisterRateLimiter } from '../middleware/rate-limiter.middleware';
import { isValidCnpj } from '../utils/cnpj';
import { getPlanDeviceLimit } from '../utils/plan-limits';

export { isValidCnpj } from '../utils/cnpj';

export const authRouter = Router();

/**
 * GET /api/auth/me
 * Synchronizes verified Firebase Custom Claims and authoritative server RBAC state.
 */
authRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  const caller = req.user;
  if (!caller) {
    res.status(401).json({ error: 'Não autenticado.' });
    return;
  }

  try {
    let claimsUpdated = false;
    const nowIso = new Date().toISOString();

    if (caller.role === 'hq_admin' && isHqAdminEmail(caller.email, caller.emailVerified)) {
      const adminRef = adminDb.collection('admins').doc(caller.id);
      const adminSnap = await adminRef.get();
      if (!adminSnap.exists) {
        await adminRef.set({
          uid: caller.id,
          email: caller.email,
          role: 'hq_admin',
          createdAt: nowIso
        });
      }

      const authRecord = await adminAuth.getUser(caller.id);
      if (authRecord.customClaims?.['role'] !== 'hq_admin') {
        await adminAuth.setCustomUserClaims(caller.id, {
          ...(authRecord.customClaims || {}),
          role: 'hq_admin'
        });
        claimsUpdated = true;
      }
    }

    res.json({
      id: caller.id,
      email: caller.email,
      emailVerified: caller.emailVerified,
      role: caller.role,
      tenantId: caller.tenantId,
      driverId: caller.driverId,
      name: caller.name,
      permissions: ROLE_PERMISSION_MATRIX[caller.role] || [],
      claimsUpdated
    });
  } catch {
    res.json({
      id: caller.id,
      email: caller.email,
      emailVerified: caller.emailVerified,
      role: caller.role,
      tenantId: caller.tenantId,
      driverId: caller.driverId,
      name: caller.name,
      permissions: ROLE_PERMISSION_MATRIX[caller.role] || [],
      claimsUpdated: false
    });
  }
});

/**
 * POST /api/auth/register-merchant
 * P2.9: Strict onboarding validation — mandatory 14-digit CNPJ, phone, and complete address.
 * Never fabricates fake CNPJ/address/coordinates; provisions in `status: 'trial'` and `isOpen: false` until verified.
 */
authRouter.post('/register-merchant', requireAuth, authRegisterRateLimiter, async (req: Request, res: Response) => {
  const caller = req.user;
  if (!caller) {
    res.status(401).json({ error: 'Autenticação obrigatória.' });
    return;
  }

  if (caller.tenantId && caller.role !== 'hq_admin') {
    res.status(409).json({
      error: 'Usuário já está vinculado a um estabelecimento.',
      tenantId: caller.tenantId
    });
    return;
  }

  const body = (req.body || {}) as Record<string, unknown>;
  const storeName = String(body['storeName'] || body['name'] || '').trim();
  const rawCnpj = String(body['cnpj'] || '').trim();
  const cnpjDigits = rawCnpj.replace(/\D/g, '');
  const rawPhone = String(body['phone'] || '').trim();
  const phoneDigits = rawPhone.replace(/\D/g, '');

  if (!storeName || storeName.length < 2) {
    res.status(400).json({ error: 'Nome do estabelecimento é obrigatório.', code: 'INVALID_STORE_NAME' });
    return;
  }

  if (!isValidCnpj(cnpjDigits)) {
    res.status(400).json({
      error: 'CNPJ inválido. Forneça um CNPJ real de 14 dígitos com dígitos verificadores matematicamente válidos.',
      code: 'INVALID_CNPJ'
    });
    return;
  }

  if (phoneDigits.length < 10) {
    res.status(400).json({
      error: 'Telefone comercial válido (mínimo 10 dígitos com DDD) é obrigatório.',
      code: 'INVALID_PHONE'
    });
    return;
  }

  const rawAddress = body['address'] as Record<string, unknown> | undefined;
  const street = String(rawAddress?.['street'] || '').trim();
  const number = String(rawAddress?.['number'] || '').trim();
  const neighborhood = String(rawAddress?.['neighborhood'] || '').trim();
  const city = String(rawAddress?.['city'] || '').trim();
  const state = String(rawAddress?.['state'] || '').trim().toUpperCase();
  const zipCode = String(rawAddress?.['zipCode'] || '').trim();
  const zipDigits = zipCode.replace(/\D/g, '');

  if (
    !rawAddress ||
    typeof rawAddress !== 'object' ||
    street.length < 2 ||
    number.length < 1 ||
    neighborhood.length < 2 ||
    city.length < 2 ||
    state.length !== 2 ||
    zipDigits.length !== 8
  ) {
    res.status(400).json({
      error: 'Endereço comercial completo (logradouro, número, bairro, cidade, UF de 2 letras e CEP de 8 dígitos) é obrigatório.',
      code: 'INVALID_ADDRESS'
    });
    return;
  }

  const formattedCnpj = `${cnpjDigits.slice(0, 2)}.${cnpjDigits.slice(2, 5)}.${cnpjDigits.slice(5, 8)}/${cnpjDigits.slice(8, 12)}-${cnpjDigits.slice(12, 14)}`;

  // Guarantee CNPJ uniqueness across existing tenants
  const existingCnpjSnap = await adminDb
    .collection('tenants')
    .where('cnpj', '==', formattedCnpj)
    .limit(1)
    .get();

  if (!existingCnpjSnap.empty) {
    res.status(409).json({
      error: `O CNPJ ${formattedCnpj} já está registrado no ecossistema por outro estabelecimento.`,
      code: 'CNPJ_ALREADY_REGISTERED'
    });
    return;
  }

  const validatedAddress: StoreAddress = {
    street: street.slice(0, 120),
    number: number.slice(0, 24),
    neighborhood: neighborhood.slice(0, 80),
    city: city.slice(0, 80),
    state: state.slice(0, 2),
    zipCode: `${zipDigits.slice(0, 5)}-${zipDigits.slice(5, 8)}`,
    ...(rawAddress['complement']
      ? { complement: String(rawAddress['complement']).trim().slice(0, 80) }
      : {})
  };

  const hasValidCoords =
    typeof body['lat'] === 'number' &&
    Number.isFinite(body['lat']) &&
    typeof body['lng'] === 'number' &&
    Number.isFinite(body['lng']);

  const tenantId = `tenant-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
  const nowIso = new Date().toISOString();
  const assignedRole: AppRole = caller.role === 'hq_admin' ? 'hq_admin' : 'tenant_owner';

  const validCategories: CompanyTenant['category'][] = [
    'restaurant',
    'retail',
    'services',
    'hybrid',
    'health',
    'education',
    'automotive',
    'beauty',
    'petshop'
  ];
  const reqCategory = body['category'] as CompanyTenant['category'];
  const category: CompanyTenant['category'] = validCategories.includes(reqCategory)
    ? reqCategory
    : 'restaurant';

  let initialDeviceLimit: number;
  try {
    initialDeviceLimit = await getPlanDeviceLimit('Starter');
  } catch {
    res.status(503).json({ error: 'Não foi possível carregar a cota cadastrada para o plano Starter.', code: 'PLAN_CONFIGURATION_UNAVAILABLE' });
    return;
  }

  const newTenant: CompanyTenant = {
    id: tenantId,
    name: storeName.slice(0, 120),
    legalName: String(body['legalName'] || storeName).trim().slice(0, 140),
    cnpj: formattedCnpj,
    category,
    plan: 'Starter',
    status: 'trial',
    ownerUid: caller.id,
    staffUids: [caller.id],
    ...(hasValidCoords ? { lat: Number(body['lat']), lng: Number(body['lng']) } : {}),
    address: validatedAddress,
    contactEmail: caller.email,
    phone: rawPhone.slice(0, 32),
    createdAt: nowIso,
    deliveryRadiusKm: 5.0,
    openingHours: String(body['openingHours'] || '09:00 às 22:00').slice(0, 60),
    activeDevicesCount: 1,
    devicesLimit: initialDeviceLimit,
    minOrderValue: 20,
    deliveryFee: 5,
    deliveryFleetType: 'own',
    isOpen: false,
    supportsDelivery: false,
    supportsTakeout: true,
    supportsReservation: false,
    storeSlug: tenantId,
    themeColor: 'amber'
  };

  try {
    const batch = adminDb.batch();
    batch.set(adminDb.collection('tenants').doc(tenantId), newTenant);
    batch.set(
      adminDb.collection('users').doc(caller.id),
      {
        uid: caller.id,
        email: caller.email,
        name: caller.name || storeName,
        role: assignedRole === 'hq_admin' ? 'tenant_owner' : assignedRole,
        tenantId,
        updatedAt: nowIso,
        createdAt: nowIso
      },
      { merge: true }
    );
    await batch.commit();

    try {
      await adminAuth.setCustomUserClaims(caller.id, {
        role: assignedRole,
        tenantId
      });
    } catch {
      // Custom claims update may fail in mock/test environments; Firestore server lookup backs it up
    }

    res.status(201).json({
      tenant: newTenant,
      role: assignedRole,
      tenantId,
      claimsUpdated: true
    });
  } catch {
    res.status(500).json({ error: 'Falha ao provisionar novo estabelecimento.' });
  }
});

/**
 * POST /api/auth/assign-role
 */
authRouter.post('/assign-role', requireAuth, async (req: Request, res: Response) => {
  const caller = req.user;
  if (!caller) {
    res.status(401).json({ error: 'Autenticação obrigatória.' });
    return;
  }

  const targetUid = String(req.body?.targetUid || '').trim();
  const targetEmail = String(req.body?.targetEmail || '').trim().toLowerCase();
  const requestedRole = req.body?.role as AppRole | undefined;
  const requestedTenantId = req.body?.tenantId ? String(req.body.tenantId).trim() : caller.tenantId;
  const requestedDriverId = String(req.body?.driverId || '').trim();

  const validRoles: AppRole[] = [
    'hq_admin',
    'tenant_owner',
    'operator',
    'waiter',
    'driver',
    'consumer'
  ];

  if ((!targetUid && !targetEmail) || !requestedRole || !validRoles.includes(requestedRole)) {
    res.status(400).json({ error: 'targetUid ou targetEmail e role válido são obrigatórios.' });
    return;
  }

  if (caller.role !== 'hq_admin') {
    if (!isTenantManagerRole(caller.role) || !caller.tenantId) {
      res.status(403).json({ error: 'Apenas HQ Central ou Gestor da Loja podem atribuir papéis.' });
      return;
    }

    if (requestedTenantId !== caller.tenantId) {
      res.status(403).json({
        error: 'Gestor não pode atribuir papéis em outro estabelecimento.',
        code: 'TENANT_MISMATCH'
      });
      return;
    }

    const allowedStoreRoles: AppRole[] = ['operator', 'waiter', 'driver'];
    if (!allowedStoreRoles.includes(requestedRole)) {
      res.status(403).json({
        error: 'Gestor da loja só pode atribuir perfis operacionais (operator, waiter, driver).'
      });
      return;
    }
  }

  if (requestedRole === 'tenant_owner') {
    res.status(409).json({
      error: 'Vincule o responsável pela rota POST /api/tenants/:id/owner para manter identidade e tenant sincronizados.',
      code: 'OWNER_LINK_REQUIRED'
    });
    return;
  }

  try {
    const targetUser = targetUid
      ? await adminAuth.getUser(targetUid)
      : await adminAuth.getUserByEmail(targetEmail);
    const resolvedTargetUid = targetUser.uid;
    const storedUserSnap = await adminDb.collection('users').doc(resolvedTargetUid).get();
    const storedUser = storedUserSnap.data();
    let linkedDriverRef: import('firebase-admin/firestore').DocumentReference | null = null;

    if (requestedRole === 'driver') {
      if (!requestedDriverId || !requestedTenantId) {
        res.status(400).json({ error: 'driverId e tenantId são obrigatórios para vincular entregador.' });
        return;
      }
      if (!targetUser.emailVerified) {
        res.status(409).json({ error: 'A conta do entregador precisa ter o e-mail verificado.', code: 'DRIVER_EMAIL_UNVERIFIED' });
        return;
      }
      const roleBefore = targetUser.customClaims?.['role'] || storedUser?.['role'];
      const tenantBefore = targetUser.customClaims?.['tenantId'] || storedUser?.['tenantId'];
      if (roleBefore && !['consumer', 'driver'].includes(String(roleBefore))) {
        res.status(409).json({ error: 'A conta já possui outro perfil operacional.', code: 'ACCOUNT_ROLE_CONFLICT' });
        return;
      }
      if (roleBefore === 'driver' && tenantBefore && tenantBefore !== requestedTenantId) {
        res.status(409).json({ error: 'A conta de motorista já está vinculada a outra unidade.', code: 'DRIVER_TENANT_CONFLICT' });
        return;
      }

      linkedDriverRef = adminDb.collection('drivers').doc(requestedDriverId);
      const driverSnap = await linkedDriverRef.get();
      if (!driverSnap.exists) {
        res.status(404).json({ error: 'Entregador não encontrado.', code: 'DRIVER_NOT_FOUND' });
        return;
      }
      const driver = driverSnap.data() as StoreDriver;
      if (driver.driverType !== 'private' || driver.tenantId !== requestedTenantId || driver.tenantId === 'marketplace') {
        res.status(403).json({ error: 'Entregador deve pertencer à frota privada da mesma unidade.', code: 'DRIVER_TENANT_MISMATCH' });
        return;
      }
      if (driver.userUid && driver.userUid !== resolvedTargetUid) {
        res.status(409).json({ error: 'Este entregador já está vinculado a outra conta.', code: 'DRIVER_ACCOUNT_ALREADY_LINKED' });
        return;
      }
      const existingLink = await adminDb.collection('drivers').where('userUid', '==', resolvedTargetUid).limit(1).get();
      if (!existingLink.empty && existingLink.docs[0]?.id !== requestedDriverId) {
        res.status(409).json({ error: 'Esta conta já está vinculada a outro entregador.', code: 'ACCOUNT_ALREADY_LINKED' });
        return;
      }
    }

    const previousDriverLink = requestedRole !== 'driver'
      ? await adminDb.collection('drivers').where('userUid', '==', resolvedTargetUid).limit(1).get()
      : null;

    const nowIso = new Date().toISOString();
    const claimsPayload: Record<string, string> = {
      ...(targetUser.customClaims as Record<string, string> || {}),
      role: requestedRole
    };
    if (requestedTenantId && requestedRole !== 'hq_admin' && requestedRole !== 'consumer') {
      claimsPayload['tenantId'] = requestedTenantId;
    }
    if (requestedRole === 'driver') claimsPayload['driverId'] = requestedDriverId;
    else delete claimsPayload['driverId'];

    await adminAuth.setCustomUserClaims(resolvedTargetUid, claimsPayload);

    if (requestedRole === 'hq_admin') {
      await adminDb.collection('admins').doc(resolvedTargetUid).set({
        uid: resolvedTargetUid,
        assignedBy: caller.id,
        role: 'hq_admin',
        createdAt: nowIso
      });
    } else {
      await adminDb.collection('admins').doc(resolvedTargetUid).delete();
      await adminDb.collection('users').doc(resolvedTargetUid).set(
        {
          uid: resolvedTargetUid,
          role: requestedRole,
          ...(claimsPayload['tenantId'] ? { tenantId: claimsPayload['tenantId'] } : {}),
          updatedAt: nowIso
        },
        { merge: true }
      );

      if (linkedDriverRef) {
        await linkedDriverRef.update({ userUid: resolvedTargetUid });
      }
      if (previousDriverLink && !previousDriverLink.empty) {
        await previousDriverLink.docs[0]!.ref.update({
          userUid: FieldValue.delete(),
          locationSharing: false,
          gpsRouteId: FieldValue.delete(),
          lat: FieldValue.delete(),
          lng: FieldValue.delete(),
          gpsAccuracyMeters: FieldValue.delete(),
          lastGpsPing: FieldValue.delete(),
          currentLocationName: FieldValue.delete()
        });
      }

      if (
        claimsPayload['tenantId'] &&
        ['tenant_owner', 'operator', 'waiter'].includes(requestedRole)
      ) {
        const tenantRef = adminDb.collection('tenants').doc(claimsPayload['tenantId']);
        const tenantSnap = await tenantRef.get();
        if (tenantSnap.exists) {
          const tData = tenantSnap.data() as CompanyTenant;
          const existingStaff = Array.isArray(tData.staffUids) ? tData.staffUids : [];
          if (!existingStaff.includes(resolvedTargetUid) && existingStaff.length < 20) {
            await tenantRef.update({ staffUids: [...existingStaff, resolvedTargetUid] });
          }
        }
      }
    }

    try {
      const auditRef = adminDb.collection('audit_logs').doc();
      await auditRef.set({
        id: auditRef.id,
        timestamp: nowIso,
        user: caller.email || caller.id,
        action: 'Papel de usuário atualizado',
        module: 'System',
        severity: 'info',
        details: `Usuário [${resolvedTargetUid}] recebeu o papel [${requestedRole}]${claimsPayload['tenantId'] ? ` no tenant [${claimsPayload['tenantId']}]` : ''}.`
      });
    } catch {
      // Role assignment remains authoritative if audit persistence is unavailable.
    }

    res.json({
      success: true,
      targetUid: resolvedTargetUid,
      role: requestedRole,
      tenantId: claimsPayload['tenantId'] || null
    });
  } catch {
    res.status(500).json({ error: 'Falha ao atribuir papel de acesso.' });
  }
});
