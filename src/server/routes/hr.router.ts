import { Request, Response, Router } from 'express';
import { randomUUID } from 'node:crypto';
import { ClockEvent, Employee } from '../../shared/models/ecosystem.model';
import { isTenantManagerRole, requireAuth } from '../middleware/auth.middleware';
import { adminDb } from '../firebase-admin';
import { Transaction } from 'firebase-admin/firestore';

export const hrRouter = Router();
hrRouter.use(requireAuth);

const EMPLOYEE_ROLES = new Set<Employee['role']>([
  'gerente', 'caixa', 'cozinheiro', 'garçom', 'entregador', 'atendente'
]);
const SHIFTS = new Set<Employee['shift']>(['integral', 'manhã', 'tarde', 'noite']);

function tenantScope(req: Request, requestedTenantId?: unknown): string | null {
  if (!isTenantManagerRole(req.user?.role) || !req.user?.tenantId) return null;
  const tenantId = req.user.tenantId;
  if (requestedTenantId && requestedTenantId !== tenantId) return null;
  return tenantId;
}

function denyManagerAccess(res: Response): void {
  res.status(403).json({ error: 'Somente proprietário ou operador da unidade pode acessar o RH.', code: 'FORBIDDEN_ROLE' });
}

hrRouter.get('/employees', async (req: Request, res: Response) => {
  const tenantId = tenantScope(req, req.query['tenantId']);
  if (!tenantId) {
    denyManagerAccess(res);
    return;
  }
  try {
    const snapshot = await adminDb.collection('hr_employees').where('tenantId', '==', tenantId).limit(300).get();
    const employees = snapshot.docs.map((doc) => {
      const data = doc.data() as Employee;
      return {
        id: data.id,
        tenantId: data.tenantId,
        name: data.name,
        role: data.role,
        shift: data.shift,
        hireDate: data.hireDate,
        status: data.status
      };
    });
    res.json(employees);
  } catch {
    res.status(500).json({ error: 'Falha ao consultar colaboradores.' });
  }
});

hrRouter.post('/employees', async (req: Request, res: Response) => {
  const body = req.body || {};
  const tenantId = tenantScope(req, body.tenantId);
  if (!tenantId) {
    denyManagerAccess(res);
    return;
  }

  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : '';
  const role = body.role as Employee['role'];
  const shift = body.shift as Employee['shift'];
  const hireDate = typeof body.hireDate === 'string' ? body.hireDate : new Date().toISOString().slice(0, 10);
  if (!name || !EMPLOYEE_ROLES.has(role) || !SHIFTS.has(shift) || !/^\d{4}-\d{2}-\d{2}$/.test(hireDate) || Number.isNaN(Date.parse(`${hireDate}T00:00:00Z`))) {
    res.status(400).json({ error: 'Nome, função, turno e data de admissão válidos são obrigatórios.', code: 'INVALID_EMPLOYEE' });
    return;
  }

  const ref = adminDb.collection('hr_employees').doc();
  const employee: Employee = {
    id: ref.id,
    tenantId,
    name,
    role,
    shift,
    hireDate,
    status: 'active'
  };
  try {
    await ref.set(employee as unknown as Record<string, unknown>);
    res.status(201).json(employee);
  } catch {
    res.status(500).json({ error: 'Falha ao cadastrar colaborador.' });
  }
});

hrRouter.delete('/employees/:id', async (req: Request, res: Response) => {
  const tenantId = tenantScope(req);
  if (!tenantId) {
    denyManagerAccess(res);
    return;
  }
  const id = String(req.params['id'] || '');
  try {
    const ref = adminDb.collection('hr_employees').doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists || snapshot.data()?.['tenantId'] !== tenantId) {
      res.status(404).json({ error: 'Colaborador não encontrado.' });
      return;
    }
    await ref.update({ status: 'fired', updatedAt: new Date().toISOString() });
    res.json({ success: true, id, status: 'fired' });
  } catch {
    res.status(500).json({ error: 'Falha ao desativar colaborador.' });
  }
});

hrRouter.get('/clock-events', async (req: Request, res: Response) => {
  const tenantId = tenantScope(req, req.query['tenantId']);
  if (!tenantId) {
    denyManagerAccess(res);
    return;
  }
  try {
    const snapshot = await adminDb.collection('hr_clock_events')
      .where('tenantId', '==', tenantId).limit(100).get();
    const events = snapshot.docs.map((doc) => doc.data() as ClockEvent)
      .sort((left, right) => String(right.timestamp || '').localeCompare(String(left.timestamp || '')));
    res.json(events);
  } catch {
    res.status(500).json({ error: 'Falha ao consultar registros de ponto.' });
  }
});

hrRouter.post('/employees/:id/clock', async (req: Request, res: Response) => {
  const tenantId = tenantScope(req);
  if (!tenantId) {
    denyManagerAccess(res);
    return;
  }
  const employeeId = String(req.params['id'] || '');
  const employeeRef = adminDb.collection('hr_employees').doc(employeeId);
  const eventRef = adminDb.collection('hr_clock_events').doc(randomUUID());
  try {
    const event = await adminDb.runTransaction(async (transaction: Transaction) => {
      const snapshot = await transaction.get(employeeRef);
      if (!snapshot.exists || snapshot.data()?.['tenantId'] !== tenantId || snapshot.data()?.['status'] !== 'active') {
        throw { status: 404, message: 'Colaborador ativo não encontrado nesta unidade.' };
      }
      const employee = snapshot.data() as Employee & { clockState?: 'in' | 'out' };
      const clockEvent: ClockEvent = {
        id: eventRef.id,
        tenantId,
        employeeId,
        employeeName: employee.name,
        timestamp: new Date().toISOString(),
        type: employee.clockState === 'in' ? 'out' : 'in'
      };
      transaction.update(employeeRef, { clockState: clockEvent.type, lastClockAt: clockEvent.timestamp });
      transaction.create(eventRef, clockEvent as unknown as Record<string, unknown>);
      return clockEvent;
    });
    res.status(201).json(event);
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ error: err.message || 'Falha ao registrar ponto.' });
  }
});
