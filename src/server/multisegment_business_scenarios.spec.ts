import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express, { Express } from 'express';
import { Server } from 'http';
import { AddressInfo } from 'net';
import { __setFirebaseAdminTestOverrides } from './firebase-admin';
import { apiRouter } from './api';
import {
  CompanyTenant,
  ProductItem,
  OrderTransaction,
  TableInfo
} from '../shared/models/ecosystem.model';
import {
  QueuedAction,
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
      const col = getCol(colName);
      let docs = Array.from(col.entries()).map(([id, data]) => ({
        id,
        exists: true,
        data: () => structuredClone(data)
      }));

      for (const f of filters) {
        docs = docs.filter((d) => {
          const val = d.data()[f.field];
          if (f.op === '==') return val === f.val;
          if (f.op === '!=') return val !== f.val;
          if (f.op === '>') return Number(val) > Number(f.val);
          if (f.op === '>=') return Number(val) >= Number(f.val);
          if (f.op === '<') return Number(val) < Number(f.val);
          if (f.op === '<=') return Number(val) <= Number(f.val);
          return true;
        });
      }

      return {
        empty: docs.length === 0,
        size: docs.length,
        docs
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

function makeMockProduct(overrides: Partial<ProductItem> & { id: string; tenantId: string; name: string; price: number }): ProductItem {
  return {
    category: 'Geral',
    costPrice: 0,
    stock: 10,
    minStock: 2,
    barcode: `789000${Math.floor(Math.random() * 100000)}`,
    sku: `SKU-${overrides.id}`,
    image: 'https://images.unsplash.com/photo-sample',
    availableOnline: true,
    description: 'Item de teste multissegmento',
    ...overrides
  };
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
  'token-restaurant-waiter': {
    uid: 'uid-waiter-1',
    email: 'garcom@pizzaria.com',
    email_verified: true,
    role: 'waiter',
    tenantId: 'tenant-food-pizzaria',
    name: 'Garçom Lucas'
  },
  'token-retail-cashier': {
    uid: 'uid-cashier-1',
    email: 'caixa@boutique.com',
    email_verified: true,
    role: 'operator',
    tenantId: 'tenant-retail-moda',
    name: 'Operador Beatriz'
  },
  'token-pharma-operator': {
    uid: 'uid-pharma-1',
    email: 'balcao@farmasaude.com',
    email_verified: true,
    role: 'operator',
    tenantId: 'tenant-pharma-saude',
    name: 'Farmacêutico Marcos'
  },
  'token-auto-mechanic': {
    uid: 'uid-auto-1',
    email: 'oficina@autocenter.com',
    email_verified: true,
    role: 'operator',
    tenantId: 'tenant-auto-center',
    name: 'Técnico Especialista Tiago'
  },
  'token-loja-a-op': {
    uid: 'uid-loja-a-op',
    email: 'caixa@lojaa.com',
    email_verified: true,
    role: 'operator',
    tenantId: 'tenant-loja-a',
    name: 'Operador Loja A'
  },
  'token-consumer-public': {
    uid: 'uid-consumer-joao',
    email: 'joao.silva@gmail.com',
    email_verified: true,
    role: 'consumer',
    name: 'João da Silva'
  },
  'token-salon-owner': {
    uid: 'uid-salon-1',
    email: 'dono@studiobeleza.com',
    email_verified: true,
    role: 'tenant_owner',
    tenantId: 'tenant-salon-001',
    name: 'Dona Helena'
  },
  'token-gym-admin': {
    uid: 'uid-gym-1',
    email: 'admin@irongym.com',
    email_verified: true,
    role: 'tenant_owner',
    tenantId: 'tenant-gym-fit',
    name: 'Mestre Arnold'
  },
  'token-hotel-waiter': {
    uid: 'uid-hotel-1',
    email: 'concierge@paradise.com',
    email_verified: true,
    role: 'operator',
    tenantId: 'tenant-hotel-paradise',
    name: 'Concierge Robert'
  },
  'token-burger-op': {
    uid: 'uid-burger-1',
    email: 'caixa@burgerexpress.com',
    email_verified: true,
    role: 'operator',
    tenantId: 'tenant-burger-exp',
    name: 'Chapeiro Bill'
  },
  'token-parts-op': {
    uid: 'uid-parts-1',
    email: 'balcao@parts.com',
    email_verified: true,
    role: 'operator',
    tenantId: 'tenant-parts-master',
    name: 'Vendedor Peças'
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

  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  try {
    await run(baseUrl);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

describe('Multisegment Business Scenarios (Store OS & Ecosystem Validation)', () => {
  beforeEach(() => {
    resetMockStore();
    __setFirebaseAdminTestOverrides({
      db: mockAdminDb as never,
      auth: mockAdminAuth as never
    });
  });

  afterEach(() => {
    __setFirebaseAdminTestOverrides({});
  });

  // =========================================================================
  // CENÁRIO 1: FOOD SERVICE & GASTRONOMIA (Restaurante, Pizzaria, Hamburgueria)
  // =========================================================================
  it('Cenário 1: Food Service - Comanda do Garçom respeita a fronteira de status do Store OS', async () => {
    await withServer(async (baseUrl) => {
      const foodTenant: Partial<CompanyTenant> = {
        id: 'tenant-food-pizzaria',
        name: 'Pizzaria Napolitana Tradizionale',
        category: 'restaurant',
        status: 'active',
        isOpen: true,
        supportsDelivery: true,
        supportsTakeout: true,
        deliveryFee: 10,
        minOrderValue: 30
      };
      getCol('tenants').set('tenant-food-pizzaria', foodTenant as Record<string, unknown>);

      const mesa4: TableInfo = {
        id: 'table-04',
        number: 4,
        tenantId: 'tenant-food-pizzaria',
        status: 'occupied',
        capacity: 4,
        guests: 3,
        currentTotal: 0
      };
      getCol('tables').set('table-04', mesa4 as unknown as Record<string, unknown>);

      const pizzaMargherita = makeMockProduct({
        id: 'prod-pizza-margherita',
        tenantId: 'tenant-food-pizzaria',
        name: 'Pizza Margherita Grande Especial',
        price: 68.0,
        costPrice: 22.0,
        stock: 50,
        category: 'Pizzas Salgadas'
      });
      const choppArtesanal = makeMockProduct({
        id: 'prod-chopp-500',
        tenantId: 'tenant-food-pizzaria',
        name: 'Chopp Artesanal IPA 500ml',
        price: 18.0,
        costPrice: 5.5,
        stock: 100,
        category: 'Bebidas'
      });
      getCol('products').set('prod-pizza-margherita', pizzaMargherita as unknown as Record<string, unknown>);
      getCol('products').set('prod-chopp-500', choppArtesanal as unknown as Record<string, unknown>);

      // 1. Garçom abre comanda no salão para a Mesa 4
      const orderPayload = {
        tenantId: 'tenant-food-pizzaria',
        tableId: 'table-04',
        type: 'dine-in',
        channel: 'Waiter Comanda',
        items: [
          { productId: 'prod-pizza-margherita', quantity: 1, notes: 'Massa crocante, sem cebola' },
          { productId: 'prod-chopp-500', quantity: 2, notes: 'Bem gelado com colarinho' }
        ],
        customerName: 'Mesa 4 Família Rossi'
      };

      const res = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-restaurant-waiter'
        },
        body: JSON.stringify(orderPayload)
      });

      expect(res.status).toBe(201);
      const createdOrder = (await res.json()) as OrderTransaction;

      // Validações do Pedido Food Service
      expect(createdOrder.tenantId).toBe('tenant-food-pizzaria');
      expect(createdOrder.channel).toBe('Waiter Comanda');
      expect(createdOrder.status).toBe('pending');
      // Subtotal: 68 + (18 * 2) = 104.00
      expect(createdOrder.subtotal).toBe(104.0);
      expect(createdOrder.deliveryFee).toBe(0); // Dine-in não paga delivery fee
      expect(createdOrder.total).toBe(104.0);

      // Sanitização de margem protegida: garçom e comanda não veem costPrice
      expect(createdOrder.items[0]!.product.costPrice).toBe(0);

      // Estoque abatido no ato da comanda
      const updatedPizza = getCol('products').get('prod-pizza-margherita') as unknown as ProductItem;
      expect(updatedPizza.stock).toBe(49);
      const updatedChopp = getCol('products').get('prod-chopp-500') as unknown as ProductItem;
      expect(updatedChopp.stock).toBe(98);

      // O garçom registra e acompanha a comanda, mas não opera transições do KDS.
      const kdsStatusRes = await fetch(`${baseUrl}/orders/${createdOrder.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-restaurant-waiter'
        },
        body: JSON.stringify({ status: 'preparing' })
      });
      expect(kdsStatusRes.status).toBe(403);
      expect((await kdsStatusRes.json() as { code: string }).code).toBe('FORBIDDEN_STAFF_TRANSITION');
      expect(getCol('orders').get(createdOrder.id)?.['status']).toBe('pending');
    });
  });

  // =========================================================================
  // CENÁRIO 2: VAREJO GERAL, MODA & ELETRO (EAN-13, Balcão, Desconto e Takeout)
  // =========================================================================
  it('Cenário 2: Varejo & Moda - Venda no PDV Balcão com Código de Barras e Desconto Autorizado', async () => {
    await withServer(async (baseUrl) => {
      const retailTenant: Partial<CompanyTenant> = {
        id: 'tenant-retail-moda',
        name: 'Moda Brasil Confecções',
        category: 'retail',
        status: 'active',
        isOpen: true,
        supportsDelivery: false,
        supportsTakeout: true
      };
      getCol('tenants').set('tenant-retail-moda', retailTenant as Record<string, unknown>);

      const vestidoFloral = makeMockProduct({
        id: 'prod-vestido-floral-m',
        tenantId: 'tenant-retail-moda',
        name: 'Vestido Estampa Floral Midi - Tamanho M',
        barcode: '7891234567890',
        price: 189.9,
        costPrice: 75.0,
        wholesalePrice: 130.0,
        stock: 12,
        category: 'Vestuário Feminino'
      });
      const cintoCouro = makeMockProduct({
        id: 'prod-cinto-couro-preto',
        tenantId: 'tenant-retail-moda',
        name: 'Cinto em Couro Legítimo Fivela Ouro',
        barcode: '7899876543210',
        price: 59.9,
        costPrice: 20.0,
        stock: 25,
        category: 'Acessórios'
      });
      getCol('products').set('prod-vestido-floral-m', vestidoFloral as unknown as Record<string, unknown>);
      getCol('products').set('prod-cinto-couro-preto', cintoCouro as unknown as Record<string, unknown>);

      // Operador no PDV passa os itens pelo código de barras e aplica desconto de R$ 19.80
      const posPayload = {
        tenantId: 'tenant-retail-moda',
        type: 'pos-counter',
        channel: 'POS',
        items: [
          { productId: 'prod-vestido-floral-m', quantity: 1 },
          { productId: 'prod-cinto-couro-preto', quantity: 1 }
        ],
        discount: 19.8,
        paymentMethod: 'credit_card',
        customerName: 'Cliente Balcão Camila'
      };

      const res = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-retail-cashier'
        },
        body: JSON.stringify(posPayload)
      });

      expect(res.status).toBe(201);
      const retailOrder = (await res.json()) as OrderTransaction;

      // Subtotal = 189.90 + 59.90 = 249.80
      expect(retailOrder.subtotal).toBe(249.8);
      expect(retailOrder.discount).toBe(19.8);
      // Total = 249.80 - 19.80 = 230.00
      expect(retailOrder.total).toBe(230.0);
      expect(retailOrder.channel).toBe('POS');
      expect(retailOrder.type).toBe('pos-counter');
      expect(retailOrder.deliveryFee).toBe(0);

      // Verificação de baixa de estoque precisa
      const updatedVestido = getCol('products').get('prod-vestido-floral-m') as unknown as ProductItem;
      expect(updatedVestido.stock).toBe(11);
      const updatedCinto = getCol('products').get('prod-cinto-couro-preto') as unknown as ProductItem;
      expect(updatedCinto.stock).toBe(24);
    });
  });

  // =========================================================================
  // CENÁRIO 3: FARMÁCIA, DROGARIA & SAÚDE (Lotes, Validade e Sanitização Segura)
  // =========================================================================
  it('Cenário 3: Farmácia - Venda com Verificação de Estoque e Bloqueio de Falha de Lote', async () => {
    await withServer(async (baseUrl) => {
      const pharmaTenant: Partial<CompanyTenant> = {
        id: 'tenant-pharma-saude',
        name: 'Drogaria & Farmácia Santa Clara',
        category: 'health',
        status: 'active',
        isOpen: true,
        supportsDelivery: true,
        supportsTakeout: true,
        deliveryFee: 7.5,
        minOrderValue: 20
      };
      getCol('tenants').set('tenant-pharma-saude', pharmaTenant as Record<string, unknown>);

      const amoxicilina = makeMockProduct({
        id: 'prod-amoxicilina-500',
        tenantId: 'tenant-pharma-saude',
        name: 'Amoxicilina 500mg 21 Cápsulas (Genérico)',
        barcode: '7891112223334',
        price: 34.5,
        costPrice: 12.0,
        supplierId: 'fornecedor-eurofarma-dist',
        stock: 3, // Estoque restrito de apenas 3 caixas
        category: 'Antibióticos'
      });
      getCol('products').set('prod-amoxicilina-500', amoxicilina as unknown as Record<string, unknown>);

      // Tentativa 1: Venda balcão de 5 caixas (quantidade superior ao estoque de 3)
      const invalidPharmaPayload = {
        tenantId: 'tenant-pharma-saude',
        type: 'pos-counter',
        channel: 'POS',
        items: [{ productId: 'prod-amoxicilina-500', quantity: 5 }]
      };

      const failRes = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-pharma-operator'
        },
        body: JSON.stringify(invalidPharmaPayload)
      });

      // Motor de comércio impede venda sem estoque (Código HTTP 409 STOCK_CONFLICT)
      expect(failRes.status).toBe(409);
      const errBody = await failRes.json();
      expect(errBody.code).toBe('STOCK_CONFLICT');

      // Tentativa 2: Venda balcão de 2 caixas dentro do saldo do lote
      const validPharmaPayload = {
        tenantId: 'tenant-pharma-saude',
        type: 'pos-counter',
        channel: 'POS',
        items: [{ productId: 'prod-amoxicilina-500', quantity: 2, notes: 'Lote L-2026-99 Val: 12/2027' }]
      };

      const successRes = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-pharma-operator'
        },
        body: JSON.stringify(validPharmaPayload)
      });

      expect(successRes.status).toBe(201);
      const pharmaOrder = (await successRes.json()) as OrderTransaction;
      expect(pharmaOrder.total).toBe(69.0); // 34.50 * 2

      // O produto no pedido não vaza dados de fornecedor e custo
      expect(pharmaOrder.items[0]!.product.supplierId).toBeUndefined();
      expect(pharmaOrder.items[0]!.product.costPrice).toBe(0);

      // Estoque restante deve ser exatamente 1 caixa
      const updatedAmox = getCol('products').get('prod-amoxicilina-500') as unknown as ProductItem;
      expect(updatedAmox.stock).toBe(1);
    });
  });

  // =========================================================================
  // CENÁRIO 4: SERVIÇOS & OFICINAS (Ordem de Serviço com Peças e Mão de Obra)
  // =========================================================================
  it('Cenário 4: Serviços & Automotivo - O.S. Combinando Peças de Reposição e Mão de Obra', async () => {
    await withServer(async (baseUrl) => {
      const autoTenant: Partial<CompanyTenant> = {
        id: 'tenant-auto-center',
        name: 'Auto Center Precision Serviços Automotivos',
        category: 'automotive',
        status: 'active',
        isOpen: true,
        supportsDelivery: false,
        supportsTakeout: true
      };
      getCol('tenants').set('tenant-auto-center', autoTenant as Record<string, unknown>);

      const pastilhaFreio = makeMockProduct({
        id: 'prod-pastilha-freio-diant',
        tenantId: 'tenant-auto-center',
        name: 'Jogo Pastilha Freio Dianteira Cerâmica',
        barcode: '7895554443332',
        price: 240.0,
        costPrice: 110.0,
        stock: 8,
        category: 'Peças Automotivas'
      });

      const maoDeObraFreio = makeMockProduct({
        id: 'prod-serv-troca-freios',
        tenantId: 'tenant-auto-center',
        name: 'Mão de Obra Troca Sistema de Freio e Sangria',
        price: 150.0,
        costPrice: 0,
        stock: 9999,
        category: 'Serviços'
      });

      getCol('products').set('prod-pastilha-freio-diant', pastilhaFreio as unknown as Record<string, unknown>);
      getCol('products').set('prod-serv-troca-freios', maoDeObraFreio as unknown as Record<string, unknown>);

      // Ordem de Serviço concluída e faturada pelo caixa da oficina
      const osOrderPayload = {
        tenantId: 'tenant-auto-center',
        type: 'pos-counter',
        channel: 'POS',
        items: [
          { productId: 'prod-pastilha-freio-diant', quantity: 1, notes: 'Veículo Placa ABC-1234 Mod: Civic 2022' },
          { productId: 'prod-serv-troca-freios', quantity: 1, notes: 'Mecânico Resp: Tiago' }
        ],
        customerName: 'Cliente Dr. Ricardo Alves',
        customerPhone: '11999998888'
      };

      const res = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-auto-mechanic'
        },
        body: JSON.stringify(osOrderPayload)
      });

      expect(res.status).toBe(201);
      const osOrder = (await res.json()) as OrderTransaction;

      // Subtotal e Total: 240 (Peça) + 150 (Serviço) = 390.00
      expect(osOrder.subtotal).toBe(390.0);
      expect(osOrder.total).toBe(390.0);

      // Baixa atômica de estoque da peça mecânica
      const updatedPeca = getCol('products').get('prod-pastilha-freio-diant') as unknown as ProductItem;
      expect(updatedPeca.stock).toBe(7);
    });
  });

  // =========================================================================
  // CENÁRIO 5: BLINDAGEM MULTI-TENANT & REGRAS COMERCIAIS RÍGIDAS
  // =========================================================================
  it('Cenário 5: Blindagem de Plataforma - Impede Invasão Cross-Tenant, Loja Inativa e Desconto Abusivo', async () => {
    await withServer(async (baseUrl) => {
      const tenantA: Partial<CompanyTenant> = {
        id: 'tenant-loja-a',
        name: 'Loja A Restaurante',
        category: 'restaurant',
        status: 'active',
        isOpen: true,
        supportsDelivery: true
      };
      const tenantB: Partial<CompanyTenant> = {
        id: 'tenant-loja-b',
        name: 'Loja B Livraria',
        category: 'retail',
        status: 'suspended',
        isOpen: false
      };
      getCol('tenants').set('tenant-loja-a', tenantA as Record<string, unknown>);
      getCol('tenants').set('tenant-loja-b', tenantB as Record<string, unknown>);

      const pratoA = makeMockProduct({
        id: 'prod-prato-a',
        tenantId: 'tenant-loja-a',
        name: 'Filé Mignon à Parmegiana',
        price: 50.0,
        stock: 20
      });
      const livroB = makeMockProduct({
        id: 'prod-livro-b',
        tenantId: 'tenant-loja-b',
        name: 'Livro Engenharia de Software Moderna',
        price: 90.0,
        stock: 10
      });
      getCol('products').set('prod-prato-a', pratoA as unknown as Record<string, unknown>);
      getCol('products').set('prod-livro-b', livroB as unknown as Record<string, unknown>);

      // Teste A: Hacker tenta injetar no carrinho da Loja A um produto que pertence à Loja B
      const crossTenantOrder = {
        tenantId: 'tenant-loja-a',
        type: 'delivery',
        channel: 'Online Marketplace',
        items: [{ productId: 'prod-livro-b', quantity: 1 }]
      };

      const resCross = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-consumer-public'
        },
        body: JSON.stringify(crossTenantOrder)
      });

      expect(resCross.status).toBe(400);
      const errCross = await resCross.json();
      expect(errCross.code).toBe('CROSS_TENANT_PRODUCT');

      // Teste B: Tentativa de compra em loja Suspensa pelo HQ
      const suspendedOrder = {
        tenantId: 'tenant-loja-b',
        type: 'delivery',
        channel: 'Online Marketplace',
        items: [{ productId: 'prod-livro-b', quantity: 1 }]
      };

      const resSuspended = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-consumer-public'
        },
        body: JSON.stringify(suspendedOrder)
      });

      expect(resSuspended.status).toBe(403);
      const errSuspended = await resSuspended.json();
      expect(errSuspended.code).toBe('TENANT_INACTIVE');

      // Teste C: Operador tenta lançar desconto superior ao valor dos produtos
      const abusiveDiscountOrder = {
        tenantId: 'tenant-loja-a',
        type: 'pos-counter',
        channel: 'POS',
        items: [{ productId: 'prod-prato-a', quantity: 1 }],
        discount: 100.0 // Subtotal é 50, desconto 100 deve ser barrado
      };

      const resDiscount = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-loja-a-op'
        },
        body: JSON.stringify(abusiveDiscountOrder)
      });

      expect(resDiscount.status).toBe(400);
      const errDiscount = await resDiscount.json();
      expect(errDiscount.code).toBe('INVALID_DISCOUNT');
    });
  });

  // =========================================================================
  // CENÁRIO 6: CONTINGÊNCIA OFFLINE OUTBOX & REPLAY SINCRONIZADO
  // =========================================================================
  it('Cenário 6: Contingência Offline - Fila Outbox do PDV Sincroniza sem Perdas ao Voltar Conexão', async () => {
    // Simulação do PDV operando em contingência offline (queda temporária de conexão)
    const pendingActions: QueuedAction[] = [
      {
        id: 'act-off-001',
        action: 'CREATE_ORDER',
        endpoint: '/api/orders',
        payload: {
          id: 'ord-offline-999',
          items: [{ productId: 'prod-pizza-margherita', quantity: 1 }],
          total: 68.0
        },
        idempotencyKey: 'idemp-off-001',
        timestamp: new Date(Date.now() - 60000).toISOString(),
        retries: 0
      },
      {
        id: 'act-off-002',
        action: 'UPDATE_STOCK',
        endpoint: '/api/products/prod-pizza-margherita',
        payload: {
          productId: 'prod-pizza-margherita',
          stockChange: -1,
          reason: 'Venda Offline Contingência'
        },
        idempotencyKey: 'idemp-off-002',
        timestamp: new Date(Date.now() - 30000).toISOString(),
        retries: 0
      }
    ];

    // Executa motor de replay outbox com mock transport
    const result = await executeOfflineOutboxReplay({
      queue: pendingActions,
      transport: async () => ({ success: true })
    });

    expect(result.summary.processed).toBe(2);
    expect(result.summary.failed).toBe(0);
    expect(result.summary.conflicts).toBe(0);
    expect(result.summary.deadLetterCount).toBe(0);
    expect(result.newConflicts).toHaveLength(0);
    expect(result.remainingQueue).toHaveLength(0);
  });
  // =========================================================================
  // CENÁRIO 7: SALÃO DE BELEZA & ESTÉTICA (Serviços, Profissionais e Comissões)
  // =========================================================================
  it('Cenário 7: Salão de Beleza - Deve calcular e registrar comissão de staff por serviço executado', async () => {
    await withServer(async (baseUrl) => {
      const salonTenant: Partial<CompanyTenant> = {
        id: 'tenant-salon-001',
        name: 'Studio de Beleza Master',
        category: 'beauty',
        status: 'active',
        isOpen: true
      };
      getCol('tenants').set('tenant-salon-001', salonTenant as Record<string, unknown>);

      const corteServico = makeMockProduct({
        id: 'svc-haircut-premium',
        tenantId: 'tenant-salon-001',
        name: 'Corte de Cabelo Masculino Premium',
        price: 80.0,
        stock: 9999, // Serviço é infinito no estoque físico mas finito no tempo
        commissionRate: 0.20 // 20% de comissão para o barbeiro
      });
      getCol('products').set('svc-haircut-premium', corteServico as unknown as Record<string, unknown>);

      // Venda de serviço vinculada ao profissional (assignedStaffId)
      const servicePayload = {
        tenantId: 'tenant-salon-001',
        type: 'pos-counter',
        channel: 'POS',
        items: [{ productId: 'svc-haircut-premium', quantity: 1 }],
        paymentMethod: 'cash',
        cashConfirmedByOperator: true,
        assignedStaffId: 'staff-barber-jose',
        operatorName: 'Caixa Central'
      };

      const res = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-salon-owner'
        },
        body: JSON.stringify(servicePayload)
      });

      expect(res.status).toBe(201);
      const order = (await res.json()) as OrderTransaction;

      expect(order.status).toBe('completed');
      expect(order.assignedStaffId).toBe('staff-barber-jose');

      // Verificar se o registro de comissão foi gerado (80 * 0.2 = 16.00)
      const commission = getCol('staff_commissions').get(`comm-${order.id}`) as unknown as Record<string, unknown>;
      expect(commission).toBeDefined();
      expect(commission['amount']).toBe(16.0);
      expect(commission['staffId']).toBe('staff-barber-jose');
    });
  });

  // =========================================================================
  // CENÁRIO 8: ACADEMIA & CROSSFIT (Assinaturas, Recorrência e Metadados)
  // =========================================================================
  it('Cenário 8: Academia - Deve registrar venda de plano recorrente com metadados de validade', async () => {
    await withServer(async (baseUrl) => {
      const gymTenant: Partial<CompanyTenant> = {
        id: 'tenant-gym-fit',
        name: 'Iron Gym CrossFit',
        category: 'services',
        status: 'active',
        isOpen: true
      };
      getCol('tenants').set('tenant-gym-fit', gymTenant as Record<string, unknown>);

      const planoMensal = makeMockProduct({
        id: 'plan-monthly-gold',
        tenantId: 'tenant-gym-fit',
        name: 'Plano Gold Mensal ilimitado',
        price: 250.0,
        stock: 99999
      });
      getCol('products').set('plan-monthly-gold', planoMensal as unknown as Record<string, unknown>);

      const subPayload = {
        tenantId: 'tenant-gym-fit',
        type: 'pos-counter',
        channel: 'POS',
        items: [{ productId: 'plan-monthly-gold', quantity: 1 }],
        paymentMethod: 'online',
        customerName: 'Marcus Aurelius',
        metadata: {
          subscriptionType: 'recurring_monthly',
          startDate: '2026-11-01',
          endDate: '2026-12-01',
          autoRenew: true,
          accessKeyId: 'RFID-998877'
        }
      };

      const res = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-gym-admin'
        },
        body: JSON.stringify(subPayload)
      });

      expect(res.status).toBe(201);
      const order = (await res.json()) as OrderTransaction;
      expect(order.metadata?.['accessKeyId']).toBe('RFID-998877');
      expect(order.metadata?.['subscriptionType']).toBe('recurring_monthly');
    });
  });

  // =========================================================================
  // CENÁRIO 9: HOTELARIA & RESORTS (Consumo em Quarto / Folio Management)
  // =========================================================================
  it('Cenário 9: Hotelaria - Deve permitir lançamento em Folio de Quarto sem liquidação imediata', async () => {
    await withServer(async (baseUrl) => {
      const hotelTenant: Partial<CompanyTenant> = {
        id: 'tenant-hotel-paradise',
        name: 'Paradise Resort & Spa',
        category: 'services',
        status: 'active',
        isOpen: true
      };
      getCol('tenants').set('tenant-hotel-paradise', hotelTenant as Record<string, unknown>);

      const drinque = makeMockProduct({
        id: 'prod-drink-mojito',
        tenantId: 'tenant-hotel-paradise',
        name: 'Mojito Tropical',
        price: 45.0,
        stock: 50
      });
      getCol('products').set('prod-drink-mojito', drinque as unknown as Record<string, unknown>);

      const folioPayload = {
        tenantId: 'tenant-hotel-paradise',
        type: 'pos-counter',
        channel: 'POS',
        items: [{ productId: 'prod-drink-mojito', quantity: 2 }],
        paymentMethod: 'room_folio',
        metadata: {
          roomNumber: '102',
          guestFolioId: 'FOL-2026-XYZ',
          waiterId: 'waiter-01'
        }
      };

      const res = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-hotel-waiter'
        },
        body: JSON.stringify(folioPayload)
      });

      expect(res.status).toBe(201);
      const order = (await res.json()) as OrderTransaction;

      // Status deve ser PENDING pois folio não é pagamento imediato
      expect(order.status).toBe('pending');
      expect(order.paymentMethod).toBe('room_folio');
      expect(order.metadata?.['roomNumber']).toBe('102');
      
      // Verificação de que NÃO gerou entrada no financeiro ainda (deferido para o checkout do hotel)
      const finSnap = getCol('financials').get(`fin-sale-${order.id}`);
      expect(finSnap).toBeUndefined();
    });
  });

  // =========================================================================
  // CENÁRIO 10: GASTRONOMIA COM BOM (Bill of Materials / Receita)
  // =========================================================================
  it('Cenário 10: Restaurante BOM - Deve abater estoque de ingredientes individuais ao vender prato montado', async () => {
    await withServer(async (baseUrl) => {
      const burgerTenant: Partial<CompanyTenant> = {
        id: 'tenant-burger-exp',
        name: 'Burger Experience',
        category: 'restaurant',
        status: 'active',
        isOpen: true
      };
      getCol('tenants').set('tenant-burger-exp', burgerTenant as Record<string, unknown>);

      // Setup de Insumos (Ingredientes)
      const carneId = 'ing-meat-180g';
      const paoId = 'ing-bun-brioche';
      const queijoId = 'ing-cheese-cheddar';

      getCol('products').set(carneId, makeMockProduct({ id: carneId, tenantId: 'tenant-burger-exp', name: 'Carne 180g', stock: 100, price: 0 }) as unknown as Record<string, unknown>);
      getCol('products').set(paoId, makeMockProduct({ id: paoId, tenantId: 'tenant-burger-exp', name: 'Pão Brioche', stock: 50, price: 0 }) as unknown as Record<string, unknown>);
      getCol('products').set(queijoId, makeMockProduct({ id: queijoId, tenantId: 'tenant-burger-exp', name: 'Queijo Cheddar (Fatia)', stock: 200, price: 0 }) as unknown as Record<string, unknown>);

      // Setup de Produto Final com Receita (BOM)
      const burgerId = 'prod-cheeseburger-deluxe';
      const cheeseburger = makeMockProduct({
        id: burgerId,
        tenantId: 'tenant-burger-exp',
        name: 'Cheeseburger Deluxe',
        price: 42.0,
        stock: 9999, // Disponibilidade baseada em insumos
        recipe: [
          { productId: carneId, qty: 1 },
          { productId: paoId, qty: 1 },
          { productId: queijoId, qty: 2 }
        ]
      });
      getCol('products').set(burgerId, cheeseburger as unknown as Record<string, unknown>);

      const salePayload = {
        tenantId: 'tenant-burger-exp',
        type: 'pos-counter',
        channel: 'POS',
        items: [{ productId: burgerId, quantity: 2 }], // Vendendo 2 burgers
        paymentMethod: 'cash',
        cashConfirmedByOperator: true
      };

      const res = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-burger-op'
        },
        body: JSON.stringify(salePayload)
      });

      expect(res.status).toBe(201);
      
      // Verificação de baixa de estoque dos insumos
      const updatedCarne = getCol('products').get(carneId) as unknown as ProductItem;
      const updatedPao = getCol('products').get(paoId) as unknown as ProductItem;
      const updatedQueijo = getCol('products').get(queijoId) as unknown as ProductItem;

      expect(updatedCarne.stock).toBe(98); // 100 - 2
      expect(updatedPao.stock).toBe(48);   // 50 - 2
      expect(updatedQueijo.stock).toBe(196); // 200 - (2 * 2)
    });
  });

  // =========================================================================
  // CENÁRIO 11: AUTO-PEÇAS (Core Charges e Depósitos Reembolsáveis)
  // =========================================================================
  it('Cenário 11: Auto-Peças - Deve tratar cobrança de Casco (Core Charge) como item separado', async () => {
    await withServer(async (baseUrl) => {
      const autoPartsTenant: Partial<CompanyTenant> = {
        id: 'tenant-parts-master',
        name: 'Global Auto Parts',
        category: 'retail',
        status: 'active',
        isOpen: true
      };
      getCol('tenants').set('tenant-parts-master', autoPartsTenant as Record<string, unknown>);

      const bateriaId = 'prod-battery-60ah';
      const cascoId = 'prod-core-charge-battery';

      const bateria = makeMockProduct({ id: bateriaId, tenantId: 'tenant-parts-master', name: 'Bateria 60Ah Heliar', price: 450.0, stock: 10 });
      const casco = makeMockProduct({ id: cascoId, tenantId: 'tenant-parts-master', name: 'Depósito de Casco (Core Charge)', price: 50.0, stock: 999 });

      getCol('products').set(bateriaId, bateria as unknown as Record<string, unknown>);
      getCol('products').set(cascoId, casco as unknown as Record<string, unknown>);

      const partsPayload = {
        tenantId: 'tenant-parts-master',
        type: 'pos-counter',
        channel: 'POS',
        items: [
          { productId: bateriaId, quantity: 1 },
          { productId: cascoId, quantity: 1, notes: 'Reembolsável na entrega da bateria velha' }
        ],
        paymentMethod: 'card',
        cashConfirmedByOperator: true
      };

      const res = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-parts-op'
        },
        body: JSON.stringify(partsPayload)
      });

      expect(res.status).toBe(201);
      const order = (await res.json()) as OrderTransaction;
      expect(order.total).toBe(500.0); // 450 + 50
    });
  });
});
