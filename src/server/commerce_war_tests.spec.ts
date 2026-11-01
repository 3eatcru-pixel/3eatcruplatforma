import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express, { Express } from 'express';
import { Server } from 'http';
import { AddressInfo } from 'net';
import { __setFirebaseAdminTestOverrides } from './firebase-admin';
import { apiRouter } from './api';
import {
  QueuedAction,
  SyncConflictRecord,
  executeOfflineOutboxReplay
} from '../shared/offline/offline-outbox.engine';

type StoreMap = Record<string, Map<string, Record<string, unknown>>>;

const mockStore: StoreMap = {};
let txLock: Promise<void> = Promise.resolve();

function getCol(name: string): Map<string, Record<string, unknown>> {
  if (!mockStore[name]) {
    mockStore[name] = new Map();
  }
  return mockStore[name]!;
}

function resetMockStore(): void {
  for (const key of Object.keys(mockStore)) {
    mockStore[key]!.clear();
  }
}

function makeDocRef(colName: string, docId: string) {
  return {
    id: docId,
    _col: colName,
    get: async () => {
      const data = getCol(colName).get(docId);
      return {
        id: docId,
        exists: Boolean(data),
        data: () => (data ? structuredClone(data) : undefined)
      };
    },
    set: async (val: Record<string, unknown>, opts?: { merge?: boolean }) => {
      const col = getCol(colName);
      if (opts?.merge && col.has(docId)) {
        col.set(docId, { ...col.get(docId)!, ...structuredClone(val) });
      } else {
        col.set(docId, structuredClone(val));
      }
    },
    update: async (val: Record<string, unknown>) => {
      const col = getCol(colName);
      const prev = col.get(docId) || {};
      col.set(docId, { ...prev, ...structuredClone(val) });
    },
    delete: async () => {
      getCol(colName).delete(docId);
    }
  };
}

function buildQuery(
  colName: string,
  filters: { field: string; op: string; val: unknown }[] = []
) {
  return {
    where: (field: string, op: string, val: unknown) =>
      buildQuery(colName, [...filters, { field, op, val }]),
    orderBy: () => buildQuery(colName, filters),
    limit: () => buildQuery(colName, filters),
    get: async () => {
      const all = Array.from(getCol(colName).entries());
      const matched = all.filter(([, doc]) =>
        filters.every((f) => {
          const v = doc[f.field];
          if (f.op === '==') return v === f.val;
          if (f.op === 'in' && Array.isArray(f.val)) return f.val.includes(v);
          if (f.op === 'array-contains' && Array.isArray(v)) return v.includes(f.val);
          return true;
        })
      );
      return {
        empty: matched.length === 0,
        size: matched.length,
        docs: matched.map(([id, data]) => ({
          id,
          exists: true,
          data: () => structuredClone(data)
        }))
      };
    }
  };
}

async function runMockTx<T>(
  fn: (tx: {
    get: (ref: ReturnType<typeof makeDocRef>) => Promise<unknown>;
    set: (
      ref: ReturnType<typeof makeDocRef>,
      val: Record<string, unknown>,
      opts?: { merge?: boolean }
    ) => void;
    update: (ref: ReturnType<typeof makeDocRef>, val: Record<string, unknown>) => void;
  }) => Promise<T>
): Promise<T> {
  let releaseLock!: () => void;
  const prevLock = txLock;
  txLock = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });

  await prevLock;
  try {
    const stagedWrites: (() => Promise<void>)[] = [];
    const tx = {
      get: (ref: ReturnType<typeof makeDocRef>) => ref.get(),
      set: (
        ref: ReturnType<typeof makeDocRef>,
        val: Record<string, unknown>,
        opts?: { merge?: boolean }
      ) => {
        stagedWrites.push(() => ref.set(val, opts));
      },
      update: (ref: ReturnType<typeof makeDocRef>, val: Record<string, unknown>) => {
        stagedWrites.push(() => ref.update(val));
      }
    };
    const result = await fn(tx);
    for (const w of stagedWrites) {
      await w();
    }
    return result;
  } finally {
    releaseLock();
  }
}

