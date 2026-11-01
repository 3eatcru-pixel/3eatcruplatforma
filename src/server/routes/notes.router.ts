import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { adminDb } from '../firebase-admin';
import { MemoNote } from '../../shared/models/ecosystem.model';

export const notesRouter = Router();

notesRouter.use(requireAuth);

notesRouter.get('/', async (req: Request, res: Response) => {
  const caller = req.user;
  if (!caller) {
    res.status(401).json({ error: 'Não autenticado.' });
    return;
  }
  try {
    const snap = await adminDb.collection('notes').where('createdByUid', '==', caller.id).get();
    const notes = snap.docs.map(d => d.data() as MemoNote);
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
  const id = `note-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const newNote: MemoNote = {
    id,
    title: String(body.title || 'Nova Anotação').slice(0, 100),
    content: String(body.content || '').slice(0, 2000),
    category: body.category || 'Geral',
    color: body.color || 'yellow',
    createdAt: new Date().toISOString(),
    createdByUid: caller.id
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
