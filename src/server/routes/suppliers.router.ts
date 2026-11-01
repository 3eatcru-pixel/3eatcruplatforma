import { Request, Response, Router } from 'express';
import { Supplier } from '../../shared/models/ecosystem.model';
import { isTenantManagerRole, requireAuth } from '../middleware/auth.middleware';
import { adminDb } from '../firebase-admin';

export const suppliersRouter = Router();
suppliersRouter.use(requireAuth);

function tenantScope(req: Request, requestedTenantId?: unknown): string | null {
  if (!isTenantManagerRole(req.user?.role) || !req.user?.tenantId) return null;
  return requestedTenantId && requestedTenantId !== req.user.tenantId ? null : req.user.tenantId;
}

function deny(res: Response): void {
  res.status(403).json({ error: 'Somente proprietário ou operador da unidade pode gerenciar fornecedores.', code: 'FORBIDDEN_ROLE' });
}

suppliersRouter.get('/', async (req: Request, res: Response) => {
  const tenantId = tenantScope(req, req.query['tenantId']);
  if (!tenantId) {
    deny(res);
    return;
  }
  try {
    const snapshot = await adminDb.collection('suppliers').where('tenantId', '==', tenantId).limit(300).get();
    const suppliers = snapshot.docs.map((doc) => doc.data() as Supplier & { tenantId: string })
      .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
    res.json(suppliers);
  } catch {
    res.status(500).json({ error: 'Falha ao consultar fornecedores.' });
  }
});

suppliersRouter.post('/', async (req: Request, res: Response) => {
  const body = req.body || {};
  const tenantId = tenantScope(req, body.tenantId);
  if (!tenantId) {
    deny(res);
    return;
  }
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '';
  const category = typeof body.category === 'string' ? body.category.trim().slice(0, 60) : '';
  if (!name || !category) {
    res.status(400).json({ error: 'Nome e categoria são obrigatórios.', code: 'INVALID_SUPPLIER' });
    return;
  }
  const ref = adminDb.collection('suppliers').doc();
  const supplier: Supplier & { tenantId: string; createdAt: string } = {
    id: ref.id,
    tenantId,
    name,
    category,
    contactName: typeof body.contactName === 'string' ? body.contactName.trim().slice(0, 100) : '',
    phone: typeof body.phone === 'string' ? body.phone.trim().slice(0, 32) : '',
    email: typeof body.email === 'string' ? body.email.trim().slice(0, 120) : '',
    ...(typeof body.cnpj === 'string' && body.cnpj.trim() ? { cnpj: body.cnpj.trim().slice(0, 18) } : {}),
    status: 'active',
    createdAt: new Date().toISOString()
  };
  try {
    await ref.set(supplier as unknown as Record<string, unknown>);
    res.status(201).json(supplier);
  } catch {
    res.status(500).json({ error: 'Falha ao cadastrar fornecedor.' });
  }
});

suppliersRouter.patch('/:id/status', async (req: Request, res: Response) => {
  const tenantId = tenantScope(req);
  if (!tenantId) {
    deny(res);
    return;
  }
  const status = req.body?.status;
  if (status !== 'active' && status !== 'inactive') {
    res.status(400).json({ error: 'Status inválido.', code: 'INVALID_SUPPLIER_STATUS' });
    return;
  }
  try {
    const ref = adminDb.collection('suppliers').doc(String(req.params['id'] || ''));
    const snapshot = await ref.get();
    if (!snapshot.exists || snapshot.data()?.['tenantId'] !== tenantId) {
      res.status(404).json({ error: 'Fornecedor não encontrado nesta unidade.' });
      return;
    }
    await ref.update({ status, updatedAt: new Date().toISOString() });
    res.json({ ...(snapshot.data() as Record<string, unknown>), status });
  } catch {
    res.status(500).json({ error: 'Falha ao alterar fornecedor.' });
  }
});