const mockTokens: Record<
  string,
  {
    uid: string;
    email: string;
    email_verified: boolean;
    role?: string;
    tenantId?: string;
    name?: string;
  }
> = {
  'token-alpha-op': {
    uid: 'uid-alpha-op',
    email: 'caixa@alpha.com',
    email_verified: true,
    role: 'operator',
    tenantId: 'tenant-alpha',
    name: 'Operador Alpha'
  },
  'token-alpha-op2': {
    uid: 'uid-alpha-op2',
    email: 'caixa2@alpha.com',
    email_verified: true,
    role: 'operator',
    tenantId: 'tenant-alpha',
    name: 'Operador Alpha 2'
  },
  'token-beta-op': {
    uid: 'uid-beta-op',
    email: 'caixa@beta.com',
    email_verified: true,
    role: 'operator',
    tenantId: 'tenant-beta',
    name: 'Operador Beta'
  },
  'token-consumer': {
    uid: 'uid-consumer-war',
    email: 'cliente.war@gmail.com',
    email_verified: true,
    role: 'consumer',
    name: 'Consumidor Online'
  },
  'token-driver-1': {
    uid: 'uid-driver-1',
    email: 'driver1@delivery.com',
    email_verified: true,
    role: 'driver',
    name: 'Entregador Carlos'
  },
  'token-driver-2': {
    uid: 'uid-driver-2',
    email: 'driver2@delivery.com',
    email_verified: true,
    role: 'driver',
    name: 'Entregador Roberto'
  }
};

const mockAdminDb = {
  collection: (name: string) => ({
    doc: (id?: string) =>
      makeDocRef(name, id || `auto-${Math.random().toString(36).slice(2, 8)}`),
    where: (field: string, op: string, val: unknown) =>
      buildQuery(name, [{ field, op, val }]),
    orderBy: () => buildQuery(name, []),
    limit: () => buildQuery(name, []),
    get: () => buildQuery(name, []).get()
  }),
  batch: () => {
    const ops: (() => Promise<void>)[] = [];
    return {
      set: (
        ref: ReturnType<typeof makeDocRef>,
        val: Record<string, unknown>,
        opts?: { merge?: boolean }
      ) => {
        ops.push(() => ref.set(val, opts));
      },
      update: (ref: ReturnType<typeof makeDocRef>, val: Record<string, unknown>) => {
        ops.push(() => ref.update(val));
      },
      commit: async () => {
        for (const op of ops) await op();
      }
    };
  },
  runTransaction: runMockTx
};

const mockAdminAuth = {
  verifyIdToken: vi.fn(async (token: string) => {
    const found = mockTokens[token];
    if (!found) throw new Error('Invalid token');
    return found;
  }),
  getUser: vi.fn(async (uid: string) => ({ uid, customClaims: {} })),
  setCustomUserClaims: vi.fn(async () => undefined)
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

async function apiJson(
  baseUrl: string,
  path: string,
  method: string,
  options: { token?: string; headers?: Record<string, string>; body?: unknown } = {}
): Promise<{ status: number; body: Record<string, unknown> }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }
  const resp = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  });
  const body = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: resp.status, body };
}

