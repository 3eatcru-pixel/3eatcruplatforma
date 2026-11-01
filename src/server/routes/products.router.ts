import { Router, Request, Response } from 'express';
import {
  CompanyTenant,
  ProductItem,
  PublicCatalogProduct
} from '../../shared/models/ecosystem.model';
import {
  isTenantManagerRole,
  isTenantStaffRole,
  requireAuth,
  requireTenantAccess,
  toPublicProduct
} from '../middleware/auth.middleware';
import { adminDb } from '../firebase-admin';
import { Query, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { createCatalogProduct, updateCatalogProduct } from '../core/commerce.engine';

export const productsRouter = Router();

function getParamId(req: Request): string {
  const p = req.params['id'];
  return Array.isArray(p) ? p[0] : (p || '');
}

function canReadPrivateProduct(req: Request, tenantId: string): boolean {
  if (!req.user) return false;
  if (req.user.role === 'hq_admin') return true;
  return isTenantStaffRole(req.user.role) && req.user.tenantId === tenantId;
}

async function getActiveTenantIds(filterTenantId?: string): Promise<Set<string>> {
  if (filterTenantId) {
    const doc = await adminDb.collection('tenants').doc(filterTenantId).get();
    if (!doc.exists) return new Set();
    const tenant = doc.data() as CompanyTenant;
    return tenant.status === 'active' ? new Set([filterTenantId]) : new Set();
  }

  const snap = await adminDb.collection('tenants').where('status', '==', 'active').get();
  return new Set(snap.docs.map((d: QueryDocumentSnapshot) => d.id));
}

/**
 * GET /api/products/public - Sanitized Marketplace & Storefront Catalog
 * Never exposes `costPrice`, `wholesalePrice`, `supplierId`, `minStock`, or exact internal `stock`.
 * Strictly filters for `availableOnline !== false` AND `tenant.status === 'active'`.
 */
productsRouter.get('/public', async (req: Request, res: Response) => {
  const tenantId = req.query['tenantId'] as string | undefined;
  try {
    const activeTenantIds = await getActiveTenantIds(tenantId);
    if (tenantId && !activeTenantIds.has(tenantId)) {
      res.json([]);
      return;
    }

    let pubQuery: Query = adminDb.collection('public_catalog');
    if (tenantId) {
      pubQuery = pubQuery.where('tenantId', '==', tenantId);
    }
    const pubSnap = await pubQuery.get();
    if (!pubSnap.empty) {
      const visiblePublic = pubSnap.docs
        .map((doc: QueryDocumentSnapshot) => doc.data() as PublicCatalogProduct)
        .filter(
          (item: PublicCatalogProduct) =>
            item.availableOnline !== false && activeTenantIds.has(item.tenantId)
        );
      res.json(visiblePublic);
      return;
    }

    // Fallback projection from private `products` sanitized on the server
    let fallbackQuery: Query = adminDb.collection('products');
    if (tenantId) {
      fallbackQuery = fallbackQuery.where('tenantId', '==', tenantId);
    }
    const prodSnap = await fallbackQuery.get();
    const visibleFallback = prodSnap.docs
      .map((doc: QueryDocumentSnapshot) => doc.data() as ProductItem)
      .filter(
        (prod: ProductItem) => prod.availableOnline !== false && activeTenantIds.has(prod.tenantId)
      )
      .map((prod: ProductItem) => toPublicProduct(prod));
    res.json(visibleFallback);
  } catch {
    res.status(500).json({ error: 'Failed to fetch public catalog.' });
  }
});

/**
 * GET /api/products?tenantId=... - List products
 * Returns full private ERP fields ONLY to HQ Admin or staff of that exact tenant.
 * Returns sanitized `PublicCatalogProduct` ONLY when `availableOnline !== false` and `tenant.status === 'active'`
 * to consumers, guests, or rival tenants.
 */
productsRouter.get('/', async (req: Request, res: Response) => {
  const tenantId = req.query['tenantId'] as string | undefined;
  try {
    let query: Query = adminDb.collection('products');
    if (tenantId) {
      query = query.where('tenantId', '==', tenantId);
    }
    const snap = await query.get();
    const all = snap.docs.map((doc: QueryDocumentSnapshot) => doc.data() as ProductItem);

    const needsPublicCheck = all.some((p: ProductItem) => !canReadPrivateProduct(req, p.tenantId));
    const activeTenantIds = needsPublicCheck ? await getActiveTenantIds(tenantId) : new Set<string>();

    const scoped: (ProductItem | PublicCatalogProduct)[] = [];
    for (const p of all) {
      if (canReadPrivateProduct(req, p.tenantId)) {
        scoped.push(p);
      } else if (p.availableOnline !== false && activeTenantIds.has(p.tenantId)) {
        scoped.push(toPublicProduct(p));
      }
    }
    res.json(scoped);
  } catch {
    res.status(500).json({ error: 'Failed to fetch products.' });
  }
});

/**
 * GET /api/products/:id - Single product (sanitized unless authorized ERP staff; hidden if offline/inactive store)
 */
productsRouter.get('/:id', async (req: Request, res: Response) => {
  const id = getParamId(req);
  try {
    const doc = await adminDb.collection('products').doc(id).get();
    if (!doc.exists) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    const prod = doc.data() as ProductItem;
    if (canReadPrivateProduct(req, prod.tenantId)) {
      res.json(prod);
      return;
    }

    if (prod.availableOnline === false) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const activeTenantIds = await getActiveTenantIds(prod.tenantId);
    if (!activeTenantIds.has(prod.tenantId)) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    res.json(toPublicProduct(prod));
  } catch {
    res.status(500).json({ error: 'Failed to fetch product.' });
  }
});

/**
 * POST /api/products - Create ERP Product & Sync Public Marketplace Projection
 */
productsRouter.post(
  '/',
  requireAuth,
  requireTenantAccess((req) => req.body.tenantId),
  async (req: Request, res: Response) => {
    const body = req.body;
    if (!body.name || body.price === undefined || !body.tenantId) {
      res.status(400).json({ error: 'Nome, preço e tenantId são obrigatórios.' });
      return;
    }

    const price = Number(body.price);
    if (isNaN(price) || price < 0) {
      res.status(400).json({
        error: 'O preço do produto deve ser um valor numérico válido maior ou igual a zero.'
      });
      return;
    }

    const id = 'prod-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 5);
    const newProd: ProductItem = {
      id,
      tenantId: String(body.tenantId),
      name: String(body.name).trim().slice(0, 120),
      category: String(body.category || 'Geral').slice(0, 60),
      price,
      costPrice: Math.max(0, Number(body.costPrice ?? body.cost ?? 0) || 0),
      ...(body.wholesalePrice !== undefined
        ? { wholesalePrice: Math.max(0, Number(body.wholesalePrice) || 0) }
        : {}),
      stock: Math.max(0, Math.floor(Number(body.stock) || 0)),
      minStock: Math.max(0, Math.floor(Number(body.minStock ?? 5))),
      barcode: String(body.barcode || `789${Date.now().toString().slice(-9)}`).slice(0, 48),
      sku: String(body.sku || `SKU-${Date.now().toString(36).toUpperCase()}`).slice(0, 48),
      image: String(
        body.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'
      ).slice(0, 500),
      description: String(body.description || '').slice(0, 400),
      availableOnline: body.availableOnline ?? true,
      ...(body.supplierId ? { supplierId: String(body.supplierId).slice(0, 64) } : {})
    };

    try {
      const saved = await createCatalogProduct(newProd);
      res.status(201).json(saved);
    } catch {
      res.status(500).json({ error: 'Failed to create product.' });
    }
  }
);

/**
 * PATCH /api/products/:id - Update ERP Product & Sync Public Marketplace Projection
 */
productsRouter.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  const id = getParamId(req);
  try {
    const docRef = adminDb.collection('products').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).json({ error: 'Produto não encontrado.' });
      return;
    }

    const prod = doc.data() as ProductItem;
    const isAuthorized =
      req.user?.role === 'hq_admin' ||
      (isTenantManagerRole(req.user?.role) && req.user?.tenantId === prod.tenantId);

    if (!isAuthorized) {
      res.status(403).json({
        error: 'Acesso negado: sem permissão administrativa para este produto.'
      });
      return;
    }

    const updates = { ...req.body };
    delete updates.id;
    delete updates.tenantId;

    if (updates.price !== undefined) {
      const price = Number(updates.price);
      if (isNaN(price) || price < 0) {
        res.status(400).json({ error: 'Preço inválido.' });
        return;
      }
      updates.price = price;
    }

    if (updates.stock !== undefined) {
      const stock = Math.floor(Number(updates.stock));
      if (isNaN(stock) || stock < 0) {
        res.status(400).json({ error: 'Estoque inválido.' });
        return;
      }
      updates.stock = stock;
    }

    const merged = await updateCatalogProduct(prod, updates);
    res.json(merged);
  } catch {
    res.status(500).json({ error: 'Failed to update product.' });
  }
});
