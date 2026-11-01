import { ChangeDetectionStrategy, Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { EcosystemService } from '../services/ecosystem.service';
import { InventoryService } from '../services/inventory.service';
import { FinancialsService } from '../services/financials.service';
import { CrmService } from '../services/crm.service';
import { SecurityService } from '../services/security.service';
import { OfflineSyncService } from '../core/offline/offline-sync.service';
import { PaymentEngine, PaymentTransactionResult } from '../core/engines/payment.engine';
import { ProductItem, CartItem, OrderTransaction, CustomerProfile } from '../models/ecosystem.model';

import { PosScannerComponent, PosSectorMode } from './eapps/pos/pos-scanner';
import { PosGridComponent } from './eapps/pos/pos-grid';
import { PosCartComponent } from './eapps/pos/pos-cart';
import { PosCashOpModal } from './eapps/pos/pos-cash-op-modal';
import { PosScaleModal } from './eapps/pos/pos-scale-modal';
import { PosDiscountModal } from './eapps/pos/pos-discount-modal';
import { PosRecallModal } from './eapps/pos/pos-recall-modal';
import { PosReceiptModal } from './eapps/pos/pos-receipt-modal';

interface HeldSale {
  id: string;
  saleNumber: number;
  tableOrClient: string;
  items: CartItem[];
  total: number;
  time: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-pos-terminal',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    PosScannerComponent,
    PosGridComponent,
    PosCartComponent,
    PosCashOpModal,
    PosScaleModal,
    PosDiscountModal,
    PosRecallModal,
    PosReceiptModal
  ],
  template: `
    <div class="h-screen w-screen bg-[#0a0705] text-stone-200 flex flex-col font-mono select-none overflow-hidden">
      
      <!-- TOP TERMINAL HARDWARE HEADER (DIRETRIZ DE DISPOSITIVO & OPERAÇÃO) -->
      <header class="h-14 bg-[#140b06] border-b border-[#381c0c] px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 shadow-lg z-20">
        
        <!-- ESTABELECIMENTO ATIVO (TENANT) -->
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-stone-950 font-black flex items-center justify-center shadow">
            <mat-icon class="text-xl">point_of_sale</mat-icon>
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h1 class="text-xs sm:text-sm font-serif font-black tracking-tight text-white uppercase truncate">
                {{ activeTenant().name }}
              </h1>
              <span class="text-[9px] px-1.5 py-0.2 bg-amber-950 text-amber-300 border border-amber-700/60 rounded uppercase font-bold shrink-0">
                PDV Frente de Caixa
              </span>
            </div>
            <p class="text-[10px] text-stone-400 font-mono truncate">
              CNPJ: {{ activeTenant().cnpj || '00.000.000/0001-00' }} • Canal: <strong class="text-amber-400">POS Balcão</strong>
            </p>
          </div>
        </div>

        <!-- DISPOSITIVO & OPERADOR ATIVO -->
        <div class="hidden md:flex items-center gap-4 text-xs font-mono">
          <div class="flex items-center gap-2 bg-[#1f0f08] border border-[#482814] px-3 py-1 rounded-xl">
            <mat-icon class="text-sm text-amber-500">devices</mat-icon>
            <div class="text-[10px] leading-tight">
              <span class="text-stone-400 block">Terminal Ativo:</span>
              <strong class="text-white">{{ activeDeviceName() }}</strong>
            </div>
          </div>

          <div class="flex items-center gap-2 bg-[#1f0f08] border border-[#482814] px-3 py-1 rounded-xl">
            <mat-icon class="text-sm text-emerald-400">person</mat-icon>
            <div class="text-[10px] leading-tight">
              <span class="text-stone-400 block">Operador:</span>
              <strong class="text-white">{{ operatorName() }}</strong>
            </div>
          </div>
        </div>

        <!-- CONTINGÊNCIA OFFLINE & CONTROLES DE SAÍDA -->
        <div class="flex items-center gap-2.5 shrink-0">
          <!-- Offline badge -->
          @if (offlineSync.isOnline()) {
            <div class="flex items-center gap-1.5 bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 px-2.5 py-1 rounded-xl text-[10px] font-bold">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>ONLINE</span>
            </div>
          } @else {
            <div class="flex items-center gap-1.5 bg-amber-950/80 text-amber-300 border border-amber-700/60 px-2.5 py-1 rounded-xl text-[10px] font-bold">
              <mat-icon class="text-xs text-amber-400">wifi_off</mat-icon>
              <span>OFFLINE (Fila: {{ offlineSync.pendingSyncCount() }})</span>
            </div>
          }

          <!-- Botão para alternar para a Área de Trabalho do Store OS (se tiver privilégio) -->
          @if (canAccessDesktopOs()) {
            <button
              type="button"
              (click)="navigateToStoreOsDesktop()"
              class="bg-[#241107] hover:bg-[#33180a] text-amber-300 border border-[#482814] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow"
              title="Acessar Área de Trabalho do Store OS">
              <mat-icon class="text-sm">desktop_windows</mat-icon>
              <span class="hidden sm:inline">Store OS Desktop</span>
            </button>
          }

          <button
            type="button"
            (click)="logout()"
            class="bg-[#1b0a04] hover:bg-[#2b1007] text-stone-400 hover:text-rose-400 border border-[#381c0c] p-1.5 rounded-xl transition-all cursor-pointer"
            title="Encerrar Sessão do Terminal">
            <mat-icon class="text-base">logout</mat-icon>
          </button>
        </div>

      </header>

      <!-- ALERTA DE CONFLITOS OFFLINE/ONLINE -->
      @if (offlineSync.unresolvedConflictsCount() > 0) {
        <div class="bg-rose-950/95 border-b-2 border-rose-500 p-2.5 px-6 shadow-md flex items-center justify-between gap-3 text-xs shrink-0">
          <div class="flex items-center gap-2 text-rose-200 font-bold truncate">
            <mat-icon class="text-rose-400 text-sm">warning</mat-icon>
            <span class="truncate">
              Atenção: {{ offlineSync.unresolvedConflictsCount() }} venda(s) offline tiveram conflito de estoque ao sincronizar com o motor comercial.
            </span>
          </div>
          <button
            type="button"
            (click)="clearFirstConflict()"
            class="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1 rounded-lg font-bold text-[10px] uppercase cursor-pointer shrink-0">
            Confirmar Ciência
          </button>
        </div>
      }

      <!-- CORPO PRINCIPAL DO TERMINAL PDV -->
      <main class="flex-1 p-3 sm:p-4 min-h-0 overflow-hidden">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 h-full min-h-0 overflow-hidden">
          
          <!-- COLUNA ESQUERDA: LEITOR DE CÓDIGO, CATÁLOGO TOUCH E ATALHOS (8 Colunas) -->
          <div class="lg:col-span-8 flex flex-col gap-3 h-full min-h-0 overflow-hidden">
            <app-pos-scanner
              [(posSector)]="posSector"
              [(isWholesale)]="isWholesale"
              [(fastScanMode)]="fastScanMode"
              [(tableOrComanda)]="tableOrComanda"
              [(technicianName)]="technicianName"
              [(serialOrBatch)]="serialOrBatch"
              [(prescriptionRef)]="prescriptionRef"
              [(searchQuery)]="searchQuery"
              [heldSalesCount]="heldSales().length"
              (openScale)="showScaleModal.set(true)"
              (openRecall)="showRecallModal.set(true)"
              (openSangria)="showSangriaModal.set(true)"
              (bip)="handleBarcodeBipInput()"
            />

            <app-pos-grid
              [products]="filteredProducts()"
              [categories]="categories"
              [(selectedCategory)]="selectedCategory"
              (addToCart)="addToCart($event)"
            />
          </div>

          <!-- COLUNA DIREITA: CUPOM FISCAL / CARRINHO / CHECKOUT (4 Colunas) -->
          <div class="lg:col-span-4 h-full min-h-0 overflow-hidden">
            <app-pos-cart
              [currentSaleNumber]="currentSaleNumber"
              [cart]="cart()"
              [selectedCustomer]="selectedCustomer()"
              [customerSearchResults]="customerSearchResults()"
              [(customerCpf)]="customerCpf"
              [splitGuestsCount]="splitGuestsCount()"
              [cartSubtotal]="cartSubtotal()"
              [cartDiscount]="cartDiscount()"
              [cartPromotionsDiscount]="cartPromotionsDiscount()"
              [cartTax]="cartTax()"
              [cartTotal]="cartTotal()"
              (holdSale)="holdSale()"
              (clearCart)="clearCart()"
              (removeCustomer)="selectedCustomer.set(null)"
              (customerSearch)="customerSearch($event)"
              (selectCustomer)="selectedCustomer.set($event); customerSearchResults.set([])"
              (incrementQty)="incrementQty($event)"
              (decrementQty)="decrementQty($event)"
              (updateItemNotes)="updateItemNotes($event.item, $event.notes)"
              (openDiscount)="applyDiscountModal.set(true)"
              (checkout)="checkout($event)"
            />
          </div>

        </div>
      </main>

      <!-- MODAIS DO TERMINAL -->
      @if (showScaleModal()) {
        <app-pos-scale-modal
          [products]="inventoryService.products()"
          (closeRequest)="showScaleModal.set(false)"
          (save)="onConfirmScaleWeighing($event)"
        />
      }

      @if (applyDiscountModal()) {
        <app-pos-discount-modal
          (closeRequest)="applyDiscountModal.set(false)"
          (applyDiscount)="onApplyDiscount($event)"
        />
      }

      @if (showRecallModal()) {
        <app-pos-recall-modal
          [heldSales]="heldSales()"
          (closeRequest)="showRecallModal.set(false)"
          (recall)="recallSale($event)"
        />
      }

      @if (showSangriaModal()) {
        <app-pos-cash-op-modal
          (closeRequest)="showSangriaModal.set(false)"
          (execute)="onExecuteCashOperation($event)"
        />
      }

      @if (showNfceCouponModal(); as order) {
        <app-pos-receipt-modal
          [order]="order"
          [customerCpf]="customerCpf()"
          (closeRequest)="showNfceCouponModal.set(null)"
        />
      }

      @if (pendingPixModal(); as pixData) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div class="bg-[#180b04] border-2 border-emerald-500/80 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div class="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <mat-icon class="text-3xl">qr_code_2</mat-icon>
            </div>
            <div>
              <h3 class="font-serif font-black text-white text-base">Pagamento PIX Dinâmico</h3>
              <p class="text-xs text-stone-400 mt-1">Apresente o QR Code ao cliente no caixa.</p>
            </div>

            <div class="bg-white p-3 rounded-2xl mx-auto w-48 h-48 flex items-center justify-center shadow-inner">
              @if (pixData.payment.qrCodePix) {
                <img [src]="pixData.payment.qrCodePix" alt="QR Code PIX" class="w-full h-full object-contain" />
              } @else {
                <div class="font-mono text-stone-900 text-xs font-bold">QR PIX BALCÃO</div>
              }
            </div>

            <div class="font-mono text-sm text-emerald-400 font-black">
              Total: R$ {{ pixData.order.total.toFixed(2) }}
            </div>

            <div class="flex gap-2">
              <button
                type="button"
                (click)="pendingPixModal.set(null)"
                class="flex-1 py-2.5 rounded-xl border border-stone-700 text-stone-300 font-bold text-xs uppercase cursor-pointer hover:bg-stone-800">
                Cancelar
              </button>
              <button
                type="button"
                [disabled]="confirmingPix()"
                (click)="confirmPendingPix()"
                class="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-black text-xs uppercase cursor-pointer transition-all disabled:opacity-50">
                {{ confirmingPix() ? 'Confirmando...' : 'Confirmar Baixa' }}
              </button>
            </div>
          </div>
        </div>
      }

    </div>
  `
})
export class PosTerminalComponent {
  readonly ecosystem = inject(EcosystemService);
  readonly inventoryService = inject(InventoryService);
  readonly financialsService = inject(FinancialsService);
  readonly crmService = inject(CrmService);
  readonly security = inject(SecurityService);
  readonly offlineSync = inject(OfflineSyncService);
  private readonly paymentEngine = inject(PaymentEngine);
  private readonly router = inject(Router);

