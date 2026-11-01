export type ActiveEcosystemTab = 'login' | 'hq' | 'client' | 'marketplace' | 'storefront' | 'driver' | 'waiter';

export type SystemExecutionMode = 'real' | 'simulation';

export type AppRole =
  | 'hq_admin'
  | 'tenant_owner'
  | 'operator'
  | 'waiter'
  | 'driver'
  | 'consumer'
  | 'guest';

export type EcosystemPillar =
  | 'hq'
  | 'os'
  | 'marketplace'
  | 'storefront'
  | 'waiter'
  | 'driver'
  | 'backend'
  | 'consumer';

export interface PillarDefinition {
  id: EcosystemPillar;
  number: number;
  name: string;
  shortName: string;
  subtitle: string;
  route: string;
  icon: string;
  colorScheme: 'rose' | 'amber' | 'emerald' | 'cyan' | 'orange' | 'purple' | 'slate';
  primaryTarget: string;
  primaryRole: string;
  isStoreSpecific: boolean;
  whatItDoes: string;
  whatItDoesNotDo: string;
}

export const PILLARS_CATALOG: PillarDefinition[] = [
  {
    id: 'hq',
    number: 1,
    name: 'HQ Central',
    shortName: 'HQ',
    subtitle: 'Gabinete Executivo SaaS & Governança Master',
    route: '/hq',
    icon: 'admin_panel_settings',
    colorScheme: 'rose',
    primaryTarget: 'Franqueador, Super Admin da Plataforma SaaS',
    primaryRole: 'hq_admin',
    isStoreSpecific: false,
    whatItDoes: 'Governança global de todos os tenants (aprovação de lojas, suspensão, planos SaaS Pro/Enterprise, comissão futura das entregas próprias da plataforma em breve, gestão da frota de hardware MDM, catálogo regional e auditoria do ecossistema).',
    whatItDoesNotDo: 'O HQ NÃO é uma loja! NÃO opera frente de caixa (PDV), NÃO tem mesas de bar/restaurante, NÃO recebe pedidos de delivery e NÃO lança comanda de cozinha.'
  },
  {
    id: 'os',
    number: 2,
    name: 'Store OS Lojista',
    shortName: 'Store OS',
    subtitle: 'Sistema Operacional do Estabelecimento & PDV',
    route: '/os',
    icon: 'desktop_windows',
    colorScheme: 'amber',
    primaryTarget: 'Proprietário da Loja e Operadores do Estabelecimento',
    primaryRole: 'tenant_owner / operator',
    isStoreSpecific: true,
    whatItDoes: 'Ambiente operacional completo de UMA loja individual (Frente de Caixa PDV, KDS de Cozinha, Mapa de Mesas, Estoque NFe, DRE Financeiro da loja, Integração iFood/WhatsApp).',
    whatItDoesNotDo: 'O Store OS NÃO é o HQ Central (não administra outros estabelecimentos) e NÃO é o Marketplace (não é o portal de navegação do cliente final).'
  },
  {
    id: 'marketplace',
    number: 3,
    name: 'Marketplace Regional',
    shortName: 'Marketplace',
    subtitle: 'Portal Público do Consumidor Regional',
    route: '/home',
    icon: 'storefront',
    colorScheme: 'emerald',
    primaryTarget: 'Consumidor Final (Clientes que compram na região)',
    primaryRole: 'consumer / guest',
    isStoreSpecific: false,
    whatItDoes: 'Descoberta de lojas abertas por geolocalização e raio de entrega, busca de pratos e produtos, carrinho multi-itens e checkout de pedidos online (Delivery e Retirada/Takeout).',
    whatItDoesNotDo: 'O Marketplace NÃO é painel de controle do lojista e NÃO é gabinete do franqueador. É a vitrine pública de compras para o consumidor.'
  },
  {
    id: 'storefront',
    number: 4,
    name: 'Vitrine Pública & QR Mesa',
    shortName: 'Vitrine QR',
    subtitle: 'Cardápio Digital & Autoatendimento da Loja',
    route: '/p/default',
    icon: 'qr_code_2',
    colorScheme: 'cyan',
    primaryTarget: 'Cliente direto da loja ou cliente sentado na mesa física',
    primaryRole: 'consumer / guest',
    isStoreSpecific: true,
    whatItDoes: 'Cardápio online da unidade acessado via link direto ou QR Code fixado na mesa, autoatendimento, pedidos para a comanda da mesa e agendamento de reservas de mesa.',
    whatItDoesNotDo: 'NÃO dá acesso a dados financeiros internos da loja e NÃO exibe produtos de outras lojas concorrentes.'
  },
  {
    id: 'waiter',
    number: 5,
    name: 'App Mobile do Garçom',
    shortName: 'Garçom',
    subtitle: 'Operação de Salão & Comandas de Mesa',
    route: '/waiter',
    icon: 'room_service',
    colorScheme: 'orange',
    primaryTarget: 'Garçons e Equipe de Atendimento de Salão',
    primaryRole: 'waiter',
    isStoreSpecific: true,
    whatItDoes: 'Visualização das mesas da loja (Livre, Ocupada, Reservada, Conta), abertura e lançamento de itens com observações e 3 tempos (Entrada, Principal, Sobremesa) enviados direto ao KDS.',
    whatItDoesNotDo: 'NÃO visualiza DRE/lucro da loja (bloqueado com 403), NÃO edita estoque e NÃO acessa configurações de outras lojas.'
  },
  {
    id: 'driver',
    number: 6,
    name: 'App Mobile do Entregador',
    shortName: 'Entregador',
    subtitle: 'Logística, Rotas e Telemetria de Entrega',
    route: '/driver',
    icon: 'two_wheeler',
    colorScheme: 'purple',
    primaryTarget: 'Motoristas das lojas e, futuramente, da rede própria da plataforma',
    primaryRole: 'driver',
    isStoreSpecific: false,
    whatItDoes: 'Facilita o acesso dos motoristas da loja às rotas, à confirmação de coleta e à baixa das entregas. Integração com GPS do aparelho não está conectada.',
    whatItDoesNotDo: 'NÃO acessa pedidos de outras lojas sem permissão de frota e NÃO tem acesso a configurações de loja ou governança.'
  },
  {
    id: 'backend',
    number: 7,
    name: 'Núcleo Transacional Backend',
    shortName: 'Core Backend',
    subtitle: 'APIs Express 5, Outbox Offline & Segurança Zero-Trust',
    route: '/api/health',
    icon: 'lock',
    colorScheme: 'slate',
    primaryTarget: 'Motor Transacional Central e Camada de Segurança',
    primaryRole: 'Automático / Zero-Trust',
    isStoreSpecific: false,
    whatItDoes: 'Persistência no Cloud Firestore (18 coleções protegidas por regras Zero-Trust), motor comercial idempotente (CommerceEngine), liquidação atômica e fila de contingência offline.',
    whatItDoesNotDo: 'NÃO confia em dados não autenticados do frontend e NÃO permite auto-liquidação sem confirmação de pagamento.'
  }
];


