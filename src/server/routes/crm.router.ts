import { Router, Request, Response } from 'express';
import { requireAuth, isTenantStaffRole } from '../middleware/auth.middleware';
import { adminDb } from '../firebase-admin';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';

export const crmRouter = Router();

crmRouter.use(requireAuth);

/**
 * GET /api/crm/consumers
 * List consumers (HQ Admin or Tenant Staff)
 */
crmRouter.get('/consumers', async (req: Request, res: Response) => {
  const caller = req.user;
  if (!caller) {
    res.status(401).json({ error: 'Não autenticado.' });
    return;
  }

  try {
    const snap = await adminDb.collection('consumers').limit(100).get();
    res.json(snap.docs.map((d: QueryDocumentSnapshot) => d.data()));
  } catch {
    res.status(500).json({ error: 'Failed to fetch consumers.' });
  }
});

/**
 * POST /api/crm/consumers
 * Upsert authenticated consumer's own profile
 */
crmRouter.post('/consumers', async (req: Request, res: Response) => {
  const caller = req.user;
  if (!caller) {
    res.status(401).json({ error: 'Não autenticado.' });
    return;
  }
  const body = req.body || {};
  const id = caller.id;
  const profile = {
    id,
    name: String(body.name || caller.name || 'Consumidor').slice(0, 100),
    email: caller.email,
    phone: String(body.phone || '').slice(0, 32),
    address: String(body.address || '').slice(0, 240),
    pointsBalance: Number(body.pointsBalance || 0),
    loyaltyTier: body.loyaltyTier || 'bronze',
    updatedAt: new Date().toISOString()
  };

  try {
    await adminDb.collection('consumers').doc(id).set(profile, { merge: true });
    res.status(201).json(profile);
  } catch {
    res.status(500).json({ error: 'Falha ao atualizar perfil do consumidor.' });
  }
});

/**
 * PATCH /api/crm/consumers/:id
 * Update consumer profile details
 */
crmRouter.patch('/consumers/:id', async (req: Request, res: Response) => {
  const caller = req.user;
  if (!caller) {
    res.status(401).json({ error: 'Não autenticado.' });
    return;
  }

  const p = req.params['id'];
  const consumerId = Array.isArray(p) ? p[0] : p;

  const canEdit = caller.role === 'hq_admin' || isTenantStaffRole(caller.role) || caller.id === consumerId;
  if (!canEdit) {
    res.status(403).json({ error: 'Sem permissão para alterar este perfil.' });
    return;
  }

  const body = req.body || {};
  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString()
  };
  if (typeof body.name === 'string') updates['name'] = body.name.slice(0, 100);
  if (typeof body.phone === 'string') updates['phone'] = body.phone.slice(0, 32);
  if (typeof body.address === 'string') updates['address'] = body.address.slice(0, 240);
  if (typeof body.loyaltyTier === 'string') updates['loyaltyTier'] = body.loyaltyTier;
  if (typeof body.pointsBalance === 'number') updates['pointsBalance'] = body.pointsBalance;

  try {
    const ref = adminDb.collection('consumers').doc(consumerId);
    await ref.set(updates, { merge: true });
    const snap = await ref.get();
    res.json(snap.data());
  } catch {
    res.status(500).json({ error: 'Falha ao atualizar consumidor.' });
  }
});

/**
 * POST /api/crm/loyalty
 */
crmRouter.post('/loyalty', async (req: Request, res: Response) => {
  const caller = req.user;
  if (!caller) {
    res.status(401).json({ error: 'Não autenticado.' });
    return;
  }

  const body = req.body || {};
  const consumerId = String(body.consumerId || caller.id);
  const points = Number(body.points || 0);

  try {
    const ref = adminDb.collection('consumers').doc(consumerId);
    const snap = await ref.get();
    const currentData = snap.exists ? snap.data() || {} : {};
    const currentPoints = Number(currentData['pointsBalance'] || 0);
    const newPoints = Math.max(0, currentPoints + points);

    await ref.set({ pointsBalance: newPoints, updatedAt: new Date().toISOString() }, { merge: true });
    res.json({ consumerId, pointsBalance: newPoints });
  } catch {
    res.status(500).json({ error: 'Falha ao atualizar programa de fidelidade.' });
  }
});

/**
 * GET /api/crm/campaigns
 */
crmRouter.get('/campaigns', async (req: Request, res: Response) => {
  try {
    const snap = await adminDb.collection('crm_campaigns').get();
    res.json(snap.docs.map(d => d.data()));
  } catch {
    res.status(500).json({ error: 'Falha ao listar campanhas.' });
  }
});

/**
 * POST /api/crm/campaigns
 */
crmRouter.post('/campaigns', async (req: Request, res: Response) => {
  const caller = req.user;
  if (!caller) {
    res.status(401).json({ error: 'Não autenticado.' });
    return;
  }

  const body = req.body || {};
  const id = `camp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const campaign = {
    id,
    title: String(body.title || 'Campanha CRM').slice(0, 100),
    channel: body.channel || 'whatsapp',
    targetSegment: body.targetSegment || 'all',
    status: 'scheduled',
    scheduledDate: body.scheduledDate || new Date().toISOString(),
    messageText: String(body.messageText || '').slice(0, 500),
    tenantId: caller.tenantId || 'hq_central',
    createdByUid: caller.id,
    createdAt: new Date().toISOString()
  };

  try {
    await adminDb.collection('crm_campaigns').doc(id).set(campaign);
    res.status(201).json(campaign);
  } catch {
    res.status(500).json({ error: 'Falha ao criar campanha CRM.' });
  }
});