  readonly currentSaleNumber = Math.floor(Math.random() * 900 + 100);
  readonly activeDeviceId = signal<string>('term-pos-01');
  readonly activeDeviceName = signal<string>('Caixa 01 - Balcão Principal');
  readonly operatorName = computed(() => this.security.currentSession()?.name || 'Operador Caixa');
  readonly activeTenant = computed(() => this.ecosystem.currentTenant());

  // POS State
  readonly cart = signal<CartItem[]>([]);
  readonly selectedCategory = signal<string>('Todos');
  readonly searchQuery = signal<string>('');
  readonly heldSales = signal<HeldSale[]>([]);
  readonly selectedCustomer = signal<CustomerProfile | null>(null);
  readonly customerSearchResults = signal<CustomerProfile[]>([]);
  readonly customerCpf = signal<string>('');
  readonly splitGuestsCount = signal<number>(1);
  readonly cartDiscount = signal<number>(0);

  // Sector modes
  readonly posSector = signal<PosSectorMode>('restaurant');
  readonly isWholesale = signal<boolean>(false);
  readonly fastScanMode = signal<boolean>(true);
  readonly tableOrComanda = signal<string>('');
  readonly technicianName = signal<string>('');
  readonly serialOrBatch = signal<string>('');
  readonly prescriptionRef = signal<string>('');