export interface UserSession {
  id?: string;
  name: string;
  role: AppRole;
  email: string;
  emailVerified?: boolean;
  tenantName: string;
  tenantId?: string;
  token?: string;
}

export interface PublicStorefront {
  id: string;
  name: string;
  category: string;
  status: 'active' | 'suspended' | 'trial';
  rating?: number;
  reviewCount?: number;
  tagline?: string;
  badgeCategory?: string;
  supportsDelivery?: boolean;
  supportsTakeout?: boolean;
  supportsReservation?: boolean;
  pixAvailable?: boolean;
  isOpen?: boolean;
  estimatedDeliveryMinutes?: string;
  deliveryFee?: number;
  minOrderValue?: number;
  deliveryRadiusKm: number;
  openingHours: string;
  address: {
    city: string;
    neighborhood: string;
    state: string;
    street?: string;
    number?: string;
    zipCode?: string;
  };
  lat?: number;
  lng?: number;
  logo?: string;
  coverImage?: string;
  specialties?: string[];
  storeSlug?: string;
  themeColor?: 'amber' | 'emerald' | 'indigo' | 'rose' | 'orange' | 'cyan';
  announcementText?: string;
  showAnnouncement?: boolean;
}

export interface StoreAddress {
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  complement?: string;
}

export interface DriverRateConfig {
  baseFee: number;
  includedKm: number;
  extraKmFee: number;
  extraStopBonus: number;
}

