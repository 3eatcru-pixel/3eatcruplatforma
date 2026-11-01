import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { adminDb } from '../firebase-admin';
import { MemoNote } from '../../shared/models/ecosystem.model';
import { randomUUID } from 'node:crypto';

export const notesRouter = Router();

notesRouter.use(requireAuth);

notesRouter.get('/', async (req: Request, res: Response) => {
  const caller = req.user;
  if (!caller) {
    res.status(401).json({ error: 'Não autenticado.' });
    return;
  }
  try {
    let query = adminDb.collection('notes').where('createdByUid', '==', caller.id);
    const requestedTenantId = String(req.query['tenantId'] || '').trim();
    if (requestedTenantId) {
      if (caller.role !== 'hq_admin' && caller.tenantId !== requestedTenantId) {
        res.status(403).json({ error: 'Acesso negado às notas de outra unidade.', code: 'TENANT_MISMATCH' });
        return;
      }
      query = query.where('tenantId', '==', requestedTenantId);
    }
    const snap = await query.limit(200).get();
    const notes = snap.docs.map(d => d.data() as MemoNote)
      .sort((left, right) => String(right.updatedAt || right.createdAt || '').localeCompare(String(left.updatedAt || left.createdAt || '')));
    res.json(notes);
  } catch {
    res.status(500).json({ error: 'Falha ao buscar notas.' });
  }
});

notesRouter.post('/', async (req: Request, res: Response) => {
  const caller = req.user;
  if (!caller) {
    res.status(401).json({ error: 'Não autenticado.' });
    return;
  }
  const body = req.body || {};
  const requestedTenantId = typeof body.tenantId === 'string' ? body.tenantId.trim() : '';
  if (requestedTenantId && caller.role !== 'hq_admin' && caller.tenantId !== requestedTenantId) {
    res.status(403).json({ error: 'Acesso negado às notas de outra unidade.', code: 'TENANT_MISMATCH' });
    return;
  }
  const id = randomUUID();
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 100) : '';
  const content = typeof body.content === 'string' ? body.content.trim().slice(0, 2000) : '';
  if (!title || !content) {
    res.status(400).json({ error: 'Título e conteúdo são obrigatórios.', code: 'INVALID_NOTE' });
    return;
  }
  const now = new Date().toISOString();
  const newNote: MemoNote = {
    id,
    title,
    content,
    category: typeof body.category === 'string' ? body.category.trim().slice(0, 40) : 'Geral',
    color: ['yellow', 'blue', 'green', 'pink'].includes(body.color) ? body.color : 'yellow',
    createdAt: now,
    updatedAt: now,
    createdByUid: caller.id,
    ...(requestedTenantId ? { tenantId: requestedTenantId } : {})
  };

  try {
    await adminDb.collection('notes').doc(id).set(newNote);
    res.status(201).json(newNote);
  } catch {
    res.status(500).json({ error: 'Falha ao salvar nota.' });
  }
});

notesRouter.delete('/:id', async (req: Request, res: Response) => {
  const caller = req.user;
  if (!caller) {
    res.status(401).json({ error: 'Não autenticado.' });
    return;
  }
  const param = req.params['id'];
    const id = Array.isArray(param) ? param[0] : param;

  try {
    const ref = adminDb.collection('notes').doc(id);
    const snap = await ref.get();
    if (snap.exists && snap.data()?.['createdByUid'] === caller.id) {
      await ref.delete();
      res.json({ success: true, id });
    } else {
      res.status(404).json({ error: 'Nota não encontrada ou sem permissão.' });
    }
  } catch {
    res.status(500).json({ error: 'Falha ao excluir nota.' });
  }
});