  // Modals
  readonly showScaleModal = signal<boolean>(false);
  readonly applyDiscountModal = signal<boolean>(false);
  readonly showRecallModal = signal<boolean>(false);
  readonly showSangriaModal = signal<boolean>(false);
  readonly showNfceCouponModal = signal<OrderTransaction | null>(null);
  readonly pendingPixModal = signal<{ order: OrderTransaction; payment: PaymentTransactionResult } | null>(null);
  readonly confirmingPix = signal<boolean>(false);

  readonly categories = [
    'Todos',
    'Hambúrgueres',
    'Bebidas',
    'Acompanhamentos',
    'Sobremesas',
    'Combos',
    'Cafeteria',
    'Pizzas',
    'Varejo Tech',
    'Medicamentos',
    'Serviços'
  ];

  readonly canAccessDesktopOs = computed(() => {
    const role = this.security.currentSession()?.role;
    return role === 'tenant_owner' || role === 'operator' || role === 'hq_admin';
  });

  readonly filteredProducts = computed(() => {
    const cat = this.selectedCategory();
    const query = this.searchQuery().toLowerCase().trim();
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    const prods = this.inventoryService.products().filter(p => p.tenantId === tenantId);

    return prods.filter((p) => {
      const matchCat = cat === 'Todos' || p.category === cat;
      const matchQuery =
        !query ||
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.barcode.includes(query);
      return matchCat && matchQuery;
    });
  });