export interface CompanyTenant {
  id: string;
  name: string;
  legalName: string;
  cnpj: string;
  category: 'restaurant' | 'retail' | 'services' | 'hybrid' | 'health' | 'education' | 'automotive' | 'beauty' | 'petshop';
  plan: 'Starter' | 'Professional' | 'Enterprise';
  status: 'active' | 'suspended' | 'trial';
  devicesLimit: number;
  activeDevicesCount: number;
  contactEmail: string;
  phone: string;
  createdAt: string;
  address: StoreAddress;
  deliveryRadiusKm: number;
  /** Public PIX receiving key for this tenant; provider credentials are never stored here. */
  pixKey?: string;
  /** Sanitized public capability flag; does not expose the receiving key itself. */
  pixAvailable?: boolean;
  /** @deprecated Legacy value ignored by checkout; delivery uses the store's fixed deliveryFee. */
  serviceFeePercent?: number;
  openingHours: string;
  fichaCode?: string;
  lat?: number;
  lng?: number;
  rating?: number;
  reviewCount?: number;
  tagline?: string;
  badgeCategory?: string;
  supportsDelivery?: boolean;
  supportsTakeout?: boolean;
  supportsReservation?: boolean;
  isOpen?: boolean;
  estimatedDeliveryMinutes?: string;
  deliveryFee?: number;
  logo?: string;
  coverImage?: string;
  icon?: string;
  specialties?: string[];
  storeSlug?: string;
  themeColor?: 'amber' | 'emerald' | 'indigo' | 'rose' | 'orange' | 'cyan';
  announcementText?: string;
  showAnnouncement?: boolean;
  announcementType?: 'promo' | 'alert' | 'news';
  whatsappNumber?: string;
  instagramHandle?: string;
  aboutText?: string;
  highlightedProductIds?: string[];
  driverRateConfig?: DriverRateConfig;
  minOrderValue?: number;
  /** @deprecated New and active store operations use their own drivers until the platform network is ready. */
  deliveryFleetType?: 'own' | 'platform' | 'hybrid';
  ownerUid?: string;
  staffUids?: string[];
  /** Internal version used to serialize device registration against the tenant quota. */
  deviceInventoryVersion?: number;
}

export interface RegionalMarketplaceConfig {
  heroTitle: string;
  heroSubtitle: string;
  heroTag: string;
  heroBannerImage: string;
  heroCtaText: string;
  heroAnnouncement: string;
  showHeroAnnouncement: boolean;
  featuredTenantIds: string[];
  defaultSearchRadiusKm: number;
  activeRegionName: string;
}

export interface POSDevice {
  id: string;
  tenantId: string;
  tenantName: string;
  deviceName: string;
  type: 'terminal' | 'tablet' | 'mobile' | 'kiosk';
  serialNumber: string;
  macAddress?: string;
  ipAddress?: string;
  osVersion?: string;
  appVersion?: string;
  status: 'online' | 'offline' | 'locked' | 'updating' | 'unverified';
  lastPing?: string;
  location?: string;
  batteryLevel?: number;
}

export interface ProductItem {
  id: string;
  tenantId: string;
  name: string;
  category: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  barcode: string;
  sku: string;
  image: string;
  availableOnline: boolean;
  description: string;
  supplierId?: string;
  wholesalePrice?: number;
  /** BOM - Bill of Materials (e.g. Burger recipe decrements Meat and Bread) */
  recipe?: { productId: string; qty: number }[];
  /** Specific commission for this item (0.0 to 1.0) */
  commissionRate?: number;
  isSimulated?: boolean;
  mode?: SystemExecutionMode;
}

export interface PublicCatalogProduct {
  id: string;
  tenantId: string;
  name: string;
  category: string;
  price: number;
  image: string;
  availableOnline: boolean;
  inStock: boolean;
  description: string;
}

export interface CartItem {
  product: ProductItem;
  quantity: number;
  notes?: string;
}

export interface PaymentTransactionRecord {
  id: string;
  orderId: string;
  tenantId: string;
  amount: number;
  feeDeducted: number;
  netAmount: number;
  method: 'pix' | 'credit_card' | 'debit_card' | 'cash' | 'voucher';
  status: 'approved' | 'pending_pix' | 'declined';
  gateway: string;
  authorizationCode: string;
  environment: 'sandbox' | 'live';
  mode: SystemExecutionMode;
  isSimulated?: boolean;
  qrCodePix?: string;
  pixCopyPaste?: string;
  createdByUid: string;
  createdAt: string;
  confirmedAt?: string;
}

export type CommercialChannel =
  | 'POS'
  | 'Online Marketplace'
  | 'Waiter Comanda'
  | 'Kiosk Totem'
  | 'Table QR'
  | 'Customer Storefront'
  | 'iFood'
  | 'WhatsApp'
  | 'HQ'
  | 'Partner API';

export type CommercialDeviceType = 'terminal' | 'tablet' | 'mobile' | 'kiosk' | 'desktop';

