import { Router, Request, Response } from 'express';
import { isTenantManagerRole, requireAuth, requireHqAdmin } from '../middleware/auth.middleware';
import { adminDb } from '../firebase-admin';
import { FieldPath, Query, QueryDocumentSnapshot } from 'firebase-admin/firestore';

export const crmRouter = Router();

crmRouter.use(requireAuth);

/** HQ-only, cursor-paginated contact directory; profile addresses and identity data stay private. */
crmRouter.get('/consumers', requireHqAdmin, async (req: Request, res: Response) => {
  const pageSize = 50;
  const rawPageToken = req.query['pageToken'];
  if (rawPageToken !== undefined && typeof rawPageToken !== 'string') {
    res.status(400).json({ error: 'Cursor de consumidores inválido.', code: 'INVALID_PAGE_TOKEN' });
    return;
  }
  const pageToken = rawPageToken as string | undefined;

  let cursorId: string | undefined;
  if (pageToken !== undefined) {
    if (!/^[A-Za-z0-9_-]{1,2048}$/.test(pageToken)) {
      res.status(400).json({ error: 'Cursor de consumidores inválido.', code: 'INVALID_PAGE_TOKEN' });
      return;
    }
    try {
      const decoded = Buffer.from(pageToken, 'base64url').toString('utf8');
      if (!decoded || Buffer.byteLength(decoded, 'utf8') > 1500 || decoded.includes('/') ||
        Buffer.from(decoded, 'utf8').toString('base64url') !== pageToken) {
        throw new Error('Invalid cursor');
      }
      cursorId = decoded;
    } catch {
      res.status(400).json({ error: 'Cursor de consumidores inválido.', code: 'INVALID_PAGE_TOKEN' });
      return;
    }
  }

  try {
    const collection = adminDb.collection('consumers');
    let query = collection.orderBy(FieldPath.documentId());
    if (cursorId) {
      const cursor = await collection.doc(cursorId).get();
      if (!cursor.exists) {
        res.status(400).json({ error: 'Cursor expirou; atualize o diretório.', code: 'INVALID_PAGE_TOKEN' });
        return;
      }
      query = query.startAfter(cursor);
    }

    const snap = await query.select('name', 'email', 'phone', 'updatedAt').limit(pageSize + 1).get();
    const hasMore = snap.docs.length > pageSize;
    const pageDocs = snap.docs.slice(0, pageSize);
    const items = pageDocs.map((doc: QueryDocumentSnapshot) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: typeof data['name'] === 'string' ? data['name'] : '',
        email: typeof data['email'] === 'string' ? data['email'] : '',
        phone: typeof data['phone'] === 'string' ? data['phone'] : '',
        ...(typeof data['updatedAt'] === 'string' ? { updatedAt: data['updatedAt'] } : {})
      };
    });

    res.json({
      items,
      nextPageToken: hasMore && pageDocs.length ? Buffer.from(pageDocs[pageDocs.length - 1]!.id).toString('base64url') : null,
      pageSize
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch consumers.' });
  }
});

/** An authenticated consumer can read only the contact profile keyed by their UID. */
crmRouter.get('/consumers/me', async (req: Request, res: Response) => {
  const caller = req.user;
  if (!caller || caller.role !== 'consumer') {
    res.status(403).json({ error: 'Somente consumidores podem consultar o próprio perfil.' });
    return;
  }

  try {
    const profile = await adminDb.collection('consumers').doc(caller.id).get();
    if (!profile.exists) {
      res.status(404).json({ error: 'Perfil de consumidor não encontrado.', code: 'CONSUMER_NOT_FOUND' });
      return;
    }
    res.json(profile.data());
  } catch {
    res.status(500).json({ error: 'Falha ao consultar perfil do consumidor.' });
  }
});

/** A consumer can create or update only their own contact profile. */
crmRouter.post('/consumers', async (req: Request, res: Response) => {
  const caller = req.user;
  if (!caller || caller.role !== 'consumer') {
    res.status(403).json({ error: 'Somente consumidores podem atualizar o próprio perfil.' });
    return;
  }

  const body = req.body || {};
  const id = caller.id;
  const primaryAddress = String(body.primaryAddress || body.address || '').trim().slice(0, 240);
  const phone = String(body.phone || '').trim().slice(0, 32);
  const neighborhood = String(body.neighborhood || '').trim().slice(0, 100);
  const city = String(body.city || '').trim().slice(0, 100);
  if (phone.length < 8 || primaryAddress.length < 5 || !neighborhood || !city) {
    res.status(400).json({ error: 'Informe telefone, endereço, bairro e cidade válidos.', code: 'INVALID_CONSUMER_PROFILE' });
    return;
  }
  const profile = {
    id,
    name: String(body.name || caller.name || 'Consumidor').trim().slice(0, 100),
    email: caller.email,
    phone,
    address: primaryAddress,
    primaryAddress,
    neighborhood,
    city,
    updatedAt: new Date().toISOString()
  };

  try {
    const ref = adminDb.collection('consumers').doc(id);
    await ref.set(profile, { merge: true });
    const saved = await ref.get();
    res.status(201).json(saved.data());
  } catch {
    res.status(500).json({ error: 'Falha ao atualizar perfil do consumidor.' });
  }
});