  readonly cartSubtotal = computed(() =>
    this.cart().reduce((sum, item) => {
      const price =
        this.isWholesale() && item.product.wholesalePrice
          ? item.product.wholesalePrice
          : item.product.price;
      return sum + price * item.quantity;
    }, 0)
  );

  readonly cartPromotionsDiscount = computed(() => {
    const items = this.cart();
    const activeTenant = this.ecosystem.resolveOperationalTenantId();
    const promos = this.inventoryService
      .promotions()
      .filter((p) => p.isActive && p.tenantId === activeTenant);
    let totalPromo = 0;

    for (const promo of promos) {
      const triggerIds = promo.triggerProductIds || [];
      if (promo.type === 'bundle' && triggerIds.length > 0) {
        const hasAll = triggerIds.every((pid) => items.some((i) => i.product.id === pid));
        if (hasAll) {
          const bundleItems = items.filter((i) => triggerIds.includes(i.product.id));
          const bundleSubtotal = bundleItems.reduce((s, i) => s + i.product.price * i.quantity, 0);
          totalPromo += bundleSubtotal * ((promo.discountValue || 0) / 100);
        }
      }
    }
    return totalPromo;
  });

  readonly cartTax = computed(() =>
    Math.max(0, this.cartSubtotal() - this.cartDiscount() - this.cartPromotionsDiscount()) * 0.1
  );