export interface OrderTransaction {
  id: string;
  tenantId: string;
  tenantName?: string;
  orderNumber: string;
  type: 'dine-in' | 'takeout' | 'delivery' | 'pos-counter';
  tableNumber?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee?: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'pix' | 'online' | 'room_folio';
  paymentTransactionId?: string;
  paymentStatus?: 'pending' | 'pending_pix' | 'approved' | 'declined' | 'refunded';
  cashConfirmedByOperator?: boolean;
  status: 'pending' | 'preparing' | 'ready' | 'dispatched' | 'completed' | 'cancelled' | 'delivered';
  createdAt: string;
  channel: CommercialChannel;
  deviceId?: string;
  deviceName?: string;
  deviceType?: CommercialDeviceType;
  operatorId?: string;
  operatorName?: string;
  lat?: number;
  lng?: number;
  address?: string;
  isSimulated?: boolean;
  mode?: SystemExecutionMode;
  staffUids?: string[];
  driverId?: string;
  assignedStaffId?: string;
  metadata?: Record<string, unknown>;
}

export interface ConsumerAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf?: string;
  primaryAddress: string;
  neighborhood: string;
  city: string;
  totalOrders: number;
  totalSpent: number;
  loyaltyPoints?: number;
  status: 'active' | 'blocked';
  registeredAt: string;
}

export interface DeliveryRoute {
  id: string;
  routeCode: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  tenantId: string;
  date: string;
  timeWindow: string;
  totalDistanceKm: number;
  estimatedDuration: string;
  /** Valor de rota definido pela loja; não confirma nem registra pagamento ao entregador. */
  totalEarnings: number;
  waypoints: DeliveryWaypoint[];
  status: 'available' | 'accepted' | 'at_store' | 'in_progress' | 'completed';
  totalDeliveredCount: number;
  completedAt?: string;
  isSimulated?: boolean;
  mode?: 'real' | 'simulation';
  staffUids?: string[];
}

export interface DeliveryWaypoint {
  id: string;
  orderId?: string;
  customerName: string;
  customerPhone: string;
  address: string;
  cityState: string;
  distanceKm: number;
  etaMinutes: number;
  productSummary: string;
  weightKg?: number;
  status: 'pending' | 'in_transit' | 'arrived' | 'completed' | 'failed';
  sequenceNumber: number;
  packageDimensions?: string;
  notes?: string;
  lat?: number;
  lng?: number;
}

