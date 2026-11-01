import { CompanyTenant, ProductItem, POSDevice, LicensePlan, MarketplaceAppModule } from './ecosystem.model';

export const MOCK_TENANTS: CompanyTenant[] = [
  {
    id: 'tenant-1',
    name: 'Burger & Co Gourmet',
    legalName: 'Burger & Co Gastronomia Artesanal S.A.',
    cnpj: '14.882.910/0001-44',
    category: 'restaurant',
    plan: 'Professional',
    status: 'active',
    devicesLimit: 6,
    activeDevicesCount: 4,
    contactEmail: 'gerencia@burgerco.com.br',
    phone: '+55 11 3254-8899',
    createdAt: '2024-11-20',
    address: {
      street: 'Rua Augusta',
      number: '1500',
      neighborhood: 'Consolação',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01304-001',
      complement: 'Salão Térreo e Balcão'
    },
    deliveryRadiusKm: 8,
    serviceFeePercent: 10,
    openingHours: 'Terça a Domingo, das 11:30 às 23:45',
    fichaCode: '#001',
    lat: -23.5578,
    lng: -46.6599,
    rating: 4.9,
    reviewCount: 238,
    tagline: 'Alimentos & Bebidas • Hamburgueria Artesanal & Chopps',
    badgeCategory: 'RESTAURANTES',
    supportsDelivery: true,
    supportsTakeout: true,
    supportsReservation: true,
    isOpen: true,
    estimatedDeliveryMinutes: '30-45 min',
    deliveryFee: 5.0,
    logo: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=200&q=80',
    specialties: ['Smash Burgers', 'Queijo Brie Trufado', 'Batata Rústica', 'Craft Beers'],
    storeSlug: 'burger-co',
    themeColor: 'amber',
    announcementText: '🔥 Especial de Quarta: Combo Burger Artisan + Chopp com 20% OFF!',
    showAnnouncement: true,
    announcementType: 'promo',
    whatsappNumber: '+55 11 98765-4321',
    instagramHandle: '@burgercogourmet',
    aboutText: 'Hamburgueria artesanal de alta gastronomia com cortes nobres selecionados, pães de fermentação natural e chopps artesanais locais.',
    highlightedProductIds: ['prod-1', 'prod-3'],
    minOrderValue: 25.00,
    deliveryFleetType: 'platform',
    driverRateConfig: {
      baseFee: 7.00,
      includedKm: 3.0,
      extraKmFee: 1.50,
      extraStopBonus: 3.00
    }
  },
  {
    id: 'tenant-2',
    name: 'Padaria & Empório Estrela',
    legalName: 'Estrela Bela Vista Panificação e Empório Ltda',
    cnpj: '28.199.412/0001-89',
    category: 'retail',
    plan: 'Enterprise',
    status: 'active',
    devicesLimit: 8,
    activeDevicesCount: 5,
    contactEmail: 'pedidos@padariaestrela.com.br',
    phone: '+55 11 3105-1222',
    createdAt: '2024-08-14',
    address: {
      street: 'Alameda Joaquim Eugênio de Lima',
      number: '680',
      neighborhood: 'Jardins',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01403-000',
      complement: 'Esquina c/ Alameda Santos'
    },
    deliveryRadiusKm: 12,
    serviceFeePercent: 8,
    openingHours: 'Todos os dias, das 06:00 às 22:30',
    fichaCode: '#002',
    lat: -23.5684,
    lng: -46.6492,
    rating: 4.8,
    reviewCount: 312,
    tagline: 'Varejo & Padaria • Fermentação Natural, Frios & Cafés Especiais',
    badgeCategory: 'VAREJO',
    supportsDelivery: true,
    supportsTakeout: true,
    supportsReservation: false,
    isOpen: true,
    estimatedDeliveryMinutes: '25-40 min',
    deliveryFee: 4.5,
    logo: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=200&q=80',
    coverImage: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&w=800&q=80',
    specialties: ['Croissant Amêndoas', 'Pão de Fermentação', 'Café Filtrado', 'Doces Finos'],
    minOrderValue: 15.00,
    deliveryFleetType: 'own'
  }
];

export const MOCK_PRODUCTS: ProductItem[] = [
  {
    id: 'prod-1',
    tenantId: 'tenant-1',
    name: 'Burger Artisan Trufado',
    category: 'Burgers & Grill',
    price: 48.90,
    costPrice: 16.50,
    stock: 45,
    minStock: 10,
    barcode: '7891028300011',
    sku: 'BUR-TRU-01',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
    availableOnline: true,
    description: 'Blend Angus 180g, queijo brie maçaricado, maionese trufada artesanal no pão brioche amanteigado.'
  },
  {
    id: 'prod-2',
    tenantId: 'tenant-1',
    name: 'Batata Rústica com Cheddar e Bacon',
    category: 'Acompanhamentos',
    price: 32.00,
    costPrice: 8.00,
    stock: 60,
    minStock: 15,
    barcode: '7891028300028',
    sku: 'BAT-CHED-02',
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80',
    availableOnline: true,
    description: 'Batatas rústicas temperadas com alecrim, cobertas com cheddar cremoso inglês e bacon crocante.'
  }
];

export const MOCK_DEVICES: POSDevice[] = [
  {
    id: 'dev-1',
    tenantId: 'tenant-1',
    tenantName: 'Burger & Co Gourmet',
    deviceName: 'PDV Principal - Caixa 1',
    type: 'terminal',
    serialNumber: 'SN-3EAT-9981-BR',
    macAddress: 'B4:2E:99:A1:02:11',
    ipAddress: '192.168.1.101',
    osVersion: '3EATCRU OS Pro 4.2.0',
    appVersion: 'v2.8.4',
    status: 'online',
    lastPing: new Date().toISOString(),
    location: 'Salão Principal - Frente de Caixa'
  }
];

export const MOCK_PLANS: LicensePlan[] = [
  {
    id: 'Starter',
    name: 'Starter (Até 2 Dispositivos)',
    priceMonthly: 149.00,
    maxDevices: 2,
    includedModules: ['PDV Frente de Caixa', 'KDS Cozinha'],
    description: 'Ideal para pequenos negócios.'
  }
];

export const MOCK_APPS: MarketplaceAppModule[] = [
  {
    id: 'app-pos',
    name: '3EATCRU PDV Pro',
    category: 'POS & Sales',
    version: 'v3.1.0',
    publisher: '3EATCRU Team',
    description: 'Ponto de Venda ultrarrápido.',
    price: 0,
    rating: 4.9,
    installedCount: 1420,
    isInstalled: true,
    isCore: true,
    icon: 'point_of_sale',
    compatibility: ['restaurant', 'retail']
  }
];