crmRouter.patch('/consumers/:id', async (req: Request, res: Response) => {
  const caller = req.user;
  const p = req.params['id'];
  const consumerId = Array.isArray(p) ? p[0] : p;
  const canEdit = caller?.role === 'hq_admin' ||
    (caller?.role === 'consumer' && caller.id === consumerId);
  if (!caller || !canEdit) {
    res.status(403).json({ error: 'Apenas o titular pode editar os dados de contato.' });
    return;
  }

  const body = req.body || {};
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (typeof body.name === 'string') updates['name'] = body.name.trim().slice(0, 100);
  if (typeof body.phone === 'string') updates['phone'] = body.phone.trim().slice(0, 32);
  const primaryAddress = typeof body.primaryAddress === 'string' ? body.primaryAddress : body.address;
  if (typeof primaryAddress === 'string') {
    const normalizedAddress = primaryAddress.trim().slice(0, 240);
    updates['address'] = normalizedAddress;
    updates['primaryAddress'] = normalizedAddress;
  }
  if (typeof body.neighborhood === 'string') updates['neighborhood'] = body.neighborhood.trim().slice(0, 100);
  if (typeof body.city === 'string') updates['city'] = body.city.trim().slice(0, 100);

  try {
    const ref = adminDb.collection('consumers').doc(consumerId);
    const before = await ref.get();
    if (!before.exists) {
      res.status(404).json({ error: 'Perfil de consumidor não encontrado.', code: 'CONSUMER_NOT_FOUND' });
      return;
    }
    await ref.set(updates, { merge: true });
    const after = await ref.get();
    res.json(after.data());
  } catch {
    res.status(500).json({ error: 'Falha ao atualizar consumidor.' });
  }
});

/** Loyalty balances remain disabled until the product defines tenant ownership and point rules. */
crmRouter.post('/loyalty', (_req: Request, res: Response) => {
  res.status(501).json({
    error: 'Programa de fidelidade ainda não configurado para esta unidade.',
    code: 'LOYALTY_POLICY_NOT_CONFIGURED'
  });
});

crmRouter.get('/campaigns', async (req: Request, res: Response) => {
  const caller = req.user;
  const requestedTenantId = String(req.query['tenantId'] || '').trim();
  let query: Query = adminDb.collection('crm_campaigns');

  if (caller?.role === 'hq_admin') {
    if (requestedTenantId) query = query.where('tenantId', '==', requestedTenantId);
  } else if (isTenantManagerRole(caller?.role) && caller?.tenantId) {
    if (requestedTenantId && requestedTenantId !== caller.tenantId) {
      res.status(403).json({ error: 'Acesso negado às campanhas de outra unidade.', code: 'TENANT_MISMATCH' });
      return;
    }
    query = query.where('tenantId', '==', caller.tenantId);
  } else {
    res.status(403).json({ error: 'Somente a gestão da unidade pode consultar campanhas.' });
    return;
  }

  try {
    const snap = await query.limit(100).get();
    res.json(snap.docs.map((doc: QueryDocumentSnapshot) => doc.data()));
  } catch {
    res.status(500).json({ error: 'Falha ao listar campanhas.' });
  }
});

crmRouter.post('/campaigns', async (req: Request, res: Response) => {
  const caller = req.user;
  const isHq = caller?.role === 'hq_admin';
  const isManager = isTenantManagerRole(caller?.role);
  if (!caller || (!isHq && !isManager)) {
    res.status(403).json({ error: 'Somente HQ ou gestão da unidade pode criar rascunhos de campanha.' });
    return;
  }

  const body = req.body || {};
  const title = String(body.title || '').trim().slice(0, 100);
  const content = String(body.content || body.messageText || '').trim().slice(0, 500);
  const platform = String(body.platform || body.channel || 'whatsapp');
  const allowedPlatforms = new Set(['whatsapp', 'email', 'sms', 'push', 'instagram']);
  if (!title || !content || !allowedPlatforms.has(platform)) {
    res.status(400).json({ error: 'Título, conteúdo e canal válido são obrigatórios.', code: 'INVALID_CAMPAIGN' });
    return;
  }

  const tenantId = isHq
    ? String(body.tenantId || 'hq_central').trim()
    : String(caller.tenantId || '').trim();
  if (!tenantId || (!isHq && body.tenantId && body.tenantId !== tenantId)) {
    res.status(403).json({ error: 'Campanha fora do escopo da unidade.', code: 'TENANT_MISMATCH' });
    return;
  }

  const id = `camp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const campaign = {
    id,
    tenantId,
    title,
    platform,
    targetAudience: String(body.targetAudience || body.targetSegment || 'all').slice(0, 80),
    content,
    status: 'draft' as const,
    reach: 0,
    conversions: 0,
    sentAt: '',
    createdByUid: caller.id,
    createdAt: new Date().toISOString()
  };

  try {
    await adminDb.collection('crm_campaigns').doc(id).set(campaign);
    res.status(201).json(campaign);
  } catch {
    res.status(500).json({ error: 'Falha ao salvar rascunho de campanha.' });
  }
});

crmRouter.post('/campaigns/:id/dispatch', async (req: Request, res: Response) => {
  const caller = req.user;
  const p = req.params['id'];
  const id = Array.isArray(p) ? p[0] : p;
  try {
    const ref = adminDb.collection('crm_campaigns').doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      res.status(404).json({ error: 'Campanha não encontrada.', code: 'CAMPAIGN_NOT_FOUND' });
      return;
    }
    const campaign = snap.data() as { tenantId?: string };
    const authorized = caller?.role === 'hq_admin' ||
      (isTenantManagerRole(caller?.role) && caller?.tenantId === campaign.tenantId);
    if (!authorized) {
      res.status(403).json({ error: 'Acesso negado a esta campanha.', code: 'TENANT_MISMATCH' });
      return;
    }
    res.status(501).json({ error: 'Canal externo não está conectado; o rascunho não foi enviado.', code: 'CAMPAIGN_PROVIDER_NOT_CONFIGURED' });
  } catch {
    res.status(500).json({ error: 'Falha ao consultar campanha.' });
  }
});
