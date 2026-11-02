import { ChangeDetectionStrategy, Component, inject, signal, computed, effect, untracked } from '@angular/core';
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
import {
  ProductItem,
  CartItem,
  OrderTransaction,
  CustomerProfile,
  ExternalPaymentTerminal,
  ExternalTerminalMethod
} from '../models/ecosystem.model';
import { OsPreferencesService } from '../services/os-preferences.service';

import { PosScannerComponent } from './eapps/pos/pos-scanner';
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

interface ExternalTerminalDraft {
  method: ExternalTerminalMethod;
  idempotencyKey: string;
  tenantId: string;
  terminals: ExternalPaymentTerminal[];
  selectedTerminalId: string;
  orderNumber: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  tableNumber?: string;
  submissionStarted: boolean;
  submittedReference?: string;
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
              CNPJ: {{ activeTenant().cnpj || 'Não informado' }} • Canal: <strong class="text-amber-400">POS Balcão</strong>
            </p>
          </div>
        </div>

        <!-- DISPOSITIVO & OPERADOR ATIVO -->
        <div class="hidden md:flex items-center gap-4 text-xs font-mono">
          <div class="flex items-center gap-2 bg-[#1f0f08] border border-[#482814] px-3 py-1 rounded-xl">
            <mat-icon class="text-sm text-amber-500">devices</mat-icon>
            <div class="text-[10px] leading-tight">
              <span class="text-stone-400 block">Identificação lógica:</span>
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
              <span>NAVEGADOR ONLINE</span>
            </div>
          } @else {
            <div class="flex items-center gap-1.5 bg-amber-950/80 text-amber-300 border border-amber-700/60 px-2.5 py-1 rounded-xl text-[10px] font-bold">
              <mat-icon class="text-xs text-amber-400">wifi_off</mat-icon>
              <span>OFFLINE (Fila: {{ offlineSync.pendingSyncCount() }})</span>
            </div>
          }

          @if (offlineSync.isOnline() && offlineSync.pendingSyncCount() > 0) {
            <button type="button" (click)="syncOfflineQueue()" [disabled]="offlineSync.isSyncing()"
              class="bg-sky-950/80 text-sky-200 border border-sky-700/60 px-2.5 py-1 rounded-xl text-[10px] font-bold disabled:opacity-50">
              {{ offlineSync.isSyncing() ? 'SINCRONIZANDO…' : 'SINCRONIZAR FILA' }}
            </button>
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
              Operações offline rejeitadas: {{ offlineSync.unresolvedConflictsCount() }}.
              @if (offlineSync.unresolvedConflicts()[0]; as conflict) {
                <span class="font-normal">{{ conflict.orderNumber || conflict.action }}: {{ conflict.reason }} A ciência não reenvia nem corrige a operação.</span>
              }
            </span>
          </div>
          <button
            type="button"
            (click)="clearFirstConflict()"
            class="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1 rounded-lg font-bold text-[10px] uppercase cursor-pointer shrink-0">
            Marcar ciência
          </button>
        </div>
      }

      @if (offlineSync.visibleDeadLetters()[0]; as deadLetter) {
        <div class="bg-amber-950/95 border-b-2 border-amber-500 p-2.5 px-6 shadow-md flex items-center justify-between gap-3 text-xs shrink-0">
          <div class="flex items-center gap-2 text-amber-100 truncate">
            <mat-icon class="text-amber-400 text-sm">sync_problem</mat-icon>
            <span class="truncate">{{ offlineSync.deadLetterCount() }} operação(ões) desta sessão excederam as tentativas automáticas. {{ deadLetter.payload['orderNumber'] || deadLetter.id }} pode ser reenfileirada com a mesma chave idempotente.</span>
          </div>
          <button type="button" (click)="retryDeadLetter(deadLetter.id)" [disabled]="offlineSync.isSyncing()"
            class="bg-amber-500 hover:bg-amber-400 text-stone-950 px-3 py-1 rounded-lg font-bold text-[10px] uppercase cursor-pointer disabled:opacity-50 shrink-0">
            Recolocar na fila
          </button>
        </div>
      }

      <!-- CORPO PRINCIPAL DO TERMINAL PDV -->
      <main class="flex-1 p-3 sm:p-4 min-h-0 overflow-hidden">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 h-full min-h-0 overflow-hidden">
          
          <!-- COLUNA ESQUERDA: LEITOR DE CÓDIGO, CATÁLOGO TOUCH E ATALHOS (8 Colunas) -->
          <div class="lg:col-span-8 flex flex-col gap-3 h-full min-h-0 overflow-hidden">
            <app-pos-scanner
              [(fastScanMode)]="fastScanMode"
              [(tableOrComanda)]="tableOrComanda"
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
              [currentSaleNumber]="currentSaleNumber()"
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
              [isOnline]="offlineSync.isOnline()"
              [canUseExternalTerminal]="canUseExternalTerminal()"
              [externalTerminalMethods]="externalTerminalMethods()"
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
          [products]="tenantProducts()"
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

      @if (showReceiptModal(); as order) {
        <app-pos-receipt-modal
          [order]="order"
          [customerCpf]="customerCpf()"
          [paperWidthMm]="osPreferences.prefs().peripherals.receiptPrinter.paperWidthMm"
          [printerLabel]="osPreferences.prefs().peripherals.receiptPrinter.label"
          (closeRequest)="showReceiptModal.set(null)"
        />
      }

      @if (externalTerminalDraft(); as draft) {
        <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <section class="w-full max-w-md space-y-4 rounded-2xl border border-amber-700/70 bg-[#180b04] p-5 shadow-2xl">
            <header>
              <h2 class="text-lg font-black text-white">Registrar pagamento externo</h2>
              <p class="mt-1 text-xs text-stone-400">{{ externalTerminalMethodLabel(draft.method) }} • Maquininha ou PIX da loja</p>
            </header>
            <div class="rounded-xl border border-[#482814] bg-[#0b0705] p-4 text-center">
              <p class="text-[10px] uppercase tracking-wider text-stone-400">Valor da venda</p>
              <p class="mt-1 text-2xl font-black text-amber-300">R$ {{ draft.total.toFixed(2) }}</p>
            </div>
            @if (draft.terminals.length > 1) {
              <label class="block space-y-1 text-xs text-stone-300">
                <span>Maquininha da loja</span>
                <select class="w-full rounded-lg border border-[#68421d] bg-[#0b0705] px-3 py-2 text-sm text-white" [disabled]="draft.submissionStarted" [value]="draft.selectedTerminalId" (change)="selectExternalTerminal($any($event.target).value)">
                  @for (terminal of draft.terminals; track terminal.id) { <option [value]="terminal.id">{{ terminal.name }}{{ terminal.brand ? ' • ' + terminal.brand : '' }}</option> }
                </select>
              </label>
            } @else {
              <p class="rounded-lg border border-[#482814] bg-[#0b0705] p-3 text-xs text-stone-300">Maquininha: <strong class="text-white">{{ draft.terminals[0]?.name }}</strong>{{ draft.terminals[0]?.brand ? ' • ' + draft.terminals[0]?.brand : '' }}</p>
            }
            <label class="block space-y-1 text-xs text-stone-300">
              <span>Referência do comprovante (opcional)</span>
              <input
                class="w-full rounded-lg border border-[#68421d] bg-[#0b0705] px-3 py-2 text-sm text-white"
                maxlength="80"
                autocomplete="off"
                placeholder="Ex.: NSU ou código curto"
                [disabled]="draft.submissionStarted"
                [value]="externalTerminalReference()"
                (input)="externalTerminalReference.set($any($event.target).value)" />
            </label>
            <p class="text-[10px] text-stone-500">Não informe número do cartão, validade ou código de segurança. Esta referência serve apenas para conferência da loja.</p>
            <label class="flex items-start gap-2 rounded-lg border border-amber-900/70 bg-amber-950/30 p-3 text-xs leading-relaxed text-amber-100">
              <input type="checkbox" class="mt-0.5 accent-amber-500" [disabled]="draft.submissionStarted" [checked]="externalTerminalApproved()" (change)="externalTerminalApproved.set($any($event.target).checked)" />
              <span>Conferi a aprovação na maquininha ou no aplicativo bancário da loja e confirmo o recebimento deste valor.</span>
            </label>
            @if (draft.submissionStarted) {
              <p class="text-[10px] text-amber-200">Esta tentativa mantém a mesma chave e referência. Se a resposta falhar, repita o lançamento para evitar duplicidade.</p>
            }
            <div class="flex gap-2">
              <button type="button" (click)="cancelExternalTerminalConfirmation()" [disabled]="confirmingExternalTerminal() || draft.submissionStarted" class="flex-1 rounded-lg border border-stone-700 py-2.5 text-xs font-bold text-stone-300 disabled:opacity-50">Voltar</button>
              <button type="button" (click)="confirmExternalTerminalPayment()" [disabled]="confirmingExternalTerminal() || !externalTerminalApproved()" class="flex-1 rounded-lg bg-amber-500 py-2.5 text-xs font-black text-stone-950 disabled:opacity-40">
                {{ confirmingExternalTerminal() ? 'Registrando…' : draft.submissionStarted ? 'Repetir lançamento' : 'Confirmar recebimento' }}
              </button>
            </div>
          </section>
        </div>
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
            <p class="text-[10px] text-stone-400">Fechar esta janela não cancela o pedido nem a transação PIX.</p>

            <div class="flex gap-2">
              <button
                type="button"
                (click)="pendingPixModal.set(null)"
                class="flex-1 py-2.5 rounded-xl border border-stone-700 text-stone-300 font-bold text-xs uppercase cursor-pointer hover:bg-stone-800">
                Fechar
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
  readonly osPreferences = inject(OsPreferencesService);
  private readonly paymentEngine = inject(PaymentEngine);
  private readonly router = inject(Router);

  private saleNumberSequence = Math.floor(Math.random() * 900 + 100);
  private lastOperationalTenantId: string | null = null;
  private lastPosModeIsSimulation: boolean | null = null;
  private lastPosModeRevision: number | null = null;
  private lastPosSessionId: string | null = null;
  readonly currentSaleNumber = signal(this.saleNumberSequence);
  readonly activeDeviceId = computed(() => this.ecosystem.getOperationalContext().deviceId || 'pos-terminal');
  readonly activeDeviceName = signal('PDV lógico da loja');
  readonly operatorName = computed(() => this.security.currentSession()?.name || 'Operador Caixa');
  readonly activeTenant = computed(() => this.ecosystem.currentTenant());
  readonly externalTerminalMethods = computed<ExternalTerminalMethod[]>(() => {
    const methods = new Set<ExternalTerminalMethod>();
    for (const terminal of this.activeTenant()?.externalPaymentTerminals || []) {
      if (terminal.enabled) terminal.methods.forEach((method) => methods.add(method));
    }
    return [...methods];
  });
  readonly canUseExternalTerminal = computed(() => {
    const role = this.security.currentSession()?.role;
    const isStoreOperator = role === 'tenant_owner' || role === 'operator';
    return isStoreOperator && this.offlineSync.isOnline() && !this.security.isSimulated() && this.externalTerminalMethods().length > 0;
  });

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
  readonly fastScanMode = signal<boolean>(true);
  readonly tableOrComanda = signal<string>('');

  // Modals
  readonly showScaleModal = signal<boolean>(false);
  readonly applyDiscountModal = signal<boolean>(false);
  readonly showRecallModal = signal<boolean>(false);
  readonly showSangriaModal = signal<boolean>(false);
  readonly showReceiptModal = signal<OrderTransaction | null>(null);
  readonly pendingPixModal = signal<{ order: OrderTransaction; payment: PaymentTransactionResult } | null>(null);
  readonly confirmingPix = signal<boolean>(false);
  readonly externalTerminalDraft = signal<ExternalTerminalDraft | null>(null);
  readonly externalTerminalReference = signal('');
  readonly externalTerminalApproved = signal(false);
  readonly confirmingExternalTerminal = signal(false);

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

  readonly tenantProducts = computed(() => {
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    if (!tenantId) return [];
    return this.inventoryService.products().filter((product) => product.tenantId === tenantId);
  });

  readonly filteredProducts = computed(() => {
    const cat = this.selectedCategory();
    const query = this.searchQuery().toLowerCase().trim();

    return this.tenantProducts().filter((p) => {
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
      return sum + item.product.price * item.quantity;
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
      const isSimulation = this.security.isSimulated();
      const modeRevision = this.security.executionModeRevision();
      const session = this.security.currentSession();
      const sessionId = session?.id || null;
      const tid = this.ecosystem.resolveOperationalTenantId();
      const activeTenant = this.ecosystem.tenants().find((tenant) => tenant.id === tid);
      untracked(() => this.osPreferences.setScope(session?.id || session?.email, tid || undefined, activeTenant?.category));
      if (!tid) {
        this.cart.set([]);
        this.selectedCustomer.set(null);
        this.customerSearchResults.set([]);
        this.heldSales.set([]);
        this.lastOperationalTenantId = null;
        this.lastPosModeIsSimulation = null;
        this.lastPosModeRevision = modeRevision;
        this.lastPosSessionId = sessionId;
        this.resetExternalTerminalConfirmation();
        return;
      }

      if (
        this.lastOperationalTenantId !== tid ||
        this.lastPosModeIsSimulation !== isSimulation ||
        this.lastPosModeRevision !== modeRevision ||
        this.lastPosSessionId !== sessionId
      ) {
        this.cart.set([]);
        this.selectedCustomer.set(null);
        this.customerSearchResults.set([]);
        this.heldSales.set([]);
        this.resetExternalTerminalConfirmation();
        this.lastOperationalTenantId = tid;
        this.lastPosModeIsSimulation = isSimulation;
        this.lastPosModeRevision = modeRevision;
        this.lastPosSessionId = sessionId;
      }

      this.inventoryService.fetchProducts(tid).catch(() => []);
    });
  }

  handleBarcodeBipInput() {
    const query = this.searchQuery().trim();
    if (!query) return;

    let mult = 1;
    let targetCode = query;
    if (query.includes('*')) {
      const parts = query.split('*');
      const requestedQuantity = Number.parseInt(parts[0] || '', 10);
      mult = Number.isInteger(requestedQuantity) && requestedQuantity > 0 ? requestedQuantity : 1;
      targetCode = parts[1].trim();
    }

    const matchedProduct = this.tenantProducts()
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
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    if (!tenantId || product.tenantId !== tenantId || !Number.isFinite(qty) || qty <= 0) {
      this.ecosystem.notify('Produto ou quantidade inválidos para a loja ativa.', 'error');
      return;
    }

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
      saleNumber: this.currentSaleNumber(),
      tableOrClient: this.tableOrComanda() || 'Balcão',
      items: [...this.cart()],
      total: this.cartTotal(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    this.heldSales.update((h) => [newHeld, ...h]);
    this.ecosystem.notify(`Venda #${this.currentSaleNumber()} em espera (Hold).`, 'info');
    this.advanceSaleNumber();
    this.clearCart();
  }

  recallSale(held: HeldSale) {
    this.cart.set([...held.items]);
    this.currentSaleNumber.set(held.saleNumber);
    this.heldSales.update((h) => h.filter((item) => item.id !== held.id));
    this.showRecallModal.set(false);
    this.ecosystem.notify(`Venda #${held.saleNumber} recuperada.`, 'success');
  }

  onConfirmScaleWeighing(event: { productId: string; weight: number }) {
    const prod = this.tenantProducts().find((p) => p.id === event.productId);
    if (!prod || !Number.isFinite(event.weight) || event.weight <= 0) return;
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

  async onExecuteCashOperation(event: { type: 'sangria' | 'suprimento'; amount: number; reason: string }) {
    if (!Number.isFinite(event.amount) || event.amount <= 0 || !event.reason.trim()) {
      this.ecosystem.notify('Informe um valor válido e o motivo da operação de caixa.', 'warning');
      return;
    }

    if (!this.offlineSync.isOnline()) {
      this.ecosystem.notify('Sangria e suprimento exigem conexão e não foram registrados.', 'warning');
      this.showSangriaModal.set(false);
      return;
    }

    const tenantId = this.ecosystem.resolveOperationalTenantId();
    try {
      await this.financialsService.addRecord({
        date: new Date().toISOString(),
        type: event.type === 'sangria' ? 'expense' : 'income',
        category: event.type === 'sangria' ? 'Sangria de Caixa' : 'Suprimento / Aporte',
        description: `${event.type === 'sangria' ? 'Sangria Gaveta' : 'Suprimento Fundo de Troco'}: ${event.reason}`,
        amount: event.amount,
        paymentMethod: 'Dinheiro',
        tenantId,
        channel: 'POS',
        deviceId: this.activeDeviceId(),
        status: 'cleared',
        referenceId: `${event.type}-${Date.now()}`
      });
      this.ecosystem.notify(
        `${event.type === 'sangria' ? 'Sangria' : 'Suprimento'} de R$ ${event.amount.toFixed(2)} registrada no caixa.`,
        event.type === 'sangria' ? 'warning' : 'success'
      );
    } catch {
      this.ecosystem.notify('Falha ao registrar operação de caixa no financeiro.', 'error');
    }
    this.showSangriaModal.set(false);
  }

  async checkout(method: 'cash' | 'card' | 'pix' | 'external-pix' | 'external-credit' | 'external-debit') {
    if (this.cart().length === 0) return;
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    if (!tenantId || this.cart().some((item) => item.product.tenantId !== tenantId)) {
      this.ecosystem.notify('O carrinho não pertence à loja ativa e foi limpo.', 'error');
      this.clearCart();
      return;
    }

    if (!this.offlineSync.isOnline() && method !== 'cash') {
      this.ecosystem.notify('Cartão e PIX exigem conexão. Use dinheiro para registrar uma venda em contingência.', 'warning');
      return;
    }

    if (method === 'external-pix' || method === 'external-credit' || method === 'external-debit') {
      if (this.security.isSimulated()) {
        this.ecosystem.notify('Recebimento por terminal externo só pode ser registrado no modo real.', 'warning');
        return;
      }
      this.openExternalTerminalConfirmation(
        method === 'external-pix' ? 'pix' : method === 'external-credit' ? 'credit_card' : 'debit_card'
      );
      return;
    }

    const subtotal = this.cartSubtotal();
    const tax = this.cartTax();
    const discount = this.cartDiscount() + this.cartPromotionsDiscount();
    const total = this.cartTotal();
    const saleNumber = this.currentSaleNumber();

    try {
      if (method === 'cash') {
        const cashOrder = await this.ecosystem.addOrder({
          tenantId,
          orderNumber: '#' + saleNumber,
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
        this.advanceSaleNumber();

        const isSimulation = cashOrder.isSimulated || cashOrder.mode === 'simulation';
        const isSettled = cashOrder.status === 'completed' && cashOrder.paymentStatus === 'approved';
        this.ecosystem.notify(
          isSimulation
            ? `Venda #${cashOrder.orderNumber} registrada em modo de demonstração; nenhuma liquidação real foi feita.`
            : isSettled
              ? `Venda R$ ${cashOrder.total.toFixed(2)} confirmada em Dinheiro no terminal.`
              : `Venda #${cashOrder.orderNumber} registrada como pendente; aguardando confirmação do servidor.`,
          isSimulation ? 'info' : isSettled ? 'success' : 'warning'
        );
        this.showReceiptModal.set(cashOrder);
        this.clearCart();
        return;
      }

      if (method === 'pix') {
        const pendingOrder = await this.ecosystem.addOrder({
          tenantId,
          orderNumber: '#' + saleNumber,
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
        this.advanceSaleNumber();

        if (pendingOrder.isSimulated || pendingOrder.mode === 'simulation') {
          this.ecosystem.notify(
            `Pedido ${pendingOrder.orderNumber} registrado somente na demonstração; nenhum pagamento PIX foi processado.`,
            'info'
          );
          this.showReceiptModal.set(pendingOrder);
          this.clearCart();
          return;
        }

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
        orderNumber: '#' + saleNumber,
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
      this.advanceSaleNumber();

      if (cardOrder.isSimulated || cardOrder.mode === 'simulation') {
        this.ecosystem.notify(
          `Pedido ${cardOrder.orderNumber} registrado somente na demonstração; nenhuma cobrança de cartão foi processada.`,
          'info'
        );
        this.showReceiptModal.set(cardOrder);
        this.clearCart();
        return;
      }

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
        paymentResult.environment === 'sandbox' || paymentResult.mode === 'simulation'
          ? `Pagamento aprovado em ambiente de teste para a venda ${cardOrder.orderNumber}; nenhuma cobrança real foi efetuada.`
          : `Venda R$ ${cardOrder.total.toFixed(2)} confirmada via Cartão (AUT: ${paymentResult.authorizationCode}).`,
        paymentResult.environment === 'sandbox' || paymentResult.mode === 'simulation' ? 'warning' : 'success'
      );
      const settledCardOrder: OrderTransaction = {
        ...cardOrder,
        status: 'completed',
        paymentStatus: 'approved',
        paymentTransactionId: paymentResult.transactionId,
        ...(paymentResult.mode === 'simulation' ? { mode: 'simulation', isSimulated: true } : {})
      };
      const refreshedOrders = await this.ecosystem.ordersService.fetchOrders(tenantId).catch(() => []);
      const serverOrder = refreshedOrders.find((order) => order.id === cardOrder.id);
      this.showReceiptModal.set(
        serverOrder?.status === 'completed' && serverOrder.paymentStatus === 'approved'
          ? serverOrder
          : settledCardOrder
      );
      this.clearCart();
    } catch (err: unknown) {
      const msg =
        (err as { error?: { error?: string } })?.error?.error ||
        'Estoque insuficiente ou falha ao processar venda no PDV.';
      this.ecosystem.notify(msg, 'error');
    }
  }

  private openExternalTerminalConfirmation(method: ExternalTerminalMethod) {
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    if (!tenantId || this.cart().length === 0) return;
    const terminals = (this.activeTenant()?.externalPaymentTerminals || [])
      .filter((terminal) => terminal.enabled && terminal.methods.includes(method));
    if (terminals.length === 0) {
      this.ecosystem.notify('Cadastre e ative uma maquininha compatível em Configurações da Loja.', 'warning');
      return;
    }
    const key = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
    this.externalTerminalDraft.set({
      method,
      idempotencyKey: `pos-ext-${key}`,
      tenantId,
      terminals,
      selectedTerminalId: terminals[0]!.id,
      orderNumber: `#${this.currentSaleNumber()}`,
      items: this.cart().map((item) => ({ ...item })),
      subtotal: this.cartSubtotal(),
      tax: this.cartTax(),
      discount: this.cartDiscount() + this.cartPromotionsDiscount(),
      total: this.cartTotal(),
      ...(this.tableOrComanda() ? { tableNumber: this.tableOrComanda() } : {}),
      submissionStarted: false
    });
    this.externalTerminalReference.set('');
    this.externalTerminalApproved.set(false);
  }

  externalTerminalMethodLabel(method: ExternalTerminalMethod): string {
    if (method === 'pix') return 'PIX externo';
    return method === 'credit_card' ? 'Cartão de crédito' : 'Cartão de débito';
  }

  selectExternalTerminal(id: string) {
    this.externalTerminalDraft.update((draft) => draft ? { ...draft, selectedTerminalId: id } : null);
  }

  cancelExternalTerminalConfirmation() {
    if (this.confirmingExternalTerminal() || this.externalTerminalDraft()?.submissionStarted) return;
    this.resetExternalTerminalConfirmation();
  }

  private resetExternalTerminalConfirmation() {
    this.externalTerminalDraft.set(null);
    this.externalTerminalReference.set('');
    this.externalTerminalApproved.set(false);
  }

  async confirmExternalTerminalPayment() {
    const draft = this.externalTerminalDraft();
    if (!draft || !this.externalTerminalApproved() || this.confirmingExternalTerminal()) return;
    if (this.security.isSimulated() || !this.offlineSync.isOnline()) {
      this.ecosystem.notify('Confirmação externa exige sessão real e conexão com o servidor.', 'warning');
      return;
    }
    if (this.ecosystem.resolveOperationalTenantId() !== draft.tenantId) {
      this.cancelExternalTerminalConfirmation();
      this.ecosystem.notify('A loja ativa mudou. Confira o carrinho e inicie o registro novamente.', 'warning');
      return;
    }

    const modeRevision = this.security.executionModeRevision();
    const sessionId = this.security.currentSession()?.id || null;
    const externalReference = draft.submissionStarted
      ? draft.submittedReference || ''
      : this.externalTerminalReference().trim();
    if (!draft.submissionStarted) {
      this.externalTerminalDraft.set({
        ...draft,
        submissionStarted: true,
        ...(externalReference ? { submittedReference: externalReference } : {})
      });
    }
    this.confirmingExternalTerminal.set(true);
    try {
      const order = await this.ecosystem.addOrder({
        idempotencyKey: draft.idempotencyKey,
        tenantId: draft.tenantId,
        externalTerminalId: draft.selectedTerminalId,
        orderNumber: draft.orderNumber,
        type: 'pos-counter',
        ...(draft.tableNumber ? { tableNumber: draft.tableNumber } : {}),
        items: draft.items,
        subtotal: draft.subtotal,
        tax: draft.tax,
        discount: draft.discount,
        total: draft.total,
        paymentMethod: draft.method === 'pix' ? 'pix' : 'card',
        externalTerminalConfirmedByOperator: true,
        externalTerminalMethod: draft.method,
        externalTerminalReference: externalReference,
        status: 'completed',
        channel: 'POS',
        deviceId: this.activeDeviceId(),
        deviceName: this.activeDeviceName(),
        deviceType: 'terminal',
        operatorName: this.operatorName()
      });

      if (
        modeRevision !== this.security.executionModeRevision() ||
        sessionId !== (this.security.currentSession()?.id || null) ||
        this.security.isSimulated() ||
        this.ecosystem.resolveOperationalTenantId() !== draft.tenantId
      ) {
        this.resetExternalTerminalConfirmation();
        return;
      }

      if (order.status !== 'completed' || order.paymentStatus !== 'approved' || order.isSimulated || order.mode === 'simulation') {
        this.ecosystem.notify('O servidor não confirmou a liquidação real. Confira o pedido antes de tentar novamente.', 'warning');
        return;
      }

      this.advanceSaleNumber();
      this.showReceiptModal.set(order);
      this.clearCart();
      this.resetExternalTerminalConfirmation();
      this.ecosystem.notify(
        `Recebimento externo de R$ ${order.total.toFixed(2)} registrado como ${this.externalTerminalMethodLabel(draft.method)}.`,
        'success'
      );
    } catch (err: unknown) {
      if (
        modeRevision !== this.security.executionModeRevision() ||
        sessionId !== (this.security.currentSession()?.id || null) ||
        this.security.isSimulated() ||
        this.ecosystem.resolveOperationalTenantId() !== draft.tenantId
      ) {
        this.resetExternalTerminalConfirmation();
        return;
      }
      const msg =
        (err as { error?: { error?: string } })?.error?.error ||
        'Não foi possível registrar o pagamento externo. A mesma tentativa pode ser repetida com segurança.';
      this.ecosystem.notify(msg, 'error');
    } finally {
      this.confirmingExternalTerminal.set(false);
    }
  }

  async confirmPendingPix() {
    const activePix = this.pendingPixModal();
    if (!activePix) return;
    if (this.security.isSimulated()) {
      this.ecosystem.notify(
        'Confirmação PIX bloqueada enquanto o PDV estiver em modo de simulação.',
        'warning'
      );
      return;
    }
    if (activePix.order.isSimulated || activePix.order.mode === 'simulation') {
      this.ecosystem.notify('Pedidos demonstrativos não podem liquidar pagamentos PIX.', 'warning');
      return;
    }
    this.confirmingPix.set(true);
    try {
      const confirmed = await this.paymentEngine.confirmPixPayment(activePix.payment.transactionId);
      const isSimulation = confirmed.environment === 'sandbox' || confirmed.mode === 'simulation';
      const settledOrder = confirmed.order || {
        ...activePix.order,
        status: 'completed' as const,
        paymentStatus: 'approved' as const,
        mode: confirmed.mode,
        isSimulated: confirmed.mode === 'simulation'
      };
      const tenantId = this.ecosystem.resolveOperationalTenantId(settledOrder.tenantId);
      if (tenantId) {
        await this.ecosystem.ordersService.fetchOrders(tenantId).catch(() => []);
        await this.financialsService.fetchRecords(tenantId).catch(() => []);
      }
      this.pendingPixModal.set(null);
      this.showReceiptModal.set(settledOrder);
      this.ecosystem.notify(
        isSimulation
          ? `PIX confirmado em ambiente de teste para a venda ${settledOrder.orderNumber}; nenhuma cobrança real foi efetuada.`
          : `PIX confirmado! Venda ${settledOrder.orderNumber} liquidada no caixa.`,
        isSimulation ? 'warning' : 'success'
      );
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

  async syncOfflineQueue() {
    try {
      const result = await this.offlineSync.processSyncQueue();
      if (result.processed > 0) {
        this.ecosystem.notify(`${result.processed} operação(ões) offline sincronizada(s).`, 'success');
      } else if (result.conflicts > 0) {
        this.ecosystem.notify('A fila contém operações que precisam de revisão.', 'warning');
      } else if (result.failed > 0) {
        this.ecosystem.notify('A API não concluiu a sincronização. A fila foi mantida para nova tentativa.', 'warning');
      } else {
        this.ecosystem.notify('Não há operações desta unidade autorizadas para sincronizar.', 'info');
      }
    } catch {
      this.ecosystem.notify('Não foi possível sincronizar agora. As operações locais foram preservadas.', 'error');
    }
  }

  async retryDeadLetter(id: string) {
    try {
      const queued = await this.offlineSync.retryDeadLetter(id);
      this.ecosystem.notify(
        queued
          ? 'Operação recolocada na fila com a mesma chave idempotente; a sincronização tentará novamente.'
          : 'Esta operação não está mais disponível para esta sessão.',
        queued ? 'info' : 'warning'
      );
    } catch {
      this.ecosystem.notify('Não foi possível recuperar a operação agora. Ela continua na lista de falhas.', 'error');
    }
  }

  private advanceSaleNumber() {
    this.saleNumberSequence = Math.max(this.saleNumberSequence, this.currentSaleNumber()) + 1;
    this.currentSaleNumber.set(this.saleNumberSequence);
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