describe('3eatcru — Suite de Testes de Guerra Comercial (Omnichannel & Offline)', () => {
  beforeEach(() => {
    resetMockStore();
    __setFirebaseAdminTestOverrides({ db: mockAdminDb, auth: mockAdminAuth });

    getCol('tenants').set('tenant-alpha', {
      id: 'tenant-alpha',
      name: 'Alpha Burger Lab',
      slug: 'alpha-burger',
      cnpj: '11.222.333/0001-44',
      category: 'restaurant',
      status: 'active',
      isOpen: true,
      supportsDelivery: true,
      supportsTakeout: true,
      deliveryFee: 5.0,
      minOrderValue: 0,
      staffUids: ['uid-alpha-op', 'uid-alpha-op2']
    });

    getCol('tenants').set('tenant-beta', {
      id: 'tenant-beta',
      name: 'Beta Sushi House',
      slug: 'beta-sushi',
      cnpj: '55.666.777/0001-88',
      category: 'restaurant',
      status: 'active',
      isOpen: true,
      supportsDelivery: true,
      supportsTakeout: true,
      deliveryFee: 8.0,
      minOrderValue: 0,
      staffUids: ['uid-beta-op']
    });

    getCol('drivers').set('uid-driver-1', {
      id: 'uid-driver-1',
      tenantId: 'marketplace',
      name: 'Entregador Carlos',
      phone: '(11) 99999-1111',
      vehicleType: 'moto',
      status: 'available',
      rating: 5.0,
      activeDeliveriesCount: 0,
      completedTodayCount: 0,
      driverType: 'platform',
      complianceVerified: true
    });

    getCol('drivers').set('uid-driver-2', {
      id: 'uid-driver-2',
      tenantId: 'marketplace',
      name: 'Entregador Roberto',
      phone: '(11) 99999-2222',
      vehicleType: 'moto',
      status: 'available',
      rating: 4.9,
      activeDeliveriesCount: 0,
      completedTodayCount: 0,
      driverType: 'platform',
      complianceVerified: true
    });
  });

  afterEach(() => {
    __setFirebaseAdminTestOverrides(null);
  });

  it('Guerra 1: Duas vendas simultâneas disputando 1 item em estoque -> 1 aprova (201), 1 rejeita (409 STOCK_CONFLICT), zero estoque negativo', async () => {
    getCol('products').set('prod-last-1', {
      id: 'prod-last-1',
      tenantId: 'tenant-alpha',
      name: 'Burger Edição Limitada',
      description: 'Edição especial',
      sku: 'LIM-01',
      barcode: '7890001',
      price: 45.0,
      costPrice: 18.0,
      stock: 1,
      minStock: 1,
      category: 'Lanches',
      availableOnline: true
    });

    await withServer(async (baseUrl) => {
      const [posRes, marketRes] = await Promise.all([
        apiJson(baseUrl, '/api/orders', 'POST', {
          token: 'token-alpha-op',
          body: {
            type: 'pos-counter',
            channel: 'POS',
            status: 'completed',
            paymentMethod: 'cash',
            cashConfirmedByOperator: true,
            items: [{ productId: 'prod-last-1', quantity: 1 }]
          }
        }),
        apiJson(baseUrl, '/api/orders', 'POST', {
          token: 'token-consumer',
          body: {
            tenantId: 'tenant-alpha',
            type: 'delivery',
            channel: 'Online Marketplace',
            paymentMethod: 'online',
            items: [{ productId: 'prod-last-1', quantity: 1 }]
          }
        })
      ]);

      const statuses = [posRes.status, marketRes.status].sort();
      expect(statuses).toEqual([201, 409]);

      const conflictRes = posRes.status === 409 ? posRes : marketRes;
      expect(conflictRes.body['code']).toBe('STOCK_CONFLICT');
      expect(getCol('products').get('prod-last-1')?.['stock']).toBe(0);
      expect(getCol('public_catalog').get('prod-last-1')?.['inStock']).toBe(false);
      expect(getCol('orders').size).toBe(1);
    });
  });

  it('Guerra 2 (Cenário Coca-Cola Offline + Online): PDV A vende offline, PDV B vende online primeiro -> reconexão de PDV A gera conflito auditável sem loop nem estoque negativo', async () => {
    getCol('products').set('prod-coca', {
      id: 'prod-coca',
      tenantId: 'tenant-alpha',
      name: 'Coca-Cola Lata 350ml',
      description: 'Refrigerante lata',
      sku: 'COCA-350',
      barcode: '7894900011517',
      price: 8.5,
      costPrice: 3.2,
      stock: 1,
      minStock: 5,
      category: 'Bebidas',
      availableOnline: true
    });

    await withServer(async (baseUrl) => {
      const offlineQueue: QueuedAction[] = [
        {
          id: 'off-ord-pdv-a-coca',
          action: 'CREATE_ORDER',
          endpoint: '/api/orders',
          idempotencyKey: 'off-ord-pdv-a-coca',
          timestamp: new Date().toISOString(),
          retries: 0,
          payload: {
            id: 'off-ord-pdv-a-coca',
            idempotencyKey: 'off-ord-pdv-a-coca',
            orderNumber: '#OFF-PDVA-01',
            tenantId: 'tenant-alpha',
            type: 'pos-counter',
            channel: 'POS',
            status: 'completed',
            paymentMethod: 'cash',
            cashConfirmedByOperator: true,
            total: 8.5,
            items: [{ productId: 'prod-coca', quantity: 1 }]
          }
        }
      ];

      const pdvBRes = await apiJson(baseUrl, '/api/orders', 'POST', {
        token: 'token-alpha-op2',
        body: {
          orderNumber: '#PDVB-ONLINE-01',
          type: 'pos-counter',
          channel: 'POS',
          status: 'completed',
          paymentMethod: 'cash',
          cashConfirmedByOperator: true,
          items: [{ productId: 'prod-coca', quantity: 1 }]
        }
      });
      expect(pdvBRes.status).toBe(201);
      expect(getCol('products').get('prod-coca')?.['stock']).toBe(0);

      const detectedConflicts: SyncConflictRecord[] = [];
      const { summary, remainingQueue, newConflicts } = await executeOfflineOutboxReplay({
        queue: offlineQueue,
        transport: async (endpoint, payload, headers) => {
          const res = await apiJson(baseUrl, endpoint, 'POST', {
            token: 'token-alpha-op',
            headers,
            body: payload
          });
          if (res.status >= 200 && res.status < 300) {
            return res.body;
          }
          throw {
            status: res.status,
            code: String(res.body['code'] || ''),
            message: String(res.body['error'] || '')
          };
        },
        onConflict: (c) => detectedConflicts.push(c)
      });

      expect(summary).toEqual({ processed: 0, failed: 0, conflicts: 1, deadLetterCount: 0 });
      expect(remainingQueue.length).toBe(0);
      expect(newConflicts.length).toBe(1);
      expect(detectedConflicts.length).toBe(1);
      expect(newConflicts[0]?.orderNumber).toBe('#OFF-PDVA-01');
      expect(newConflicts[0]?.code).toBe('STOCK_CONFLICT');
      expect(newConflicts[0]?.status).toBe('conflict_cancelled');
      expect(getCol('products').get('prod-coca')?.['stock']).toBe(0);
      expect(getCol('orders').size).toBe(1);
      expect(getCol('financials').size).toBe(1);
    });
  });

  it('Guerra 3: Liquidação/Pagamento duplicado concorrente gera exatamente 1 lançamento financeiro fin-sale-*', async () => {
    getCol('products').set('prod-dish', {
      id: 'prod-dish',
      tenantId: 'tenant-alpha',
      name: 'Risoto Trufado',
      description: 'Arroz arbóreo com trufas',
      sku: 'RIS-01',
      barcode: '7890002',
      price: 68.0,
      costPrice: 22.0,
      stock: 10,
      minStock: 2,
      category: 'Lanches',
      availableOnline: true
    });

    await withServer(async (baseUrl) => {
      const createRes = await apiJson(baseUrl, '/api/orders', 'POST', {
        token: 'token-alpha-op',
        body: {
          type: 'dine-in',
          tableNumber: 'Mesa 07',
          channel: 'POS',
          paymentMethod: 'card',
          items: [{ productId: 'prod-dish', quantity: 2 }]
        }
      });
      expect(createRes.status).toBe(201);
      const orderId = String(createRes.body['id']);
      const paymentTransactionId = `approved-payment-${orderId}`;
      getCol('payment_transactions').set(paymentTransactionId, {
        id: paymentTransactionId,
        orderId,
        tenantId: 'tenant-alpha',
        amount: 136.0,
        feeDeducted: 0,
        netAmount: 136.0,
        method: 'credit_card',
        status: 'approved',
        gateway: 'test-fixture',
        authorizationCode: 'test-approved',
        environment: 'sandbox',
        mode: 'simulation',
        createdByUid: 'uid-alpha-op',
        createdAt: new Date().toISOString()
      });
      const createdOrder = getCol('orders').get(orderId)!;
      getCol('orders').set(orderId, {
        ...createdOrder,
        paymentStatus: 'approved',
        paymentTransactionId
      });

      const [settleA, settleB] = await Promise.all([
        apiJson(baseUrl, `/api/orders/${orderId}/status`, 'PATCH', {
          token: 'token-alpha-op',
          body: { status: 'completed' }
        }),
        apiJson(baseUrl, `/api/orders/${orderId}/status`, 'PATCH', {
          token: 'token-alpha-op2',
          body: { status: 'completed' }
        })
      ]);

      expect(settleA.status).toBe(200);
      expect(settleB.status).toBe(200);
      expect(getCol('financials').size).toBe(1);
      expect(getCol('financials').get(`fin-sale-${orderId}`)?.['amount']).toBe(136.0);
    });
  });

  it('Guerra 4: Reenvio triplo de pedido com mesma X-Idempotency-Key cria apenas 1 pedido e 1 baixa de estoque', async () => {
    getCol('products').set('prod-coffee', {
      id: 'prod-coffee',
      tenantId: 'tenant-alpha',
      name: 'Espresso Duplo',
      description: 'Café curto intenso',
      sku: 'ESP-02',
      barcode: '7890003',
      price: 12.0,
      costPrice: 2.5,
      stock: 10,
      minStock: 2,
      category: 'Bebidas',
      availableOnline: true
    });

    await withServer(async (baseUrl) => {
      const payload = {
        type: 'pos-counter',
        channel: 'POS',
        status: 'completed',
        paymentMethod: 'cash',
        cashConfirmedByOperator: true,
        items: [{ productId: 'prod-coffee', quantity: 2 }]
      };

      const r1 = await apiJson(baseUrl, '/api/orders', 'POST', {
        token: 'token-alpha-op',
        headers: { 'X-Idempotency-Key': 'retry-key-999' },
        body: payload
      });
      const r2 = await apiJson(baseUrl, '/api/orders', 'POST', {
        token: 'token-alpha-op',
        headers: { 'X-Idempotency-Key': 'retry-key-999' },
        body: payload
      });
      const r3 = await apiJson(baseUrl, '/api/orders', 'POST', {
        token: 'token-alpha-op',
        headers: { 'X-Idempotency-Key': 'retry-key-999' },
        body: payload
      });

      expect(r1.status).toBe(201);
      expect(r2.status).toBe(200);
      expect(r3.status).toBe(200);
      expect(r1.body['id']).toBe('retry-key-999');
      expect(getCol('products').get('prod-coffee')?.['stock']).toBe(8);
      expect(getCol('orders').size).toBe(1);
      expect(getCol('financials').size).toBe(1);
    });
  });

  it('Guerra 5: Cancelamento concorrente de pedido não pago restaura o estoque exatamente 1 vez', async () => {
    getCol('products').set('prod-wine', {
      id: 'prod-wine',
      tenantId: 'tenant-alpha',
      name: 'Vinho Malbec Reserva',
      description: 'Safra especial',
      sku: 'VIN-01',
      barcode: '7890004',
      price: 120.0,
      costPrice: 55.0,
      stock: 5,
      minStock: 1,
      category: 'Bebidas',
      availableOnline: true
    });

    await withServer(async (baseUrl) => {
      const sale = await apiJson(baseUrl, '/api/orders', 'POST', {
        token: 'token-alpha-op',
        body: {
          type: 'delivery',
          channel: 'Online Marketplace',
          paymentMethod: 'pix',
          items: [{ productId: 'prod-wine', quantity: 2 }]
        }
      });
      expect(sale.status).toBe(201);
      expect(getCol('products').get('prod-wine')?.['stock']).toBe(3);

      const orderId = String(sale.body['id']);

      const [cancel1, cancel2] = await Promise.all([
        apiJson(baseUrl, `/api/orders/${orderId}/status`, 'PATCH', {
          token: 'token-alpha-op',
          body: { status: 'cancelled' }
        }),
        apiJson(baseUrl, `/api/orders/${orderId}/status`, 'PATCH', {
          token: 'token-alpha-op2',
          body: { status: 'cancelled' }
        })
      ]);

      const statuses = [cancel1.status, cancel2.status].sort();
      expect(statuses).toEqual([200, 409]);

      const rejected = cancel1.status === 409 ? cancel1 : cancel2;
      expect(rejected.body['code']).toBe('ORDER_ALREADY_CANCELLED');

      expect(getCol('products').get('prod-wine')?.['stock']).toBe(5);
      expect(getCol('financials').has(`fin-sale-${orderId}`)).toBe(false);
      expect(getCol('financials').has(`fin-rev-${orderId}`)).toBe(false);
      expect(getCol('financials').size).toBe(0);
    });
  });

  it('Guerra 6: Estoque no limite consumido por 5 canais omnichannel distintos até zero exato', async () => {
    getCol('products').set('prod-omni', {
      id: 'prod-omni',
      tenantId: 'tenant-alpha',
      name: 'Combo Omnichannel',
      description: 'Combo multicanal',
      sku: 'OMNI-05',
      barcode: '7890005',
      price: 35.0,
      costPrice: 12.0,
      stock: 5,
      minStock: 1,
      category: 'Lanches',
      availableOnline: true
    });

    await withServer(async (baseUrl) => {
      const channels = ['pos', 'storefront', 'marketplace', 'whatsapp', 'ifood'];
      for (const ch of channels) {
        const res = await apiJson(baseUrl, `/api/orders/channels/${ch}`, 'POST', {
          token: 'token-alpha-op',
          body: {
            type: ch === 'pos' ? 'pos-counter' : 'delivery',
            items: [{ productId: 'prod-omni', quantity: 1 }]
          }
        });
        expect(res.status).toBe(201);
      }

      expect(getCol('products').get('prod-omni')?.['stock']).toBe(0);

      const sixth = await apiJson(baseUrl, '/api/orders/channels/qr_table', 'POST', {
        body: {
          tenantId: 'tenant-alpha',
          type: 'dine-in',
          tableNumber: 'Mesa 02',
          items: [{ productId: 'prod-omni', quantity: 1 }]
        }
      });
      expect(sixth.status).toBe(409);
      expect(sixth.body['code']).toBe('STOCK_CONFLICT');
      expect(getCol('products').get('prod-omni')?.['stock']).toBe(0);
    });
  });

  it('Guerra 7: Sabotagem entre Tenants e Resolução Automática de Tenant pelo Backend (sem tenant fixo no frontend)', async () => {
    getCol('products').set('prod-alpha', {
      id: 'prod-alpha',
      tenantId: 'tenant-alpha',
      name: 'Item Alpha',
      description: 'Produto Alpha',
      sku: 'ALP-1',
      barcode: '111',
      price: 20.0,
      costPrice: 8.0,
      stock: 10,
      minStock: 1,
      category: 'Lanches',
      availableOnline: true
    });
    getCol('products').set('prod-beta', {
      id: 'prod-beta',
      tenantId: 'tenant-beta',
      name: 'Item Beta',
      description: 'Produto Beta',
      sku: 'BET-1',
      barcode: '222',
      price: 30.0,
      costPrice: 10.0,
      stock: 10,
      minStock: 1,
      category: 'Lanches',
      availableOnline: true
    });

    await withServer(async (baseUrl) => {
      const implicitTenantSale = await apiJson(baseUrl, '/api/orders', 'POST', {
        token: 'token-alpha-op',
        body: {
          type: 'pos-counter',
          channel: 'POS',
          status: 'completed',
          paymentMethod: 'cash',
          cashConfirmedByOperator: true,
          items: [{ productId: 'prod-alpha', quantity: 1 }]
        }
      });
      expect(implicitTenantSale.status).toBe(201);
      expect(implicitTenantSale.body['tenantId']).toBe('tenant-alpha');

      const crossSaleAttempt = await apiJson(baseUrl, '/api/orders', 'POST', {
        token: 'token-alpha-op',
        body: {
          tenantId: 'tenant-beta',
          type: 'pos-counter',
          channel: 'POS',
          items: [{ productId: 'prod-beta', quantity: 1 }]
        }
      });
      expect(crossSaleAttempt.status).toBe(403);
      expect(crossSaleAttempt.body['code']).toBe('TENANT_MISMATCH');

      const crossOrders = await apiJson(baseUrl, '/api/orders?tenantId=tenant-alpha', 'GET', {
        token: 'token-beta-op'
      });
      expect(crossOrders.status).toBe(403);

      const crossTable = await apiJson(baseUrl, '/api/tables', 'POST', {
        token: 'token-beta-op',
        body: { tenantId: 'tenant-alpha', number: 99, capacity: 4 }
      });
      expect(crossTable.status).toBe(403);

      const crossFinancials = await apiJson(
        baseUrl,
        '/api/financials?tenantId=tenant-alpha',
        'GET',
        { token: 'token-beta-op' }
      );
      expect(crossFinancials.status).toBe(403);
    });
  });

  it('Guerra 8: Proteção de Propriedade Estrita do Entregador (apenas entregador atribuído via rota pode atuar no pedido)', async () => {
    getCol('drivers').set('uid-driver-1', {
      id: 'uid-driver-1',
      tenantId: 'tenant-alpha',
      name: 'Entregador Carlos',
      driverType: 'private',
      status: 'available'
    });

    getCol('products').set('prod-del-1', {
      id: 'prod-del-1',
      tenantId: 'tenant-alpha',
      name: 'Marmita Completa',
      description: 'Refeição executiva',
      sku: 'MAR-01',
      barcode: '999111',
      price: 28.0,
      costPrice: 10.0,
      stock: 20,
      minStock: 1,
      category: 'Refeições',
      availableOnline: true
    });

    await withServer(async (baseUrl) => {
      // 1. Create a delivery order
      const delOrder = await apiJson(baseUrl, '/api/orders', 'POST', {
        token: 'token-consumer',
        body: {
          tenantId: 'tenant-alpha',
          type: 'delivery',
          channel: 'Online Marketplace',
          items: [{ productId: 'prod-del-1', quantity: 1 }]
        }
      });
      expect(delOrder.status).toBe(201);
      const orderId = String(delOrder.body['id']);

      // 2. Store creates delivery route linking the order, and Driver 1 accepts it -> attaches driverId = 'uid-driver-1'
      const routeRes = await apiJson(baseUrl, '/api/logistics/routes', 'POST', {
        token: 'token-alpha-op',
        body: {
          waypoints: [
            {
              id: 'wp-war-1',
              orderId,
              address: 'Rua Augusta, 900',
              customerName: 'Consumidor Online',
              status: 'pending'
            }
          ]
        }
      });
      expect(routeRes.status).toBe(201);
      const routeId = String(routeRes.body['id']);

      const acceptRes = await apiJson(baseUrl, `/api/logistics/routes/${routeId}/accept`, 'POST', {
        token: 'token-driver-1',
        body: {}
      });
      expect(acceptRes.status).toBe(200);

      // 3. Assigned Driver 1 advances order status to 'delivered'
      const driver1Update = await apiJson(baseUrl, `/api/orders/${orderId}/status`, 'PATCH', {
        token: 'token-driver-1',
        body: { status: 'delivered' }
      });
      expect(driver1Update.status).toBe(200);
      expect(driver1Update.body['driverId']).toBe('uid-driver-1');

      // 4. Driver 2 tries to tamper with Driver 1's assigned order -> 403 FORBIDDEN_ORDER_TRANSITION
      const driver2Tamper = await apiJson(baseUrl, `/api/orders/${orderId}/status`, 'PATCH', {
        token: 'token-driver-2',
        body: { status: 'completed' }
      });
      expect(driver2Tamper.status).toBe(403);
      expect(driver2Tamper.body['code']).toBe('FORBIDDEN_ORDER_TRANSITION');
    });
  });
});
