import { Request, Response, NextFunction } from 'express';
import {
  AppRole,
  CompanyTenant,
  EcosystemPillar,
  ProductItem,
  PublicCatalogProduct,
  PublicStorefront
} from '../../shared/models/ecosystem.model';
import { adminAuth, adminDb } from '../firebase-admin';

export type SystemPermission =
  | 'hq:governance'
  | 'tenant:manage'
  | 'catalog:write'
  | 'catalog:read_private'
  | 'orders:manage_tenant'
  | 'orders:create'
  | 'orders:read_own'
  | 'tables:manage_tenant'
  | 'financials:manage_tenant'
  | 'logistics:dispatch'
  | 'logistics:deliver';

export const ROLE_PERMISSION_MATRIX: Record<AppRole, readonly SystemPermission[]> = {
  hq_admin: [
    'hq:governance',
    'tenant:manage',
    'catalog:write',
    'catalog:read_private',
    'orders:manage_tenant',
    'orders:create',
    'orders:read_own',
    'tables:manage_tenant',
    'financials:manage_tenant',
    'logistics:dispatch',
    'logistics:deliver'
  ],
  tenant_owner: [
    'tenant:manage',
    'catalog:write',
    'catalog:read_private',
    'orders:manage_tenant',
    'orders:create',
    'orders:read_own',
    'tables:manage_tenant',
    'financials:manage_tenant',
    'logistics:dispatch'
  ],
  operator: [
    'catalog:write',
    'catalog:read_private',
    'orders:manage_tenant',
    'orders:create',
    'orders:read_own',
    'tables:manage_tenant',
    'financials:manage_tenant',
    'logistics:dispatch'
  ],
  waiter: [
    'catalog:read_private',
    'orders:manage_tenant',
    'orders:create',
    'tables:manage_tenant'
  ],
  driver: [
    'logistics:deliver',
    'orders:read_own'
  ],
  consumer: [
    'orders:create',
    'orders:read_own'
  ],
  guest: [
    'orders:create'
  ]
};

export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  role: AppRole;
  tenantId?: string;
  name?: string;
}

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

const BOOTSTRAPPED_SUPER_ADMIN_EMAILS = new Set<string>([
  '3eatcru@gmail.com',
  'marcelokbite@gmail.com'
]);

export function isHqAdminEmail(email: string, emailVerified = true): boolean {
  if (!email || !emailVerified) return false;
  const lower = email.toLowerCase().trim();
  return BOOTSTRAPPED_SUPER_ADMIN_EMAILS.has(lower);
}

export function hasPermission(role: AppRole | undefined, permission: SystemPermission): boolean {
  if (!role) return false;
  return ROLE_PERMISSION_MATRIX[role]?.includes(permission) ?? false;
}

export function isTenantStaffRole(role: AppRole | undefined): boolean {
  return role === 'tenant_owner' || role === 'operator' || role === 'waiter';
}

export function isTenantManagerRole(role: AppRole | undefined): boolean {
  return role === 'tenant_owner' || role === 'operator';
}

export async function authContext(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'] as string | undefined;
  const pillarHeader = req.headers['x-3eatcru-pillar'] as EcosystemPillar | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();

    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      const uid = decodedToken.uid;
      const email = ((decodedToken['email'] as string) || '').toLowerCase().trim();
      const emailVerified = Boolean(decodedToken['email_verified']);
      const tokenRole = decodedToken['role'] as AppRole | undefined;

      let role: AppRole = 'consumer';
      let tenantId: string | undefined = undefined;

      // Inferred Pillar for tests/legacy clients without header
      const effectivePillar = pillarHeader || (tokenRole === 'hq_admin' ? 'hq' : (tokenRole === 'driver' ? 'driver' : (isTenantStaffRole(tokenRole) ? 'os' : 'consumer')));

      if (effectivePillar === 'hq') {
        // HQ Pillar: Only allow hq_admin role from Claims or admins collection
        if (tokenRole === 'hq_admin' && emailVerified) {
          role = 'hq_admin';
        } else if (emailVerified) {
          if (isHqAdminEmail(email, emailVerified)) {
            role = 'hq_admin';
          } else {
            const adminDoc = await adminDb.collection('admins').doc(uid).get();
            if (adminDoc.exists) {
              role = 'hq_admin';
            }
          }
        }
      } else if (effectivePillar === 'os') {
        // Store OS Pillar: Only allow tenant-linked roles (owner, operator, waiter)
        const userDoc = await adminDb.collection('users').doc(uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          const storedRole = userData?.['role'] as AppRole | undefined;
          if (storedRole && isTenantStaffRole(storedRole)) {
            role = storedRole;
            tenantId = userData?.['tenantId'];
          }
        } else if (!pillarHeader && tokenRole && isTenantStaffRole(tokenRole)) {
          // Fallback for tests: trust token claim if no header provided
          role = tokenRole;
          tenantId = decodedToken['tenantId'] as string | undefined;
        }
      } else if (effectivePillar === 'driver') {
        // Logistics Pillar: Only allow driver role
        const driverDoc = await adminDb.collection('drivers').doc(uid).get();
        if (driverDoc.exists) {
          role = 'driver';
          const driverData = driverDoc.data();
          tenantId = driverData?.['tenantId'];
        } else if (!pillarHeader && tokenRole === 'driver') {
          // Fallback for tests
          role = 'driver';
          tenantId = decodedToken['tenantId'] as string | undefined;
        }
      } else {
        // Consumer Pillar: Default to consumer
        role = 'consumer';
      }

      const tokenName = decodedToken['name'] as string | undefined;
      req.user = {
        id: uid,
        email,
        emailVerified,
        role,
        tenantId,
        name: tokenName || (email ? email.split('@')[0] : 'Usuário')
      };
    } catch {
      req.user = undefined;
    }
  }

  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role === 'guest') {
    res.status(401).json({
      error: 'Autenticação obrigatória.',
      code: 'UNAUTHORIZED',
      message: 'Esta rota requer um Firebase ID Token válido.'
    });
    return;
  }
  next();
}

