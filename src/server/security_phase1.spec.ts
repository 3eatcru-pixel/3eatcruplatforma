import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express, { Express } from 'express';
import { AddressInfo } from 'net';
import { Server } from 'http';
import { __setFirebaseAdminTestOverrides } from './firebase-admin';
import { apiRouter } from './api';
import { isHqAdminEmail } from './middleware/auth.middleware';

type StoreMap = Record<string, Map<string, Record<string, unknown>>>;

const store: StoreMap = {};
const mockTokens = new Map<string, Record<string, unknown>>();
let txLock: Promise<void> = Promise.resolve();

function getCol(name: string): Map<string, Record<string, unknown>> {
  if (!store[name]) {
    store[name] = new Map();
  }
  return store[name]!;
}

function resetMockDb(): void {
  for (const key of Object.keys(store)) {
    delete store[key];
  }
  mockTokens.clear();
}

const buildDocRef = (colName: string, docId: string) => ({
  id: docId,
  _col: colName,
  async get() {
    const col = getCol(colName);
    const val = col.get(docId);
    return {
      id: docId,
      exists: val !== undefined,
      data: () => (val ? structuredClone(val) : undefined)
    };
  },
  async set(data: Record<string, unknown>, opts?: { merge?: boolean }) {
    const col = getCol(colName);
    if (opts?.merge && col.has(docId)) {
      col.set(docId, { ...col.get(docId)!, ...structuredClone(data) });
    } else {
      col.set(docId, structuredClone(data));
    }
  },
  async update(updates: Record<string, unknown>) {
    const col = getCol(colName);
    const current = col.get(docId);
    if (!current) throw new Error(`Document ${colName}/${docId} does not exist`);
    col.set(docId, { ...current, ...structuredClone(updates) });
  }
});

const buildQuery = (
  colName: string,
  filters: ((item: Record<string, unknown>) => boolean)[] = []
) => ({
  where(field: string, op: string, value: unknown) {
    const nextFilter = (item: Record<string, unknown>) => {
      const fieldVal = item[field];
      if (op === '==') return fieldVal === value;
      if (op === 'in' && Array.isArray(value)) return value.includes(fieldVal);
      if (op === 'array-contains' && Array.isArray(fieldVal)) return fieldVal.includes(value);
      return false;
    };
    return buildQuery(colName, [...filters, nextFilter]);
  },
  orderBy() {
    return buildQuery(colName, filters);
  },
  limit() {
    return buildQuery(colName, filters);
  },
  async get() {
    const col = getCol(colName);
    const matched = Array.from(col.entries())
      .filter(([, v]) => filters.every((fn) => fn(v)))
      .map(([k, v]) => ({
        id: k,
        exists: true,
        data: () => structuredClone(v)
      }));
    return {
      empty: matched.length === 0,
      docs: matched
    };
  }
});

const mockAdminDb = {
  collection(colName: string) {
    return {
      doc: (docId?: string) =>
        buildDocRef(colName, docId || `auto-${Math.random().toString(36).slice(2, 8)}`),
      where: (field: string, op: string, value: unknown) =>
        buildQuery(colName).where(field, op, value),
      orderBy: () => buildQuery(colName),
      get: () => buildQuery(colName).get()
    };
  },
  batch() {
    const ops: (() => Promise<void>)[] = [];
    return {
      set(
        ref: { set: (d: Record<string, unknown>, opts?: { merge?: boolean }) => Promise<void> },
        data: Record<string, unknown>,
        opts?: { merge?: boolean }
      ) {
        ops.push(() => ref.set(data, opts));
      },
      update(
        ref: { update: (d: Record<string, unknown>) => Promise<void> },
        data: Record<string, unknown>
      ) {
        ops.push(() => ref.update(data));
      },
      async commit() {
        for (const op of ops) {
          await op();
        }
      }
    };
  },
  async runTransaction<T>(
    updateFn: (tx: {
      get: (ref: { get: () => Promise<unknown> }) => Promise<unknown>;
      create: (
        ref: {
          get: () => Promise<unknown>;
          set: (d: Record<string, unknown>, opts?: { merge?: boolean }) => Promise<void>;
        },
        d: Record<string, unknown>
      ) => void;
      set: (
        ref: { set: (d: Record<string, unknown>, opts?: { merge?: boolean }) => Promise<void> },
        d: Record<string, unknown>,
        opts?: { merge?: boolean }
      ) => void;
      update: (
        ref: { update: (d: Record<string, unknown>) => Promise<void> },
        d: Record<string, unknown>
      ) => void;
    }) => Promise<T>
  ): Promise<T> {
    const prevLock = txLock;
    let releaseLock!: () => void;
    txLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    await prevLock;
    try {
      const stagedWrites: (() => Promise<void>)[] = [];
      const tx = {
        async get(ref: { get: () => Promise<unknown> }) {
          return ref.get();
        },
        create(
          ref: {
            get: () => Promise<unknown>;
            set: (d: Record<string, unknown>, opts?: { merge?: boolean }) => Promise<void>;
          },
          data: Record<string, unknown>
        ) {
          stagedWrites.push(async () => {
            const snapshot = await ref.get() as { exists?: boolean };
            if (snapshot.exists) throw new Error('Document already exists');
            await ref.set(data);
          });
        },
        set(
          ref: { set: (d: Record<string, unknown>, opts?: { merge?: boolean }) => Promise<void> },
          data: Record<string, unknown>,
          opts?: { merge?: boolean }
        ) {
          stagedWrites.push(() => ref.set(data, opts));
        },
        update(
          ref: { update: (d: Record<string, unknown>) => Promise<void> },
          data: Record<string, unknown>
        ) {
          stagedWrites.push(() => ref.update(data));
        }
      };

      const result = await updateFn(tx);
      for (const commitOp of stagedWrites) {
        await commitOp();
      }
      return result;
    } finally {
      releaseLock();
    }
  }
};

const mockAdminAuth = {
  async verifyIdToken(token: string) {
    const decoded = mockTokens.get(token);
    if (!decoded) {
      throw new Error('Invalid Firebase ID Token');
    }
    return decoded;
  },
  async getUser(uid: string) {
    return { uid, customClaims: {} };
  },
  async setCustomUserClaims() {
    return;
  }
};