  readonly cartTotal = computed(() =>
    Math.max(
      0,
      this.cartSubtotal() -
        this.cartDiscount() -
        this.cartPromotionsDiscount() +
        this.cartTax()
    )
  );

  constructor() {
    effect(() => {
      const tid = this.ecosystem.resolveOperationalTenantId();
      if (tid) {
        this.inventoryService.fetchProducts(tid).catch(() => []);
      }
    });
  }

  handleBarcodeBipInput() {
    const query = this.searchQuery().trim();
    if (!query) return;

    let mult = 1;
    let targetCode = query;
    if (query.includes('*')) {
      const parts = query.split('*');
      mult = parseInt(parts[0], 10) || 1;
      targetCode = parts[1].trim();
    }

    const matchedProduct = this.inventoryService
      .products()
      .find(
        (p: ProductItem) =>
          p.barcode === targetCode ||
          p.sku.toLowerCase() === targetCode.toLowerCase() ||
          p.name.toLowerCase().includes(targetCode.toLowerCase())
      );

    if (matchedProduct) {
      this.addToCart(matchedProduct, mult);
      if (this.fastScanMode()) {
        this.searchQuery.set('');
      }
      this.ecosystem.notify(
        `[BIP EAN-13] ${mult}x ${matchedProduct.name} adicionado ao cupom.`,
        'info'
      );
    } else {
      this.ecosystem.notify(
        `Código de barras "${targetCode}" não localizado!`,
        'warning'
      );
    }
  }