export function requireHqAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Autenticação obrigatória.',
      code: 'UNAUTHORIZED'
    });
    return;
  }

  if (req.user.role !== 'hq_admin') {
    res.status(403).json({
      error: 'Acesso restrito ao Gabinete HQ Central.',
      code: 'FORBIDDEN',
      role: req.user.role
    });
    return;
  }

  next();
}

export function requireRoles(allowedRoles: readonly AppRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || req.user.role === 'guest') {
      res.status(401).json({
        error: 'Autenticação obrigatória.',
        code: 'UNAUTHORIZED'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Perfil sem permissão para executar esta operação.',
        code: 'INSUFFICIENT_ROLE',
        role: req.user.role,
        allowedRoles
      });
      return;
    }

    next();
  };
}

export function requireTenantAccess(
  targetTenantIdExtractor?: (req: Request) => string | undefined,
  options: { allowWaiter?: boolean } = {}
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || req.user.role === 'guest') {
      res.status(401).json({
        error: 'Autenticação obrigatória.',
        code: 'UNAUTHORIZED'
      });
      return;
    }

    if (req.user.role === 'hq_admin') {
      next();
      return;
    }

    const validTenantRole = options.allowWaiter
      ? isTenantStaffRole(req.user.role)
      : isTenantManagerRole(req.user.role);

    if (!validTenantRole) {
      res.status(403).json({
        error: 'Acesso negado: perfil sem permissão administrativa no estabelecimento.',
        code: 'FORBIDDEN_ROLE',
        role: req.user.role
      });
      return;
    }

    const rawTarget = targetTenantIdExtractor
      ? targetTenantIdExtractor(req)
      : (req.params['tenantId'] || req.params['id'] || (req.query['tenantId'] as string) || req.body?.tenantId);
    const targetTenantId = Array.isArray(rawTarget) ? rawTarget[0] : rawTarget;

    if (!targetTenantId) {
      res.status(400).json({ error: 'Identificador do estabelecimento (tenantId) não fornecido.' });
      return;
    }

    if (!req.user.tenantId || req.user.tenantId !== targetTenantId) {
      res.status(403).json({
        error: 'Acesso negado: usuário vinculado a outro estabelecimento.',
        code: 'TENANT_MISMATCH',
        expectedTenant: req.user.tenantId,
        requestedTenant: targetTenantId
      });
      return;
    }

    next();
  };
}

export function toPublicStorefront(tenant: CompanyTenant): PublicStorefront {
  return {
    id: tenant.id,
    name: tenant.name,
    category: tenant.category,
    status: tenant.status,
    tagline: tenant.tagline,
    badgeCategory: tenant.badgeCategory,
    supportsDelivery: tenant.supportsDelivery,
    supportsTakeout: tenant.supportsTakeout,
    supportsReservation: tenant.supportsReservation,
    pixAvailable: Boolean(tenant.pixKey?.trim() && tenant.pixKey.trim().length <= 77),
    isOpen: tenant.isOpen,
    estimatedDeliveryMinutes: tenant.estimatedDeliveryMinutes,
    deliveryFee: tenant.deliveryFee,
    minOrderValue: tenant.minOrderValue,
    deliveryRadiusKm: tenant.deliveryRadiusKm,
    openingHours: tenant.openingHours,
    address: {
      city: tenant.address?.city,
      neighborhood: tenant.address?.neighborhood,
      state: tenant.address?.state,
      street: tenant.address?.street,
      number: tenant.address?.number,
      zipCode: tenant.address?.zipCode
    },
    lat: tenant.lat,
    lng: tenant.lng,
    logo: tenant.logo,
    coverImage: tenant.coverImage,
    specialties: tenant.specialties,
    storeSlug: tenant.storeSlug,
    themeColor: tenant.themeColor,
    announcementText: tenant.announcementText,
    showAnnouncement: tenant.showAnnouncement,
    announcementType: tenant.announcementType,
    whatsappNumber: tenant.whatsappNumber,
    highlightedProductIds: tenant.highlightedProductIds
  };
}

export function toPublicProduct(prod: ProductItem): PublicCatalogProduct {
  return {
    id: prod.id,
    tenantId: prod.tenantId,
    name: prod.name,
    category: prod.category,
    price: prod.price,
    image: prod.image,
    availableOnline: prod.availableOnline ?? true,
    inStock: (prod.stock ?? 0) > 0,
    description: prod.description || ''
  };
}