export interface SystemAuditReport {
  timestamp: string;
  tenantsChecked: number;
  productsChecked: number;
  ordersChecked: number;
  devicesChecked: number;
  orderTotalsConsistent: boolean;
  issuesFound: string[];
  status: 'passed' | 'warning' | 'failed';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  module: 'HQ' | 'OS Client' | 'Marketplace' | 'System';
  details: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface LicensePlan {
  id: string;
  name: string;
  priceMonthly: number;
  maxDevices: number;
  includedModules: string[];
  description: string;
}

export interface StoreDriver {
  id: string;
  tenantId?: string;
  name: string;
  phone: string;
  vehicleType: 'moto' | 'bike' | 'carro';
  licensePlate?: string;
  status: 'available' | 'delivering' | 'offline';
  activeDeliveriesCount: number;
  rating: number;
  completedTodayCount: number;
  driverType: 'private' | 'platform';
  deviceName?: string;
  appVersion?: string;
  batteryLevel?: number;
  lastGpsPing?: string;
  currentLocationName?: string;
  complianceVerified?: boolean;
  cnhNumber?: string;
  isSimulated?: boolean;
  mode?: SystemExecutionMode;
}

export interface TableInfo {
  id: string;
  tenantId: string;
  number: number;
  capacity: number;
  guests?: number;
  status: 'available' | 'occupied' | 'billing' | 'reserved';
  zone?: string;
  server?: string;
  currentTotal?: number;
  currentOrderId?: string;
  staffUids?: string[];
  isSimulated?: boolean;
  mode?: SystemExecutionMode;
}

export interface FinancialRecord {
  id: string;
  tenantId: string;
  type: 'income' | 'expense' | 'sale';
  category: string;
  amount: number;
  description: string;
  date: string;
  status?: 'pending' | 'cleared';
  paymentMethod: string;
  isSimulated?: boolean;
  mode?: SystemExecutionMode;
  referenceId?: string;
  channel?: CommercialChannel;
  deviceId?: string;
}

export interface MarketplaceAppModule {
  id: string;
  name: string;
  category: string;
  version: string;
  publisher: string;
  description: string;
  price: number;
  rating: number;
  installedCount: number;
  isInstalled: boolean;
  isCore: boolean;
  icon: string;
  compatibility: string[];
}

export interface MarketingCampaign {
  id: string;
  title: string;
  platform: 'whatsapp' | 'email' | 'sms' | 'push' | 'instagram';
  targetAudience?: string;
  content?: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'scheduled' | 'sent';
  reach: number;
  conversions: number;
  sentAt: string;
}

export interface Employee {
  id: string;
  tenantId: string;
  name: string;
  role: 'gerente' | 'caixa' | 'cozinheiro' | 'garçom' | 'entregador' | 'atendente';
  cpf: string;
  phone: string;
  salary: number;
  commissionPercent?: number;
  status: 'active' | 'on_leave' | 'fired';
  shift: 'integral' | 'manhã' | 'tarde' | 'noite';
  hireDate: string;
}

export interface ClockEvent {
  id: string;
  employeeId: string;
  employeeName: string;
  timestamp: string;
  type: 'in' | 'out';
}

export interface ExternalOrder {
  id: string;
  orderId?: string;
  source: 'ifood' | 'whatsapp' | 'ubereats' | 'rappi';
  externalId?: string;
  customerName: string;
  total: number;
  status: string;
  items: string[];
  createdAt?: string;
}

export type OperationalSegmentProfileId =
  | 'restaurant'
  | 'retail_electro'
  | 'pharmacy'
  | 'automotive_services';

export interface Appointment {
  id: string;
  tenantId?: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  partySize?: number;
  tableId?: string;
  tableNumber?: number;
  zonePreference?: 'salao' | 'varanda' | 'bar' | 'vip' | 'any';
  occasion?: 'jantar' | 'almoco' | 'aniversario' | 'corporativo' | 'servico';
  channel?: 'storefront' | 'pos' | 'phone' | 'walk_in' | 'whatsapp';
  serviceId?: string;
  serviceName?: string;
  serviceType?: string;
  date: string;
  time: string;
  durationMinutes?: number;
  status: 'pending' | 'confirmed' | 'seated' | 'cancelled' | 'completed' | 'no_show';
  notes?: string;
  staffUids?: string[];
  createdAt?: string;
  isSimulated?: boolean;
  mode?: SystemExecutionMode;
}

export interface MemoNote {
  id: string;
  title: string;
  content: string;
  createdAt?: string;
  updatedAt?: string;
  color?: string;
  category?: string;
  createdByUid?: string;
  tenantId?: string;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf?: string;
  totalOrders?: number;
  totalSpent?: number;
  loyaltyPoints?: number;
  storeCredit?: number;
  tags?: string[];
  lastVisit?: string;
}

export interface Supplier {
  id: string;
  name: string;
  cnpj?: string;
  contactName: string;
  phone: string;
  email: string;
  category: string;
  status?: 'active' | 'inactive';
  deliveryDays?: string[];
}

export interface ServicePart {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
}

export interface ServiceOrder {
  id: string;
  osNumber?: string;
  customerId?: string;
  customerName: string;
  clientName?: string;
  equipment?: string;
  vehicleInfo?: string;
  description: string;
  technician?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent' | 'Normal' | 'Crítico';
  estimatedPrice?: number;
  finalPrice?: number;
  price?: number;
  laborPrice?: number;
  parts?: ServicePart[];
  progressPercent?: number;
  status: 'draft' | 'open' | 'parts_pending' | 'in_progress' | 'ready' | 'delivered' | 'triagem' | 'execucao' | 'finalizado';
  createdAt?: string;
  finishedAt?: string;
}

export interface Promotion {
  id: string;
  tenantId?: string;
  name?: string;
  title?: string;
  description?: string;
  type?: 'percent' | 'fixed' | 'bundle' | 'buy_get_free';
  triggerProductIds?: string[];
  discountPercent?: number;
  discountFixed?: number;
  discountValue?: number;
  minQuantity?: number;
  validFrom?: string;
  validUntil?: string;
  isActive: boolean;
}

export interface SocialMessage {
  id: string;
  from?: string;
  sender?: string;
  avatar?: string;
  platform?: 'whatsapp' | 'instagram' | 'ifood';
  unread?: boolean;
  time?: string;
  isMarketing?: boolean;
  text?: string;
  content?: string;
  timestamp?: string;
  type?: 'incoming' | 'outgoing';
  channel?: 'whatsapp' | 'instagram' | 'messenger';
}

export interface SimulationScenarioConfig {
  id: string;
  name: string;
  description: string;
  orderVolume: 'low' | 'medium' | 'high';
  driverBehavior: 'ideal' | 'delayed' | 'random';
  failureRate: number;
}
