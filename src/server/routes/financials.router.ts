import { Router, Request, Response } from 'express';
import { FinancialRecord } from '../../shared/models/ecosystem.model';
import {
  isTenantManagerRole,
  requireAuth,
  requireTenantAccess
} from '../middleware/auth.middleware';
import { adminDb } from '../firebase-admin';
import { Query } from 'firebase-admin/firestore';

export const financialsRouter = Router();

financialsRouter.use(requireAuth);

/**
 * GET /api/financials - List financial records with strict tenant isolation
 * Accessible only to HQ Admin, Tenant Owner, or Store Operator (Waiters/Drivers/Consumers blocked).
 */
financialsRouter.get('/', async (req: Request, res: Response) => {
  const type = req.query['type'] as string | undefined;
  const requestedTenantId = req.query['tenantId'] as string | undefined;

  try {
    let query: Query = adminDb.collection('financials');

    if (req.user?.role === 'hq_admin') {
      if (requestedTenantId) {
        query = query.where('tenantId', '==', requestedTenantId);
      }
    } else if (isTenantManagerRole(req.user?.role)) {
      const managerTenantId = req.user?.tenantId;
      if (!managerTenantId) {
        res.status(403).json({ error: 'Gestor não possui estabelecimento vinculado.' });
        return;
      }
      if (requestedTenantId && requestedTenantId !== managerTenantId) {
        res.status(403).json({
          error: 'Acesso negado: tentativa de consultar financeiro de outro estabelecimento.',
          code: 'TENANT_MISMATCH'
        });
        return;
      }
      query = query.where('tenantId', '==', managerTenantId);
    } else {
      res.status(403).json({ error: 'Acesso não autorizado ao módulo financeiro.' });
      return;
    }

    if (type) {
      query = query.where('type', '==', type);
    }

    const snap = await query.orderBy('date', 'desc').get();
    res.json(snap.docs.map((doc) => doc.data()));
  } catch {
    res.status(500).json({ error: 'Failed to fetch financial records.' });
  }
});

/**
 * POST /api/financials - Add manual treasury transaction (suprimento, sangria, despesa)
 * P1.7: `type: 'sale'` is strictly forbidden on manual endpoints — sales are posted exclusively by CommerceEngine (`fin-sale-*`).
 */
financialsRouter.post(
  '/',
  requireTenantAccess((req) => req.body.tenantId || req.user?.tenantId),
  async (req: Request, res: Response) => {
    const body = req.body || {};

    if (body.type === 'sale') {
      res.status(403).json({
        error: 'Lançamentos do tipo "sale" são exclusivos do Motor Comercial (CommerceEngine). Use "income" para suprimentos/aportes ou "expense" para sangrias/despesas.',
        code: 'MANUAL_SALE_FORBIDDEN'
      });
      return;
    }

    const validManualTypes: ('income' | 'expense')[] = ['income', 'expense'];
    const validStatuses: FinancialRecord['status'][] = ['cleared', 'pending'];

    const recordType: FinancialRecord['type'] = validManualTypes.includes(body.type)
      ? body.type
      : 'expense';
    const recordStatus: FinancialRecord['status'] = validStatuses.includes(body.status)
      ? body.status
      : 'cleared';

    if (!body.description || body.amount === undefined) {
      res.status(400).json({ error: 'description e amount são obrigatórios.' });
      return;
    }

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ error: 'O valor da transação deve ser um número positivo e finito.' });
      return;
    }

    const assignedTenantId =
      body.tenantId || (isTenantManagerRole(req.user?.role) ? req.user?.tenantId : 'hq');

    const isSimulated = req.user?.role === 'hq_admin' && Boolean(body.isSimulated);
    const id = 'fin-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 5);
    const newRecord: FinancialRecord = {
      id,
      tenantId: assignedTenantId!,
      date: typeof body.date === 'string' && body.date.length > 5 ? body.date : new Date().toISOString(),
      type: recordType,
      category: String(body.category || 'Operacional Loja').slice(0, 100),
      description: String(body.description).trim().slice(0, 200),
      amount,
      status: recordStatus,
      paymentMethod: String(body.paymentMethod || 'Dinheiro').slice(0, 50),
      referenceId: String(body.referenceId || `ref-${Date.now().toString(36)}`).slice(0, 100),
      isSimulated,
      mode: isSimulated ? 'simulation' : 'real'
    };

    try {
      await adminDb.collection('financials').doc(id).set(newRecord);
      res.status(201).json(newRecord);
    } catch {
      res.status(500).json({ error: 'Failed to create financial record.' });
    }
  }
);