async function withServer(run: (baseUrl: string) => Promise<void>): Promise<void> {
  const app: Express = express();
  app.use(express.json());
  app.use('/api', apiRouter);

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  const { port } = server.address() as AddressInfo;
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

describe('AUDITORIA NÚCLEO 3EATCRU (v6) — Segurança, Multi-Tenant, Pagamentos e Motor Comercial Unificado', () => {
  beforeEach(() => {
    resetMockDb();
    __setFirebaseAdminTestOverrides({ db: mockAdminDb, auth: mockAdminAuth });

    getCol('tenants').set('tenant-a', {
      id: 'tenant-a',
      name: 'Burger Artesanal A',
      legalName: 'Burger A LTDA',
      cnpj: '11.111.111/0001-11',
      category: 'restaurant',
      plan: 'Professional',
      status: 'active',
      ownerUid: 'uid-owner-a',
      staffUids: ['uid-owner-a', 'uid-op-a', 'uid-waiter-a'],
      contactEmail: 'dono@burgera.com.br',
      phone: '(11) 91111-1111',
      createdAt: new Date().toISOString(),
      deliveryRadiusKm: 5,
      serviceFeePercent: 8,
      minOrderValue: 25,
      deliveryFee: 6,
      activeDevicesCount: 1,
      devicesLimit: 5,
      isOpen: true,
      supportsDelivery: true,
      supportsTakeout: true
    });

    getCol('tenants').set('tenant-b', {
      id: 'tenant-b',
      name: 'Sushi Prime B',
      legalName: 'Sushi B LTDA',
      cnpj: '22.222.222/0001-22',
      category: 'restaurant',
      plan: 'Starter',
      status: 'active',
      ownerUid: 'uid-owner-b',
      staffUids: ['uid-owner-b'],
      contactEmail: 'dono@sushib.com.br',
      phone: '(11) 92222-2222',
      createdAt: new Date().toISOString(),
      deliveryRadiusKm: 5,
      serviceFeePercent: 8,
      minOrderValue: 30,
      deliveryFee: 8,
      activeDevicesCount: 1,
      devicesLimit: 2,
      isOpen: true,
      supportsDelivery: true,
      supportsTakeout: true
    });

    getCol('products').set('prod-burger-a', {
      id: 'prod-burger-a',
      tenantId: 'tenant-a',
      name: 'Smash Duplo Trufado',
      category: 'Lanches',
      price: 40.0,
      costPrice: 14.5,
      wholesalePrice: 32.0,
      supplierId: 'sup-secret-99',
      stock: 10,
      minStock: 3,
      barcode: '789000001',
      sku: 'SKU-BURGER-A',
      image: 'https://example.com/burger.jpg',
      availableOnline: true,
      description: 'Pão brioche e blend angus'
    });

    getCol('drivers').set('uid-driver-1', {
      id: 'uid-driver-1',
      tenantId: 'tenant-a',
      name: 'Motoboy Rafael',
      phone: '(11) 99999-1111',
      vehicleType: 'moto',
      status: 'available',
      rating: 5.0,
      activeDeliveriesCount: 0,
      completedTodayCount: 0,
      driverType: 'private',
      complianceVerified: true
    });

    getCol('drivers').set('uid-driver-unassigned', {
      id: 'uid-driver-unassigned',
      tenantId: 'marketplace',
      name: 'Motoboy Outro',
      phone: '(11) 99999-2222',
      vehicleType: 'moto',
      status: 'available',
      rating: 4.9,
      activeDeliveriesCount: 0,
      completedTodayCount: 0,
      driverType: 'platform',
      complianceVerified: true
    });

    mockTokens.set('tok-hq', {
      uid: 'uid-hq',
      email: 'miraela.marcelo@gmail.com',
      email_verified: true,
      role: 'hq_admin'
    });
    mockTokens.set('tok-owner-a', {
      uid: 'uid-owner-a',
      email: 'dono@burgera.com.br',
      email_verified: true,
      role: 'tenant_owner',
      tenantId: 'tenant-a'
    });
    mockTokens.set('tok-op-a', {
      uid: 'uid-op-a',
      email: 'caixa@burgera.com.br',
      email_verified: true,
      role: 'operator',
      tenantId: 'tenant-a'
    });
    mockTokens.set('tok-waiter-a', {
      uid: 'uid-waiter-a',
      email: 'garcom@burgera.com.br',
      email_verified: true,
      role: 'waiter',
      tenantId: 'tenant-a',
      name: 'Garçom Lucas'
    });
    mockTokens.set('tok-owner-b', {
      uid: 'uid-owner-b',
      email: 'dono@sushib.com.br',
      email_verified: true,
      role: 'tenant_owner',
      tenantId: 'tenant-b'
    });
    mockTokens.set('tok-driver-1', {
      uid: 'uid-driver-1',
      email: 'motoboy@rota.com',
      email_verified: true,
      role: 'driver',
      name: 'Motoboy Rafael'
    });
    mockTokens.set('tok-driver-unassigned', {
      uid: 'uid-driver-unassigned',
      email: 'outro.motoboy@rota.com',
      email_verified: true,
      role: 'driver',
      name: 'Motoboy Outro'
    });
    mockTokens.set('tok-consumer-1', {
      uid: 'uid-consumer-1',
      email: 'cliente@gmail.com',
      email_verified: true,
      role: 'consumer',
      name: 'Cliente Mariana'
    });
    mockTokens.set('tok-new-merchant', {
      uid: 'uid-new-merchant',
      email: 'novo@lojista.com.br',
      email_verified: true,
      role: 'consumer',
      name: 'Lojista Novo'
    });
  });

  afterEach(() => {
    __setFirebaseAdminTestOverrides(null);
  });

  describe('1. Autenticação, Custom Claims e Bloqueio de Escalação em /users/{uid}', () => {
    it('rejeita domínios genéricos @3eatcru.com e e-mails não verificados para HQ Admin', () => {
      expect(isHqAdminEmail('qualquer@3eatcru.com.br', true)).toBe(false);
      expect(isHqAdminEmail('admin@3eatcru.com', true)).toBe(false);
      expect(isHqAdminEmail('3eatcru@gmail.com', false)).toBe(false);
      expect(isHqAdminEmail('3eatcru@gmail.com', true)).toBe(true);
      expect(isHqAdminEmail('marcelokbite@gmail.com', true)).toBe(true);
    });

    it('impede escalação caso /users/{uid} contenha role adulterado "hq_admin"', async () => {
      mockTokens.set('tok-tampered-user', {
        uid: 'uid-attacker',
        email: 'attacker@gmail.com',
        email_verified: true
      });
      getCol('users').set('uid-attacker', {
        uid: 'uid-attacker',
        role: 'hq_admin',
        tenantId: 'tenant-a'
      });

      await withServer(async (baseUrl) => {
        const hqRes = await fetch(`${baseUrl}/api/hq/overview`, {
          headers: { Authorization: 'Bearer tok-tampered-user' }
        });
        expect(hqRes.status).toBe(403);
      });
    });
  });

  describe('2. Separação entre Catálogo Privado (ERP) e Catálogo Público (Marketplace)', () => {
    it('oculta costPrice, wholesalePrice, supplierId, minStock e stock exato de consumidores e concorrentes', async () => {
      await withServer(async (baseUrl) => {
        const publicRes = await fetch(`${baseUrl}/api/products?tenantId=tenant-a`, {
          headers: { Authorization: 'Bearer tok-consumer-1' }
        });
        expect(publicRes.status).toBe(200);
        const publicItems = (await publicRes.json()) as Record<string, unknown>[];
        expect(publicItems).toHaveLength(1);
        expect(publicItems[0]!['price']).toBe(40.0);
        expect(publicItems[0]!['inStock']).toBe(true);
        expect(publicItems[0]!['costPrice']).toBeUndefined();
        expect(publicItems[0]!['wholesalePrice']).toBeUndefined();
        expect(publicItems[0]!['supplierId']).toBeUndefined();
        expect(publicItems[0]!['stock']).toBeUndefined();

        const rivalRes = await fetch(`${baseUrl}/api/products?tenantId=tenant-a`, {
          headers: { Authorization: 'Bearer tok-owner-b' }
        });
        const rivalItems = (await rivalRes.json()) as Record<string, unknown>[];
        expect(rivalItems[0]!['costPrice']).toBeUndefined();

        const ownerRes = await fetch(`${baseUrl}/api/products?tenantId=tenant-a`, {
          headers: { Authorization: 'Bearer tok-owner-a' }
        });
        const ownerItems = (await ownerRes.json()) as Record<string, unknown>[];
        expect(ownerItems[0]!['costPrice']).toBe(14.5);
        expect(ownerItems[0]!['supplierId']).toBe('sup-secret-99');
        expect(ownerItems[0]!['stock']).toBe(10);
      });
    });
  });

  describe('3. Isolamento Multi-Tenant Estrito entre Empresas (Tenant A vs Tenant B)', () => {
    it('bloqueia leitura e escrita cruzada em pedidos, financeiro, mesas e produtos', async () => {
      await withServer(async (baseUrl) => {
        const ordersRes = await fetch(`${baseUrl}/api/orders?tenantId=tenant-a`, {
          headers: { Authorization: 'Bearer tok-owner-b' }
        });
        expect(ordersRes.status).toBe(403);

        const finRes = await fetch(`${baseUrl}/api/financials?tenantId=tenant-a`, {
          headers: { Authorization: 'Bearer tok-owner-b' }
        });
        expect(finRes.status).toBe(403);

        const patchProdRes = await fetch(`${baseUrl}/api/products/prod-burger-a`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer tok-owner-b'
          },
          body: JSON.stringify({ price: 1.0 })
        });
        expect(patchProdRes.status).toBe(403);

        const waiterFinRes = await fetch(`${baseUrl}/api/financials`, {
          headers: { Authorization: 'Bearer tok-waiter-a' }
        });
        expect(waiterFinRes.status).toBe(403);
      });
    });
  });

  describe('4. Concorrência Real: Duas Vendas Simultâneas Disputando o Mesmo Estoque', () => {
    it('aprova apenas uma venda e retorna 409 Conflict na segunda quando PDV + Marketplace disputam estoque 3', async () => {
      getCol('products').set('prod-limited', {
        id: 'prod-limited',
        tenantId: 'tenant-a',
        name: 'Combo Edição Limitada',
        description: 'Combo exclusivo',
        category: 'Especiais',
        price: 50.0,
        costPrice: 20.0,
        stock: 3,
        minStock: 1,
        barcode: '789999999',
        sku: 'SKU-LIM',
        image: 'https://example.com/lim.jpg',
        availableOnline: true
      });

      await withServer(async (baseUrl) => {
        const [posResponse, marketplaceResponse] = await Promise.all([
          fetch(`${baseUrl}/api/orders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer tok-op-a'
            },
            body: JSON.stringify({
              tenantId: 'tenant-a',
              type: 'pos-counter',
              status: 'completed',
              channel: 'POS',
              paymentMethod: 'cash',
              cashConfirmedByOperator: true,
              items: [{ productId: 'prod-limited', quantity: 2 }]
            })
          }),
          fetch(`${baseUrl}/api/orders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer tok-consumer-1'
            },
            body: JSON.stringify({
              tenantId: 'tenant-a',
              type: 'delivery',
              channel: 'Online Marketplace',
              paymentMethod: 'online',
              customerName: 'Cliente Mariana',
              items: [{ productId: 'prod-limited', quantity: 2 }]
            })
          })
        ]);

        const statuses = [posResponse.status, marketplaceResponse.status].sort();
        expect(statuses).toEqual([201, 409]);

        const finalProd = getCol('products').get('prod-limited')!;
        expect(finalProd['stock']).toBe(1);

        const pubProd = getCol('public_catalog').get('prod-limited')!;
        expect(pubProd['inStock']).toBe(true);
      });
    });
  });

  describe('5. Idempotência Offline POS, Preço Autoritativo e Estorno em Cancelamento', () => {
    it('ignora preço adulterado do cliente, evita duplicidade por X-Idempotency-Key e estorna estoque + financeiro ao cancelar', async () => {
      await withServer(async (baseUrl) => {
        const offlineKey = 'off-ord-pos-1001';
        const payload = {
          tenantId: 'tenant-a',
          type: 'pos-counter',
          status: 'completed',
          channel: 'POS',
          paymentMethod: 'cash',
          cashConfirmedByOperator: true,
          items: [
            { product: { id: 'prod-burger-a', price: 0.5 }, quantity: 1 },
            { product: { id: 'prod-burger-a', price: 0.5 }, quantity: 1 }
          ]
        };

        const firstRes = await fetch(`${baseUrl}/api/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer tok-op-a',
            'X-Idempotency-Key': offlineKey
          },
          body: JSON.stringify(payload)
        });
        expect(firstRes.status).toBe(201);
        const createdOrder = (await firstRes.json()) as Record<string, unknown>;
        expect(createdOrder['total']).toBe(80.0);

        const retryRes = await fetch(`${baseUrl}/api/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer tok-op-a',
            'X-Idempotency-Key': offlineKey
          },
          body: JSON.stringify(payload)
        });
        expect(retryRes.status).toBe(200);

        expect(getCol('products').get('prod-burger-a')!['stock']).toBe(8);
        expect(getCol('financials').has(`fin-sale-${offlineKey}`)).toBe(true);
        expect(getCol('financials').size).toBe(1);

        const onlineOrderRes = await fetch(`${baseUrl}/api/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer tok-consumer-1'
          },
          body: JSON.stringify({
            tenantId: 'tenant-a',
            type: 'delivery',
            channel: 'Customer Storefront',
            items: [{ productId: 'prod-burger-a', quantity: 2 }]
          })
        });
        const onlineOrder = (await onlineOrderRes.json()) as { id: string };
        expect(getCol('products').get('prod-burger-a')!['stock']).toBe(6);

        const cancelRes = await fetch(`${baseUrl}/api/orders/${onlineOrder.id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer tok-op-a'
          },
          body: JSON.stringify({ status: 'cancelled' })
        });
        expect(cancelRes.status).toBe(200);
        expect(getCol('products').get('prod-burger-a')!['stock']).toBe(8);
      });
    });
  });

  describe('6. Omnichannel Unificado: PDV + Garçom/Mesa + Marketplace + Rota Atribuída no Mesmo Motor Comercial', () => {
    it('opera canais omnichannel e impede liquidação sem pagamento confirmado ou papel autorizado', async () => {
      await withServer(async (baseUrl) => {
        // Canal 1: PDV Balcão em dinheiro confirmado pelo operador (liquidação imediata)
        const posRes = await fetch(`${baseUrl}/api/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer tok-op-a'
          },
          body: JSON.stringify({
            tenantId: 'tenant-a',
            type: 'pos-counter',
            status: 'completed',
            channel: 'POS',
            paymentMethod: 'cash',
            cashConfirmedByOperator: true,
            items: [{ productId: 'prod-burger-a', quantity: 1 }]
          })
        });
        expect(posRes.status).toBe(201);
        const posOrder = (await posRes.json()) as { id: string; total: number };

        // Canal 2: Garçom lançando comanda na Mesa 4
        const waiterRes = await fetch(`${baseUrl}/api/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer tok-waiter-a'
          },
          body: JSON.stringify({
            tenantId: 'tenant-a',
            type: 'dine-in',
            tableNumber: 'Mesa 4',
            channel: 'POS',
            paymentMethod: 'card',
            items: [{ productId: 'prod-burger-a', quantity: 2 }]
          })
        });
        expect(waiterRes.status).toBe(201);
        const tableOrder = (await waiterRes.json()) as { id: string };

        const tableSettlementRes = await fetch(`${baseUrl}/api/orders/${tableOrder.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-op-a' },
          body: JSON.stringify({ status: 'completed' })
        });
        expect(tableSettlementRes.status).toBe(409);
        expect((await tableSettlementRes.json() as { code: string }).code).toBe('PAYMENT_NOT_CONFIRMED');

        // Canal 3: Consumidor no Marketplace Online
        const mktRes = await fetch(`${baseUrl}/api/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer tok-consumer-1'
          },
          body: JSON.stringify({
            tenantId: 'tenant-a',
            type: 'delivery',
            channel: 'Online Marketplace',
            paymentMethod: 'online',
            items: [{ productId: 'prod-burger-a', quantity: 1 }]
          })
        });
        expect(mktRes.status).toBe(201);
        const mktOrder = (await mktRes.json()) as { id: string; total: number };
        expect(mktOrder.total).toBe(46.0);

        // KDS prepara e deixa pronto
        for (const nextStatus of ['preparing', 'ready']) {
          await fetch(`${baseUrl}/api/orders/${mktOrder.id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-op-a' },
            body: JSON.stringify({ status: nextStatus })
          });
        }

        // Loja cria rota vinculada ao pedido e entregador aceita a rota (propaga driverId atomicamente)
        const routeCreateRes = await fetch(`${baseUrl}/api/logistics/routes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-op-a' },
          body: JSON.stringify({
            waypoints: [
              {
                id: 'wp-mkt-1',
                orderId: mktOrder.id,
                address: 'Rua Paulista, 100',
                customerName: 'Mariana',
                status: 'pending'
              }
            ]
          })
        });
        expect(routeCreateRes.status).toBe(201);
        const createdRoute = (await routeCreateRes.json()) as { id: string };

        const acceptRouteRes = await fetch(
          `${baseUrl}/api/logistics/routes/${createdRoute.id}/accept`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-driver-1' },
            body: JSON.stringify({})
          }
        );
        expect(acceptRouteRes.status).toBe(200);

        // Entregador atribuído confirma entrega; conclusão financeira continua fora do papel dele.
        const deliveredRes = await fetch(`${baseUrl}/api/orders/${mktOrder.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-driver-1' },
          body: JSON.stringify({ status: 'delivered' })
        });
        expect(deliveredRes.status).toBe(200);

        const driverSettlementRes = await fetch(`${baseUrl}/api/orders/${mktOrder.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-driver-1' },
          body: JSON.stringify({ status: 'completed' })
        });
        expect(driverSettlementRes.status).toBe(403);
        expect((await driverSettlementRes.json() as { code: string }).code).toBe('FORBIDDEN_DRIVER_TRANSITION');
        expect(getCol('orders').get(mktOrder.id)?.['status']).toBe('delivered');
        expect(getCol('financials').has(`fin-sale-${mktOrder.id}`)).toBe(false);

        expect(getCol('products').get('prod-burger-a')!['stock']).toBe(6);

        const finListRes = await fetch(`${baseUrl}/api/financials`, {
          headers: { Authorization: 'Bearer tok-owner-a' }
        });
        expect(finListRes.status).toBe(200);
        const financials = (await finListRes.json()) as { id: string; amount: number }[];
        expect(financials).toHaveLength(1);
        const ids = financials.map((f) => f.id).sort();
        expect(ids).toEqual([`fin-sale-${posOrder.id}`]);
      });
    });
  });

  describe('7. Blindagens de Auditoria Sênior v6 (P0.3, P1.4, P1.5, P1.6, P1.7, P1.8, P2.9, P2.11)', () => {
    it('P0.3: impede liquidação por status:completed do cliente sem pagamento verificado e exige confirmação real no PIX Proxy', async () => {
      await withServer(async (baseUrl) => {
        // Cliente/Operador envia status:'completed' em PIX sem paymentTransactionId -> permanece 'pending' e ZERO fin-sale
        const unverifiedRes = await fetch(`${baseUrl}/api/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-op-a' },
          body: JSON.stringify({
            tenantId: 'tenant-a',
            type: 'pos-counter',
            channel: 'POS',
            status: 'completed',
            paymentMethod: 'pix',
            items: [{ productId: 'prod-burger-a', quantity: 1 }]
          })
        });
        expect(unverifiedRes.status).toBe(201);
        const pendingPosOrder = (await unverifiedRes.json()) as Record<string, unknown>;
        expect(pendingPosOrder['status']).toBe('pending');
        expect(getCol('financials').has(`fin-sale-${String(pendingPosOrder['id'])}`)).toBe(false);

        // Inicia pagamento PIX no Proxy Universal -> reporta sandbox/simulation honestamente e inicia em pending_pix
        const pixInitRes = await fetch(`${baseUrl}/api/payments/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-op-a' },
          body: JSON.stringify({
            orderId: pendingPosOrder['id'],
            tenantId: 'tenant-a',
            amount: 40.0,
            method: 'pix'
          })
        });
        expect(pixInitRes.status).toBe(201);
        const pixTx = (await pixInitRes.json()) as Record<string, unknown>;
        expect(pixTx['status']).toBe('pending_pix');
        expect(pixTx['environment']).toBe('sandbox');
        expect(pixTx['mode']).toBe('simulation');
        expect(getCol('financials').has(`fin-sale-${String(pendingPosOrder['id'])}`)).toBe(false);

        // Confirma o PIX explicitamente -> liquida o pedido PDV e grava fin-sale-*
        const pixConfirmRes = await fetch(
          `${baseUrl}/api/payments/${String(pixTx['transactionId'])}/confirm`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-op-a' },
            body: JSON.stringify({})
          }
        );
        expect(pixConfirmRes.status).toBe(200);
        expect(getCol('orders').get(String(pendingPosOrder['id']))?.['status']).toBe('completed');
        expect(getCol('financials').has(`fin-sale-${String(pendingPosOrder['id'])}`)).toBe(true);
      });
    });

    it('P1.4 & P1.5: bloqueia entregador não atribuído de ler/alterar pedidos e bloqueia aceite cruzado de rotas entre empresas', async () => {
      await withServer(async (baseUrl) => {
        const orderRes = await fetch(`${baseUrl}/api/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-consumer-1' },
          body: JSON.stringify({
            tenantId: 'tenant-a',
            type: 'delivery',
            channel: 'Online Marketplace',
            items: [{ productId: 'prod-burger-a', quantity: 1 }]
          })
        });
        const order = (await orderRes.json()) as { id: string };

        // P1.4: Motorista sem atribuição recebe lista vazia, 403 no GET individual e 403 no PATCH
        const listRes = await fetch(`${baseUrl}/api/orders`, {
          headers: { Authorization: 'Bearer tok-driver-unassigned' }
        });
        expect(listRes.status).toBe(200);
        expect(await listRes.json()).toEqual([]);

        const detailRes = await fetch(`${baseUrl}/api/orders/${order.id}`, {
          headers: { Authorization: 'Bearer tok-driver-unassigned' }
        });
        expect(detailRes.status).toBe(403);

        const patchRes = await fetch(`${baseUrl}/api/orders/${order.id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer tok-driver-unassigned'
          },
          body: JSON.stringify({ status: 'dispatched' })
        });
        expect(patchRes.status).toBe(403);

        // P1.5: Gestor do Tenant B não pode aceitar/atribuir rota do Tenant A
        const routeRes = await fetch(`${baseUrl}/api/logistics/routes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-op-a' },
          body: JSON.stringify({
            waypoints: [
              {
                id: 'wp-1',
                orderId: order.id,
                address: 'Av Brasil, 500',
                customerName: 'Mariana',
                status: 'pending'
              }
            ]
          })
        });
        const route = (await routeRes.json()) as { id: string };

        const crossAcceptRes = await fetch(
          `${baseUrl}/api/logistics/routes/${route.id}/accept`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-owner-b' },
            body: JSON.stringify({ driverId: 'uid-driver-1' })
          }
        );
        expect(crossAcceptRes.status).toBe(403);
        const crossBody = (await crossAcceptRes.json()) as Record<string, unknown>;
        expect(crossBody['code']).toBe('TENANT_MISMATCH');
      });
    });

    it('P1.6 & P1.7: exige identidade autenticada em replay de X-Idempotency-Key e bloqueia type:"sale" manual em /api/financials', async () => {
      await withServer(async (baseUrl) => {
        const idemKey = 'idem-auth-check-01';
        const createRes = await fetch(`${baseUrl}/api/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer tok-consumer-1',
            'X-Idempotency-Key': idemKey
          },
          body: JSON.stringify({
            tenantId: 'tenant-a',
            type: 'delivery',
            channel: 'Online Marketplace',
            items: [{ productId: 'prod-burger-a', quantity: 1 }]
          })
        });
        expect(createRes.status).toBe(201);

        // Chamada anônima tentando ler pedido via replay de X-Idempotency-Key -> 403 FORBIDDEN_IDEMPOTENCY_REPLAY
        const anonReplayRes = await fetch(`${baseUrl}/api/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Idempotency-Key': idemKey
          },
          body: JSON.stringify({
            tenantId: 'tenant-a',
            type: 'delivery',
            items: [{ productId: 'prod-burger-a', quantity: 1 }]
          })
        });
        expect(anonReplayRes.status).toBe(403);
        const anonBody = (await anonReplayRes.json()) as Record<string, unknown>;
        expect(anonBody['code']).toBe('FORBIDDEN_IDEMPOTENCY_REPLAY');

        // P1.7: Lançamento manual com type: 'sale' é bloqueado (403 MANUAL_SALE_FORBIDDEN), enquanto 'income' é aceito (201)
        const manualSaleRes = await fetch(`${baseUrl}/api/financials`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-owner-a' },
          body: JSON.stringify({
            type: 'sale',
            description: 'Venda manual forjada',
            amount: 500
          })
        });
        expect(manualSaleRes.status).toBe(403);
        const manualSaleBody = (await manualSaleRes.json()) as Record<string, unknown>;
        expect(manualSaleBody['code']).toBe('MANUAL_SALE_FORBIDDEN');

        const suprimentoRes = await fetch(`${baseUrl}/api/financials`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-owner-a' },
          body: JSON.stringify({
            type: 'income',
            category: 'Suprimento de Caixa',
            description: 'Fundo de troco inicial',
            amount: 150
          })
        });
        expect(suprimentoRes.status).toBe(201);
      });
    });

    it('P1.8, P2.9 & P2.11: valida estado operacional/catálogo online e exige CNPJ + endereço reais no onboarding em status trial', async () => {
      // Cadastra produto interno (availableOnline: false) no Tenant A
      getCol('products').set('prod-internal-only', {
        id: 'prod-internal-only',
        tenantId: 'tenant-a',
        name: 'Insumo Interno Balcão',
        description: 'Uso exclusivo PDV',
        category: 'Interno',
        price: 30.0,
        costPrice: 10.0,
        stock: 20,
        minStock: 2,
        barcode: '789000999',
        sku: 'SKU-INT',
        image: 'https://example.com/int.jpg',
        availableOnline: false
      });

      await withServer(async (baseUrl) => {
        // P2.11: Público não vê produto com availableOnline: false
        const pubProdsRes = await fetch(`${baseUrl}/api/products?tenantId=tenant-a`);
        const pubProds = (await pubProdsRes.json()) as { id: string }[];
        expect(pubProds.some((p) => p.id === 'prod-internal-only')).toBe(false);

        const hiddenProdDetail = await fetch(`${baseUrl}/api/products/prod-internal-only`);
        expect(hiddenProdDetail.status).toBe(404);

        // P1.8: Compra online de produto availableOnline: false retorna 422 PRODUCT_UNAVAILABLE_ONLINE
        const buyHiddenRes = await fetch(`${baseUrl}/api/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-consumer-1' },
          body: JSON.stringify({
            tenantId: 'tenant-a',
            type: 'delivery',
            channel: 'Online Marketplace',
            items: [{ productId: 'prod-internal-only', quantity: 1 }]
          })
        });
        expect(buyHiddenRes.status).toBe(422);
        expect(((await buyHiddenRes.json()) as Record<string, unknown>)['code']).toBe(
          'PRODUCT_UNAVAILABLE_ONLINE'
        );

        // P1.8: Loja fechada (isOpen: false) bloqueia pedido online (422 STORE_CLOSED)
        getCol('tenants').set('tenant-a', {
          ...getCol('tenants').get('tenant-a')!,
          isOpen: false
        });
        const closedRes = await fetch(`${baseUrl}/api/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-consumer-1' },
          body: JSON.stringify({
            tenantId: 'tenant-a',
            type: 'delivery',
            channel: 'Online Marketplace',
            items: [{ productId: 'prod-burger-a', quantity: 1 }]
          })
        });
        expect(closedRes.status).toBe(422);
        expect(((await closedRes.json()) as Record<string, unknown>)['code']).toBe('STORE_CLOSED');

        // P1.8 & P2.11: Loja suspensa bloqueia venda (403 TENANT_INACTIVE) e some da vitrine pública (404)
        getCol('tenants').set('tenant-a', {
          ...getCol('tenants').get('tenant-a')!,
          isOpen: true,
          status: 'suspended'
        });
        const inactiveOrderRes = await fetch(`${baseUrl}/api/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-consumer-1' },
          body: JSON.stringify({
            tenantId: 'tenant-a',
            type: 'delivery',
            channel: 'Online Marketplace',
            items: [{ productId: 'prod-burger-a', quantity: 1 }]
          })
        });
        expect(inactiveOrderRes.status).toBe(403);
        expect(((await inactiveOrderRes.json()) as Record<string, unknown>)['code']).toBe(
          'TENANT_INACTIVE'
        );

        const suspendedStorefrontRes = await fetch(`${baseUrl}/api/tenants/tenant-a`);
        expect(suspendedStorefrontRes.status).toBe(404);

        // P2.9: Onboarding rejeita CNPJ inválido/ausente (400) e cria lojista válido em status 'trial' e isOpen: false sem coordenadas falsas
        const badMerchantRes = await fetch(`${baseUrl}/api/auth/register-merchant`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-new-merchant' },
          body: JSON.stringify({
            storeName: 'Loja Sem Dados'
          })
        });
        expect(badMerchantRes.status).toBe(400);

        const validMerchantRes = await fetch(`${baseUrl}/api/auth/register-merchant`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-new-merchant' },
          body: JSON.stringify({
            storeName: 'Empório Real Paulista',
            legalName: 'Emporio Real Paulista LTDA',
            cnpj: '45.723.174/0001-10',
            phone: '(11) 98765-4321',
            category: 'retail',
            address: {
              street: 'Avenida Paulista',
              number: '1578',
              neighborhood: 'Bela Vista',
              city: 'São Paulo',
              state: 'SP',
              zipCode: '01310-200'
            }
          })
        });
        expect(validMerchantRes.status).toBe(201);
        const createdMerchantBody = (await validMerchantRes.json()) as {
          tenant: Record<string, unknown>;
        };
        expect(createdMerchantBody.tenant['status']).toBe('trial');
        expect(createdMerchantBody.tenant['isOpen']).toBe(false);
        expect(createdMerchantBody.tenant['supportsDelivery']).toBe(false);
        expect(createdMerchantBody.tenant['lat']).toBeUndefined();
        expect(createdMerchantBody.tenant['lng']).toBeUndefined();
      });
    });

    it('8. Reservas Transacionais (/api/reservations): Vitrine Pública, Isolamento Multi-Tenant e Sincronização Atômica com Mesas', async () => {
      mockTokens.set('tok-op-a', {
        uid: 'uid-op-a',
        email: 'op@burgera.com.br',
        email_verified: true,
        role: 'operator',
        tenantId: 'tenant-a'
      });
      mockTokens.set('tok-op-b', {
        uid: 'uid-op-b',
        email: 'op@sushib.com.br',
        email_verified: true,
        role: 'operator',
        tenantId: 'tenant-b'
      });
      mockTokens.set('tok-waiter-a', {
        uid: 'uid-waiter-a',
        email: 'salao@burgera.com.br',
        email_verified: true,
        role: 'waiter',
        tenantId: 'tenant-a'
      });
      mockTokens.set('tok-driver-1', {
        uid: 'uid-driver-1',
        email: 'driver1@motoboy.com',
        email_verified: true,
        role: 'driver',
        tenantId: 'tenant-a'
      });
      mockTokens.set('tok-consumer-1', {
        uid: 'uid-consumer-1',
        email: 'cliente1@gmail.com',
        email_verified: true,
        role: 'consumer'
      });
      mockTokens.set('tok-consumer-2', {
        uid: 'uid-consumer-2',
        email: 'cliente2@gmail.com',
        email_verified: true,
        role: 'consumer'
      });

      getCol('tables').set('tbl-a1', {
        id: 'tbl-a1',
        tenantId: 'tenant-a',
        number: 4,
        capacity: 6,
        status: 'available',
        zone: 'salao',
        staffUids: ['uid-owner-a', 'uid-op-a', 'uid-waiter-a']
      });
      getCol('tables').set('tbl-a2', {
        id: 'tbl-a2',
        tenantId: 'tenant-a',
        number: 7,
        capacity: 4,
        status: 'available',
        zone: 'varanda',
        staffUids: ['uid-owner-a', 'uid-op-a', 'uid-waiter-a']
      });

      await withServer(async (baseUrl) => {
        // 8.0 Table management is tenant-scoped and guards status/financial fields
        const createdTableResponse = await fetch(`${baseUrl}/api/tables`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-op-a' },
          body: JSON.stringify({ tenantId: 'tenant-a', number: 11, capacity: 4, zone: 'Salão' })
        });
        expect(createdTableResponse.status).toBe(201);
        const createdTable = (await createdTableResponse.json()) as Record<string, unknown>;
        const createdTableId = String(createdTable['id']);
        expect(createdTable['status']).toBe('available');
        expect(createdTable['currentTotal']).toBe(0);

        const duplicateTableResponse = await fetch(`${baseUrl}/api/tables`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-op-a' },
          body: JSON.stringify({ tenantId: 'tenant-a', number: 11, capacity: 2 })
        });
        expect(duplicateTableResponse.status).toBe(409);
        expect(((await duplicateTableResponse.json()) as Record<string, unknown>)['code']).toBe('TABLE_NUMBER_EXISTS');

        const waiterCreateTable = await fetch(`${baseUrl}/api/tables`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-waiter-a' },
          body: JSON.stringify({ number: 12, capacity: 2 })
        });
        expect(waiterCreateTable.status).toBe(403);

        const openTable = await fetch(`${baseUrl}/api/tables/${createdTableId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-op-a' },
          body: JSON.stringify({ status: 'occupied', guests: 2, server: 'Operador' })
        });
        expect(openTable.status).toBe(200);

        const forgedBalanceUpdate = await fetch(`${baseUrl}/api/tables/${createdTableId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-op-a' },
          body: JSON.stringify({ currentTotal: 0 })
        });
        expect(forgedBalanceUpdate.status).toBe(400);

        getCol('tables').set(createdTableId, {
          ...getCol('tables').get(createdTableId)!,
          currentTotal: 25
        });
        const releaseTableWithBalance = await fetch(`${baseUrl}/api/tables/${createdTableId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-op-a' },
          body: JSON.stringify({ status: 'available' })
        });
        expect(releaseTableWithBalance.status).toBe(409);
        expect(((await releaseTableWithBalance.json()) as Record<string, unknown>)['code']).toBe('TABLE_BALANCE_OPEN');

        // 8.1 Public booking creates pending reservation on active store
        const pubRes = await fetch(`${baseUrl}/api/reservations/public`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer tok-consumer-1'
          },
          body: JSON.stringify({
            tenantId: 'tenant-a',
            customerName: 'Helena Soares',
            customerPhone: '(11) 98888-7777',
            partySize: 4,
            date: '2026-11-15',
            time: '20:00',
            zonePreference: 'salao',
            notes: 'Aniversário'
          })
        });
        expect(pubRes.status).toBe(201);
        const createdPub = (await pubRes.json()) as Record<string, unknown>;
        expect(createdPub['status']).toBe('pending');
        expect(createdPub['customerId']).toBe('uid-consumer-1');
        const resId = String(createdPub['id']);

        // 8.2 Rival tenant & driver are strictly blocked (403)
        const rivalList = await fetch(`${baseUrl}/api/reservations?tenantId=tenant-a`, {
          headers: { Authorization: 'Bearer tok-op-b' }
        });
        expect(rivalList.status).toBe(403);

        const driverList = await fetch(`${baseUrl}/api/reservations`, {
          headers: { Authorization: 'Bearer tok-driver-1' }
        });
        expect(driverList.status).toBe(403);

        // 8.3 Consumer cannot self-confirm reservation or cancel another consumer's reservation
        const consumerSelfConfirm = await fetch(`${baseUrl}/api/reservations/${resId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer tok-consumer-1'
          },
          body: JSON.stringify({ status: 'confirmed' })
        });
        expect(consumerSelfConfirm.status).toBe(403);

        const otherConsumerCancel = await fetch(`${baseUrl}/api/reservations/${resId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer tok-consumer-2'
          },
          body: JSON.stringify({ status: 'cancelled' })
        });
        expect(otherConsumerCancel.status).toBe(403);

        // 8.4 Staff confirms reservation assigning tbl-a1 -> tbl-a1 atomically becomes 'reserved'
        const confirmRes = await fetch(`${baseUrl}/api/reservations/${resId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer tok-op-a'
          },
          body: JSON.stringify({ status: 'confirmed', tableId: 'tbl-a1' })
        });
        expect(confirmRes.status).toBe(200);
        expect(getCol('tables').get('tbl-a1')?.['status']).toBe('reserved');

        // 8.5 Staff checks-in ('seated') -> tbl-a1 atomically becomes 'occupied' with guests = 4
        const seatRes = await fetch(`${baseUrl}/api/reservations/${resId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer tok-op-a'
          },
          body: JSON.stringify({ status: 'seated' })
        });
        expect(seatRes.status).toBe(200);
        expect(getCol('tables').get('tbl-a1')?.['status']).toBe('occupied');
        expect(getCol('tables').get('tbl-a1')?.['guests']).toBe(4);

        const invalidReservationTransition = await fetch(`${baseUrl}/api/reservations/${resId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-op-a' },
          body: JSON.stringify({ status: 'cancelled' })
        });
        expect(invalidReservationTransition.status).toBe(409);
        expect(((await invalidReservationTransition.json()) as Record<string, unknown>)['code']).toBe('INVALID_RESERVATION_TRANSITION');

        // 8.6 Assigning already-occupied tbl-a1 to a new walk-in reservation returns 409 TABLE_OCCUPIED
        const conflictRes = await fetch(`${baseUrl}/api/reservations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer tok-op-a'
          },
          body: JSON.stringify({
            customerName: 'Outro Grupo',
            partySize: 2,
            date: '2026-11-15',
            time: '20:15',
            tableId: 'tbl-a1'
          })
        });
        expect(conflictRes.status).toBe(409);

        // 8.7 Creating a confirmed reservation on tbl-a2 marks it 'reserved', and consumer cancelling releases it to 'available'
        const secondResResp = await fetch(`${baseUrl}/api/reservations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer tok-op-a'
          },
          body: JSON.stringify({
            customerId: 'uid-consumer-2',
            customerName: 'Rafael Lima',
            partySize: 3,
            date: '2026-11-15',
            time: '21:00',
            tableId: 'tbl-a2',
            status: 'confirmed'
          })
        });
        expect(secondResResp.status).toBe(201);
        const secondCreated = (await secondResResp.json()) as Record<string, unknown>;
        expect(getCol('tables').get('tbl-a2')?.['status']).toBe('reserved');

        const overlappingReservation = await fetch(`${baseUrl}/api/reservations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-op-a' },
          body: JSON.stringify({
            customerName: 'Reserva em conflito',
            partySize: 2,
            date: '2026-11-15',
            time: '21:30',
            tableId: 'tbl-a2',
            status: 'confirmed'
          })
        });
        expect(overlappingReservation.status).toBe(409);
        expect(((await overlappingReservation.json()) as Record<string, unknown>)['code']).toBe('TABLE_TIME_CONFLICT');

        const cancelSecond = await fetch(
          `${baseUrl}/api/reservations/${String(secondCreated['id'])}/status`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer tok-consumer-2'
            },
            body: JSON.stringify({ status: 'cancelled' })
          }
        );
        expect(cancelSecond.status).toBe(200);
        expect(getCol('tables').get('tbl-a2')?.['status']).toBe('available');

        // 8.8 Store with supportsReservation: false rejects public booking (422 RESERVATIONS_DISABLED)
        getCol('tenants').set('tenant-b', {
          ...getCol('tenants').get('tenant-b')!,
          supportsReservation: false,
          acceptsPickup: true,
          deliveryFee: 12
        });
        const disabledStoreRes = await fetch(`${baseUrl}/api/reservations/public`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId: 'tenant-b',
            customerName: 'Visitante',
            customerPhone: '(11) 98888-7777',
            date: '2026-11-16',
            time: '19:00',
            partySize: 2
          })
        });
        expect(disabledStoreRes.status).toBe(422);
        expect(((await disabledStoreRes.json()) as Record<string, unknown>)['code']).toBe(
          'RESERVATIONS_DISABLED'
        );

        // 8.9 Takeout (Retirada Balcão) order in Storefront charges zero deliveryFee even when store has deliveryFee > 0
        const takeoutRes = await fetch(`${baseUrl}/api/orders/channels/storefront`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer tok-consumer-1'
          },
          body: JSON.stringify({
            tenantId: 'tenant-a',
            type: 'takeout',
            customerName: 'Consumidor Retirada',
            paymentMethod: 'card',
            items: [{ productId: 'prod-burger-a', quantity: 1 }]
          })
        });
        expect(takeoutRes.status).toBe(201);
        const takeoutOrder = (await takeoutRes.json()) as Record<string, unknown>;
        expect(takeoutOrder['type']).toBe('takeout');
        expect(takeoutOrder['tax']).toBe(0);
        expect(takeoutOrder['total']).toBe(takeoutOrder['subtotal']);
      });
    });

    it('9. CRM protege perfil, fidelidade e campanhas por titular e unidade', async () => {
      getCol('consumers').set('uid-consumer-1', {
        id: 'uid-consumer-1',
        name: 'Cliente Mariana',
        email: 'cliente@gmail.com',
        pointsBalance: 20,
        loyaltyTier: 'silver'
      });

      await withServer(async (baseUrl) => {
        const selfProfileUpdate = await fetch(`${baseUrl}/api/crm/consumers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-consumer-1' },
          body: JSON.stringify({ name: 'Cliente Mariana', phone: '11999990000', pointsBalance: 9000, loyaltyTier: 'gold' })
        });
        expect(selfProfileUpdate.status).toBe(201);
        expect(getCol('consumers').get('uid-consumer-1')?.['pointsBalance']).toBe(20);
        expect(getCol('consumers').get('uid-consumer-1')?.['loyaltyTier']).toBe('silver');

        const otherProfileUpdate = await fetch(`${baseUrl}/api/crm/consumers/uid-owner-a`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-consumer-1' },
          body: JSON.stringify({ name: 'Alterado', pointsBalance: 9999 })
        });
        expect(otherProfileUpdate.status).toBe(403);

        const loyaltyWrite = await fetch(`${baseUrl}/api/crm/loyalty`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-consumer-1' },
          body: JSON.stringify({ consumerId: 'uid-owner-a', points: 9999 })
        });
        expect(loyaltyWrite.status).toBe(501);
        expect(getCol('consumers').get('uid-owner-a')?.['pointsBalance']).toBeUndefined();

        const consumerCampaignList = await fetch(`${baseUrl}/api/crm/campaigns`, {
          headers: { Authorization: 'Bearer tok-consumer-1' }
        });
        expect(consumerCampaignList.status).toBe(403);

        const createCampaign = await fetch(`${baseUrl}/api/crm/campaigns`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-op-a' },
          body: JSON.stringify({ tenantId: 'tenant-a', title: 'Aviso da loja', platform: 'whatsapp', content: 'Mensagem de teste' })
        });
        expect(createCampaign.status).toBe(201);
        const campaign = (await createCampaign.json()) as Record<string, unknown>;
        expect(campaign['status']).toBe('draft');
        expect(campaign['tenantId']).toBe('tenant-a');

        const dispatchCampaign = await fetch(`${baseUrl}/api/crm/campaigns/${String(campaign['id'])}/dispatch`, {
          method: 'POST',
          headers: { Authorization: 'Bearer tok-op-a' }
        });
        expect(dispatchCampaign.status).toBe(501);

        const crossTenantCampaigns = await fetch(`${baseUrl}/api/crm/campaigns?tenantId=tenant-b`, {
          headers: { Authorization: 'Bearer tok-op-a' }
        });
        expect(crossTenantCampaigns.status).toBe(403);
      });
    });

    it('10. RH e notas respeitam vínculo da conta e da unidade', async () => {
      getCol('hr_employees').set('legacy-hr-record', {
        id: 'legacy-hr-record', tenantId: 'tenant-a', name: 'Registro legado', role: 'caixa', shift: 'integral',
        hireDate: '2025-01-01', status: 'active', cpf: '12345678900', salary: 8500
      });
      await withServer(async (baseUrl) => {
        const createEmployee = await fetch(`${baseUrl}/api/hr/employees`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-owner-a' },
          body: JSON.stringify({
            tenantId: 'tenant-a', name: 'Joana Operações', role: 'atendente', shift: 'tarde', hireDate: '2026-10-20',
            cpf: '12345678900', salary: 9000
          })
        });
        expect(createEmployee.status).toBe(201);
        const employee = await createEmployee.json() as Record<string, unknown>;
        expect(employee['tenantId']).toBe('tenant-a');
        expect(employee['cpf']).toBeUndefined();
        expect(employee['salary']).toBeUndefined();

        const employeeList = await fetch(`${baseUrl}/api/hr/employees`, {
          headers: { Authorization: 'Bearer tok-owner-a' }
        });
        const employees = await employeeList.json() as Record<string, unknown>[];
        const legacy = employees.find((item) => item['id'] === 'legacy-hr-record');
        expect(legacy?.['cpf']).toBeUndefined();
        expect(legacy?.['salary']).toBeUndefined();

        const waiterCreate = await fetch(`${baseUrl}/api/hr/employees`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-waiter-a' },
          body: JSON.stringify({ name: 'Não autorizado', role: 'atendente', shift: 'integral' })
        });
        expect(waiterCreate.status).toBe(403);

        const crossTenantList = await fetch(`${baseUrl}/api/hr/employees?tenantId=tenant-a`, {
          headers: { Authorization: 'Bearer tok-owner-b' }
        });
        expect(crossTenantList.status).toBe(403);

        const clockIn = await fetch(`${baseUrl}/api/hr/employees/${String(employee['id'])}/clock`, {
          method: 'POST', headers: { Authorization: 'Bearer tok-op-a' }
        });
        expect(clockIn.status).toBe(201);
        expect((await clockIn.json() as Record<string, unknown>)['type']).toBe('in');
        const clockOut = await fetch(`${baseUrl}/api/hr/employees/${String(employee['id'])}/clock`, {
          method: 'POST', headers: { Authorization: 'Bearer tok-op-a' }
        });
        expect((await clockOut.json() as Record<string, unknown>)['type']).toBe('out');

        const createNote = await fetch(`${baseUrl}/api/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-owner-a' },
          body: JSON.stringify({ tenantId: 'tenant-a', title: 'Abertura', content: 'Conferir salão', color: 'yellow' })
        });
        expect(createNote.status).toBe(201);
        const note = await createNote.json() as Record<string, unknown>;
        expect(note['tenantId']).toBe('tenant-a');

        const crossTenantNote = await fetch(`${baseUrl}/api/notes?tenantId=tenant-b`, {
          headers: { Authorization: 'Bearer tok-owner-a' }
        });
        expect(crossTenantNote.status).toBe(403);
        const noteDeleteByOtherUser = await fetch(`${baseUrl}/api/notes/${String(note['id'])}`, {
          method: 'DELETE', headers: { Authorization: 'Bearer tok-owner-b' }
        });
        expect(noteDeleteByOtherUser.status).toBe(404);
      });
    });

    it('11. Ordens de serviço são isoladas por loja, com transição autorizada e sem liquidação fictícia', async () => {
      await withServer(async (baseUrl) => {
        const createOrder = await fetch(`${baseUrl}/api/service-orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-owner-a' },
          body: JSON.stringify({ tenantId: 'tenant-a', customerName: 'Cliente Serviço', description: 'Revisão preventiva', equipment: 'Forno', finalPrice: 900 })
        });
        expect(createOrder.status).toBe(201);
        const order = await createOrder.json() as Record<string, unknown>;
        expect(order['status']).toBe('open');
        expect(order['tenantId']).toBe('tenant-a');
        expect(order['finalPrice']).toBeUndefined();

        const waiterTransition = await fetch(`${baseUrl}/api/service-orders/${String(order['id'])}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-waiter-a' },
          body: JSON.stringify({ status: 'in_progress' })
        });
        expect(waiterTransition.status).toBe(403);

        const crossTenantTransition = await fetch(`${baseUrl}/api/service-orders/${String(order['id'])}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-owner-b' },
          body: JSON.stringify({ status: 'in_progress' })
        });
        expect(crossTenantTransition.status).toBe(404);

        const validTransition = await fetch(`${baseUrl}/api/service-orders/${String(order['id'])}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-op-a' },
          body: JSON.stringify({ status: 'in_progress', progress: 45 })
        });
        expect(validTransition.status).toBe(200);
        expect((await validTransition.json() as Record<string, unknown>)['progressPercent']).toBe(45);

        const fakeSettlement = await fetch(`${baseUrl}/api/service-orders/${String(order['id'])}/settle`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-op-a' },
          body: JSON.stringify({ paymentMethod: 'pix' })
        });
        expect(fakeSettlement.status).toBe(404);
      });
    });

    it('12. Fornecedores e contagens de estoque persistem sem cruzar unidades ou ajustar saldo automaticamente', async () => {
      getCol('products').set('prod-burger-b', {
        id: 'prod-burger-b', tenantId: 'tenant-b', name: 'Produto Loja B', category: 'Geral', price: 10,
        costPrice: 5, stock: 7, minStock: 1, barcode: '7892', sku: 'SKU-B', image: '', availableOnline: true, description: ''
      });
      getCol('suppliers').set('sup-b', {
        id: 'sup-b', tenantId: 'tenant-b', name: 'Fornecedor B', category: 'Geral', contactName: '', phone: '', email: '', status: 'active'
      });
      await withServer(async (baseUrl) => {
        const createSupplier = await fetch(`${baseUrl}/api/suppliers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-owner-a' },
          body: JSON.stringify({ tenantId: 'tenant-a', name: 'Distribuidora A', category: 'Bebidas', contactName: 'Ana', phone: '11999990000' })
        });
        expect(createSupplier.status).toBe(201);
        const supplier = await createSupplier.json() as Record<string, unknown>;
        expect(supplier['tenantId']).toBe('tenant-a');

        const rivalSupplierList = await fetch(`${baseUrl}/api/suppliers?tenantId=tenant-a`, {
          headers: { Authorization: 'Bearer tok-owner-b' }
        });
        expect(rivalSupplierList.status).toBe(403);

        const crossTenantSupplierLink = await fetch(`${baseUrl}/api/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-owner-a' },
          body: JSON.stringify({ tenantId: 'tenant-a', name: 'Produto sem vínculo cruzado', price: 1, supplierId: 'sup-b' })
        });
        expect(crossTenantSupplierLink.status).toBe(400);

        const count = await fetch(`${baseUrl}/api/stock-audits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-op-a' },
          body: JSON.stringify({ tenantId: 'tenant-a', entries: [{ productId: 'prod-burger-a', countedStock: 8 }] })
        });
        expect(count.status).toBe(201);
        const audit = await count.json() as Record<string, unknown>;
        const entries = audit['entries'] as Record<string, unknown>[];
        expect(entries[0]?.['systemStock']).toBe(10);
        expect(entries[0]?.['difference']).toBe(-2);
        expect(getCol('products').get('prod-burger-a')?.['stock']).toBe(10);

        const crossTenantCount = await fetch(`${baseUrl}/api/stock-audits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-owner-a' },
          body: JSON.stringify({ tenantId: 'tenant-a', entries: [{ productId: 'prod-burger-b', countedStock: 7 }] })
        });
        expect(crossTenantCount.status).toBe(403);

        const createTask = await fetch(`${baseUrl}/api/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-op-a' },
          body: JSON.stringify({ tenantId: 'tenant-a', title: 'Conferir abertura', sector: 'Caixa' })
        });
        expect(createTask.status).toBe(201);
        const task = await createTask.json() as Record<string, unknown>;
        const completeTask = await fetch(`${baseUrl}/api/tasks/${String(task['id'])}/completed`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-op-a' },
          body: JSON.stringify({ completed: true })
        });
        expect(completeTask.status).toBe(200);
        expect((await completeTask.json() as Record<string, unknown>)['completed']).toBe(true);
      });
    });
  });
});