  addToCart(product: ProductItem, qty = 1) {
    this.cart.update((c) => {
      const existing = c.find((i: CartItem) => i.product.id === product.id);
      if (existing) {
        return c.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + qty } : i
        );
      }
      return [...c, { product, quantity: qty }];
    });
  }

  incrementQty(item: CartItem) {
    this.cart.update((c) =>
      c.map((i) => (i.product.id === item.product.id ? { ...i, quantity: i.quantity + 1 } : i))
    );
  }

  decrementQty(item: CartItem) {
    this.cart.update((c) =>
      c
        .map((i) => (i.product.id === item.product.id ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    );
  }

  updateItemNotes(item: CartItem, notes: string) {
    this.cart.update((c) =>
      c.map((i) => (i.product.id === item.product.id ? { ...i, notes } : i))
    );
  }

  clearCart() {
    this.cart.set([]);
    this.cartDiscount.set(0);
  }

  holdSale() {
    if (this.cart().length === 0) return;
    const newHeld: HeldSale = {
      id: 'hold-' + Date.now(),
      saleNumber: this.currentSaleNumber,
      tableOrClient: this.tableOrComanda() || 'Balcão',
      items: [...this.cart()],
      total: this.cartTotal(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    this.heldSales.update((h) => [newHeld, ...h]);
    this.ecosystem.notify(`Venda #${this.currentSaleNumber} em espera (Hold).`, 'info');
    this.clearCart();
  }

  recallSale(held: HeldSale) {
    this.cart.set([...held.items]);
    this.heldSales.update((h) => h.filter((item) => item.id !== held.id));
    this.showRecallModal.set(false);
    this.ecosystem.notify(`Venda #${held.saleNumber} recuperada.`, 'success');
  }

  onConfirmScaleWeighing(event: { productId: string; weight: number }) {
    const prod = this.inventoryService.products().find((p) => p.id === event.productId);
    if (!prod) return;
    const price = Math.round(prod.price * event.weight * 100) / 100;
    const weightedProd: ProductItem = {
      ...prod,
      name: `${prod.name} (${event.weight.toFixed(3)}kg)`,
      price
    };
    this.addToCart(weightedProd, 1);
    this.showScaleModal.set(false);
    this.ecosystem.notify(
      `Balança: ${event.weight.toFixed(3)}kg x R$ ${prod.price.toFixed(2)} = R$ ${price.toFixed(2)}`,
      'success'
    );
  }

  onApplyDiscount(percent: number) {
    this.cartDiscount.set(this.cartSubtotal() * percent);
    this.applyDiscountModal.set(false);
  }

  customerSearch(val: string) {
    if (!val || val.length < 2) {
      this.customerSearchResults.set([]);
      return;
    }
    const query = val.toLowerCase();
    const results = this.crmService
      .customers()
      .filter((c) => c.name.toLowerCase().includes(query) || (c.cpf || '').includes(query));
    this.customerSearchResults.set(results);
  }

  onExecuteCashOperation(event: { type: 'sangria' | 'suprimento' | 'close'; amount: number; reason: string }) {
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    if (event.type === 'sangria') {
      this.financialsService.addRecord({
        date: new Date().toISOString(),
        type: 'expense',
        category: 'Sangria de Caixa',
        description: `Sangria Gaveta: ${event.reason}`,
        amount: event.amount,
        paymentMethod: 'Dinheiro',
        tenantId,
        channel: 'POS',
        deviceId: this.activeDeviceId(),
        status: 'cleared',
        referenceId: 'sangria-' + Date.now()
      });
      this.ecosystem.notify(`Sangria de R$ ${event.amount.toFixed(2)} registrada no caixa.`, 'warning');
    } else if (event.type === 'suprimento') {
      this.financialsService.addRecord({
        date: new Date().toISOString(),
        type: 'income',
        category: 'Suprimento / Aporte',
        description: `Suprimento Fundo de Troco: ${event.reason}`,
        amount: event.amount,
        paymentMethod: 'Dinheiro',
        tenantId,
        channel: 'POS',
        deviceId: this.activeDeviceId(),
        status: 'cleared',
        referenceId: 'suprimento-' + Date.now()
      });
      this.ecosystem.notify(`Suprimento de R$ ${event.amount.toFixed(2)} inserido no caixa.`, 'success');
    } else {
      this.ecosystem.notify('Fechamento de turno concluído! Relatório Z gerado.', 'info');
    }
    this.showSangriaModal.set(false);
  }

  async checkout(method: 'cash' | 'card' | 'pix') {
    if (this.cart().length === 0) return;
    const subtotal = this.cartSubtotal();
    const tax = this.cartTax();
    const discount = this.cartDiscount() + this.cartPromotionsDiscount();
    const total = this.cartTotal();
    const tenantId = this.ecosystem.resolveOperationalTenantId();

    try {
      if (method === 'cash') {
        const cashOrder = await this.ecosystem.addOrder({
          tenantId,
          orderNumber: '#' + this.currentSaleNumber,
          type: 'pos-counter',
          tableNumber: this.tableOrComanda() || undefined,
          items: [...this.cart()],
          subtotal,
          tax,
          discount,
          total,
          paymentMethod: 'cash',
          cashConfirmedByOperator: true,
          status: 'completed',
          channel: 'POS',
          deviceId: this.activeDeviceId(),
          deviceName: this.activeDeviceName(),
          deviceType: 'terminal',
          operatorName: this.operatorName()
        });

        this.ecosystem.notify(
          `Venda R$ ${cashOrder.total.toFixed(2)} liquidada em Dinheiro no terminal!`,
          'success'
        );
        this.showNfceCouponModal.set(cashOrder);
        this.clearCart();
        return;
      }

      if (method === 'pix') {
        const pendingOrder = await this.ecosystem.addOrder({
          tenantId,
          orderNumber: '#' + this.currentSaleNumber,
          type: 'pos-counter',
          tableNumber: this.tableOrComanda() || undefined,
          items: [...this.cart()],
          subtotal,
          tax,
          discount,
          total,
          paymentMethod: 'pix',
          status: 'pending',
          channel: 'POS',
          deviceId: this.activeDeviceId(),
          deviceName: this.activeDeviceName(),
          deviceType: 'terminal',
          operatorName: this.operatorName()
        });

        const pixPayment = await this.paymentEngine.processPayment({
          orderId: pendingOrder.id,
          amount: pendingOrder.total,
          method: 'pix',
          tenantId
        });

        this.pendingPixModal.set({ order: pendingOrder, payment: pixPayment });
        this.clearCart();
        return;
      }

      // Card payment: create order in pending status first, then process payment against real order
      const cardOrder = await this.ecosystem.addOrder({
        tenantId,
        orderNumber: '#' + this.currentSaleNumber,
        type: 'pos-counter',
        tableNumber: this.tableOrComanda() || undefined,
        items: [...this.cart()],
        subtotal,
        tax,
        discount,
        total,
        paymentMethod: 'card',
        paymentStatus: 'pending',
        status: 'pending',
        channel: 'POS',
        deviceId: this.activeDeviceId(),
        deviceName: this.activeDeviceName(),
        deviceType: 'terminal',
        operatorName: this.operatorName()
      });

      const paymentResult = await this.paymentEngine.processPayment({
        orderId: cardOrder.id,
        amount: total,
        method: 'credit_card',
        tenantId
      });

      if (paymentResult.status !== 'approved') {
        this.ecosystem.notify('Pagamento com cartão não aprovado pela adquirente.', 'error');
        return;
      }

      this.ecosystem.notify(
        `Venda R$ ${cardOrder.total.toFixed(2)} liquidada via Cartão (AUT: ${paymentResult.authorizationCode})!`,
        'success'
      );
      this.showNfceCouponModal.set(cardOrder);
      this.clearCart();
    } catch (err: unknown) {
      const msg =
        (err as { error?: { error?: string } })?.error?.error ||
        'Estoque insuficiente ou falha ao processar venda no PDV.';
      this.ecosystem.notify(msg, 'error');
    }
  }

  async confirmPendingPix() {
    const activePix = this.pendingPixModal();
    if (!activePix) return;
    this.confirmingPix.set(true);
    try {
      const confirmed = await this.paymentEngine.confirmPixPayment(activePix.payment.transactionId);
      const settledOrder = confirmed.order || {
        ...activePix.order,
        status: 'completed' as const,
        paymentStatus: 'approved' as const
      };
      const tenantId = this.ecosystem.resolveOperationalTenantId(settledOrder.tenantId);
      if (tenantId) {
        await this.ecosystem.ordersService.fetchOrders(tenantId).catch(() => []);
        await this.financialsService.fetchRecords(tenantId).catch(() => []);
      }
      this.pendingPixModal.set(null);
      this.showNfceCouponModal.set(settledOrder);
      this.ecosystem.notify(`PIX confirmado! Venda ${settledOrder.orderNumber} liquidada no caixa.`, 'success');
    } catch {
      this.ecosystem.notify('Falha ao confirmar liquidação PIX.', 'error');
    } finally {
      this.confirmingPix.set(false);
    }
  }

  clearFirstConflict() {
    const first = this.offlineSync.unresolvedConflicts()[0];
    if (first) {
      this.offlineSync.acknowledgeConflict(first.id);
    }
  }

  navigateToStoreOsDesktop() {
    this.ecosystem.currentView.set('os');
    this.router.navigate(['/os']);
  }

  async logout() {
    await this.security.logout();
    this.router.navigate(['/os/login']);
  }
}
