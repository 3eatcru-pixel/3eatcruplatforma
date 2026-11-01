import { Request, Response, Router } from 'express';
import { ProductItem, StockAuditEntry, StockAuditRecord } from '../../shared/models/ecosystem.model';
import { isTenantManagerRole, requireAuth } from '../middleware/auth.middleware';
import { adminDb } from '../firebase-admin';
import { Transaction } from 'firebase-admin/firestore';

export const stockAuditsRouter = Router();
stockAuditsRouter.use(requireAuth);

function tenantScope(req: Request, requestedTenantId?: unknown): string | null {
  if (!isTenantManagerRole(req.user?.role) || !req.user?.tenantId) return null;
  return requestedTenantId && requestedTenantId !== req.user.tenantId ? null : req.user.tenantId;
}

function deny(res: Response): void {
  res.status(403).json({ error: 'Somente proprietário ou operador da unidade pode fazer contagem de estoque.', code: 'FORBIDDEN_ROLE' });
}

stockAuditsRouter.get('/', async (req: Request, res: Response) => {
  const tenantId = tenantScope(req, req.query['tenantId']);
  if (!tenantId) { deny(res); return; }
  try {
    const snapshot = await adminDb.collection('stock_audits').where('tenantId', '==', tenantId).limit(100).get();
    const audits = snapshot.docs.map((doc) => doc.data() as StockAuditRecord)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    res.json(audits);
  } catch {
    res.status(500).json({ error: 'Falha ao consultar contagens de estoque.' });
  }
});

stockAuditsRouter.post('/', async (req: Request, res: Response) => {
  const tenantId = tenantScope(req, req.body?.tenantId);
  if (!tenantId) { deny(res); return; }
  const input = req.body?.entries;
  if (!Array.isArray(input) || input.length < 1 || input.length > 200) {
    res.status(400).json({ error: 'Informe de 1 a 200 itens para a contagem.', code: 'INVALID_STOCK_AUDIT' });
    return;
  }
  const productIds = input.map((entry: unknown) => String((entry as { productId?: unknown })?.productId || ''));
  if (productIds.some((id: string) => !id) || new Set(productIds).size !== productIds.length) {
    res.status(400).json({ error: 'Os produtos devem ser válidos e únicos.', code: 'INVALID_STOCK_AUDIT' });
    return;
  }
  const countedByProduct = new Map<string, number>();
  for (const item of input as { productId: string; countedStock: unknown }[]) {
    const countedStock = Number(item.countedStock);
    if (!Number.isSafeInteger(countedStock) || countedStock < 0) {
      res.status(400).json({ error: 'A quantidade contada deve ser um inteiro maior ou igual a zero.', code: 'INVALID_STOCK_COUNT' });
      return;
    }
    countedByProduct.set(item.productId, countedStock);
  }

  const auditRef = adminDb.collection('stock_audits').doc();
  try {
    const record = await adminDb.runTransaction(async (transaction: Transaction) => {
      const productRefs = productIds.map((id: string) => adminDb.collection('products').doc(id));
      const snapshots = await Promise.all(productRefs.map((ref) => transaction.get(ref)));
      const entries: StockAuditEntry[] = snapshots.map((snapshot) => {
        if (!snapshot.exists) throw { status: 404, message: 'Produto não encontrado.' };
        const product = snapshot.data() as ProductItem;
        if (product.tenantId !== tenantId) throw { status: 403, message: 'A contagem contém produto de outra unidade.' };
        const countedStock = countedByProduct.get(product.id)!;
        const systemStock = Math.max(0, Math.floor(Number(product.stock) || 0));
        return { productId: product.id, name: product.name, sku: product.sku, systemStock, countedStock, difference: countedStock - systemStock };
      });
      const audit: StockAuditRecord = {
        id: auditRef.id,
        tenantId,
        createdByUid: req.user!.id,
        createdAt: new Date().toISOString(),
        status: 'counted',
        entries,
        varianceCount: entries.filter((entry) => entry.difference !== 0).length
      };
      transaction.create(auditRef, audit as unknown as Record<string, unknown>);
      return audit;
    });
    res.status(201).json(record);
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ error: err.message || 'Falha ao salvar a contagem.' });
  }
});
