import { Request, Response, Router } from 'express';
import { StoreTask } from '../../shared/models/ecosystem.model';
import { isTenantManagerRole, requireAuth } from '../middleware/auth.middleware';
import { adminDb } from '../firebase-admin';
import { Transaction } from 'firebase-admin/firestore';

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

function tenantScope(req: Request, requestedTenantId?: unknown): string | null {
  if (!isTenantManagerRole(req.user?.role) || !req.user?.tenantId) return null;
  return requestedTenantId && requestedTenantId !== req.user.tenantId ? null : req.user.tenantId;
}

function deny(res: Response): void {
  res.status(403).json({ error: 'Somente proprietário ou operador da unidade pode gerenciar tarefas.', code: 'FORBIDDEN_ROLE' });
}

tasksRouter.get('/', async (req: Request, res: Response) => {
  const tenantId = tenantScope(req, req.query['tenantId']);
  if (!tenantId) { deny(res); return; }
  try {
    const snapshot = await adminDb.collection('store_tasks').where('tenantId', '==', tenantId).limit(300).get();
    const tasks = snapshot.docs.map((doc) => doc.data() as StoreTask)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    res.json(tasks);
  } catch {
    res.status(500).json({ error: 'Falha ao consultar tarefas.' });
  }
});

tasksRouter.post('/', async (req: Request, res: Response) => {
  const body = req.body || {};
  const tenantId = tenantScope(req, body.tenantId);
  if (!tenantId) { deny(res); return; }
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 160) : '';
  const sector = typeof body.sector === 'string' ? body.sector.trim().slice(0, 60) : '';
  if (!title || !sector) {
    res.status(400).json({ error: 'Título e setor da tarefa são obrigatórios.', code: 'INVALID_TASK' });
    return;
  }
  const ref = adminDb.collection('store_tasks').doc();
  const now = new Date().toISOString();
  const task: StoreTask = { id: ref.id, tenantId, title, sector, completed: false, createdByUid: req.user!.id, createdAt: now, updatedAt: now };
  try {
    await ref.set(task as unknown as Record<string, unknown>);
    res.status(201).json(task);
  } catch {
    res.status(500).json({ error: 'Falha ao cadastrar tarefa.' });
  }
});

tasksRouter.patch('/:id/completed', async (req: Request, res: Response) => {
  const tenantId = tenantScope(req, req.body?.tenantId);
  if (!tenantId) { deny(res); return; }
  if (typeof req.body?.completed !== 'boolean') {
    res.status(400).json({ error: 'Informe completed como booleano.', code: 'INVALID_TASK_STATE' });
    return;
  }
  const id = String(req.params['id'] || '');
  try {
    const ref = adminDb.collection('store_tasks').doc(id);
    const updated = await adminDb.runTransaction(async (transaction: Transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists || snapshot.data()?.['tenantId'] !== tenantId) throw { status: 404, message: 'Tarefa não encontrada nesta unidade.' };
      const now = new Date().toISOString();
      const completed = req.body.completed as boolean;
      const patch: Record<string, unknown> = { completed, updatedAt: now };
      if (completed) patch['completedAt'] = now;
      else patch['completedAt'] = null;
      transaction.update(ref, patch);
      return { ...(snapshot.data() as StoreTask), ...patch };
    });
    res.json(updated);
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ error: err.message || 'Falha ao atualizar tarefa.' });
  }
});
