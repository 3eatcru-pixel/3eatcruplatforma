import { OSAppId, OSAppDefinition } from '../../models/os.model';

/**
 * Registro Canônico de eApps (Embedded Apps) do Store OS.
 * DESIGN PRINCIPLE: Todos os módulos internos são prefixados ou identificados como eApp
 * para diferenciação clara dos Apps Externos/Móveis.
 */
export const OS_APPS_REGISTRY: Record<OSAppId, OSAppDefinition> = {
  pos: { label: 'eApp PDV Caixa', title: 'eApp: PDV - Frente de Caixa', icon: 'point_of_sale', colorClass: 'from-amber-500 via-orange-600 to-amber-700' },
  tables: { label: 'eApp Mesas & Salão', title: 'eApp: Mesas & Salão', icon: 'table_restaurant', colorClass: 'from-amber-600 to-amber-800' },
  kds: { label: 'eApp KDS Cozinha', title: 'eApp: KDS Cozinha', icon: 'soup_kitchen', colorClass: 'from-emerald-600 to-emerald-800' },
  inventory: { label: 'eApp Estoque ERP', title: 'eApp: Estoque ERP', icon: 'inventory_2', colorClass: 'from-amber-500 to-amber-700' },
  finance: { label: 'eApp Caixa & Finanças', title: 'eApp: Financeiro & Caixa', icon: 'account_balance_wallet', colorClass: 'from-emerald-500 to-teal-700' },
  suppliers: { label: 'eApp Fornecedores', title: 'eApp: Gestão de Fornecedores & Compras', icon: 'local_shipping', colorClass: 'from-amber-600 via-orange-600 to-amber-800' },
  reconciliation: { label: 'eApp Reconciliação', title: 'eApp: Reconciliação Financeira & Adquirentes', icon: 'swap_horiz', colorClass: 'from-emerald-600 to-teal-800' },
  'stock-audit': { label: 'eApp Inventário Cego', title: 'eApp: Auditoria de Estoque & Contagem Cega', icon: 'fact_check', colorClass: 'from-amber-500 to-orange-700' },
  'store-manager': { label: 'eApp Minha Loja', title: 'eApp: Gerenciador da Loja Pública', icon: 'storefront', colorClass: 'from-amber-400 via-orange-500 to-amber-600' },
  whatsapp: { label: 'eApp WhatsApp', title: 'eApp: WhatsApp Business', icon: 'chat', colorClass: 'from-emerald-600 to-emerald-800' },
  'delivery-marketplaces': { label: 'eApp Delivery de Terceiros', title: 'eApp: Pedidos de Marketplaces', icon: 'delivery_dining', colorClass: 'from-sky-500 via-cyan-600 to-indigo-700' },
  instagram: { label: 'eApp Instagram', title: 'eApp: Instagram Business', icon: 'camera_alt', colorClass: 'from-amber-600 via-rose-700 to-amber-800' },
  tasks: { label: 'eApp Tarefas OS', title: 'eApp: Tarefas OS', icon: 'task_alt', colorClass: 'from-rose-600 to-rose-800' },
  calendar: { label: 'eApp Calendário', title: 'eApp: Calendário & Agenda Operacional', icon: 'calendar_month', colorClass: 'from-amber-500 to-orange-600' },
  agenda: { label: 'eApp Reservas', title: 'eApp: Reservas de Mesa & Fila de Espera', icon: 'event_seat', colorClass: 'from-amber-500 to-orange-600' },
  services: { label: 'eApp Serviços & O.S.', title: 'eApp: Ordens de Serviço', icon: 'handyman', colorClass: 'from-amber-600 to-amber-800' },
  rh: { label: 'eApp RH & Pessoal', title: 'eApp: RH & Gestão de Pessoal', icon: 'badge', colorClass: 'from-amber-600 via-orange-600 to-amber-800' },
  drivers: { label: 'eApp Hub Logística', title: 'eApp: Hub de Logística & Dispatcher', icon: 'alt_route', colorClass: 'from-emerald-500 via-teal-600 to-emerald-800' },
  history: { label: 'eApp Histórico', title: 'eApp: Histórico de Vendas', icon: 'history', colorClass: 'from-indigo-500 to-indigo-700' },
  reports: { label: 'eApp Relatórios', title: 'eApp: Inteligência & KPIs', icon: 'analytics', colorClass: 'from-indigo-600 to-indigo-800' },
  crm: { label: 'eApp Fidelidade', title: 'eApp: Fidelidade & CRM', icon: 'loyalty', colorClass: 'from-indigo-400 to-indigo-600' },
  docs: { label: 'eApp Manual & Specs', title: 'eApp: Manual & Specs 3EAT', icon: 'menu_book', colorClass: 'from-amber-500 to-amber-700' },
  'google-drive': { label: 'eApp Google Drive', title: 'eApp: Google Drive Store Cloud', icon: 'cloud_queue', colorClass: 'from-amber-500 via-emerald-600 to-blue-600' },
  calculator: { label: 'eApp Calculadora', title: 'eApp: Calculadora', icon: 'calculate', colorClass: 'from-stone-600 to-stone-800' },
  notes: { label: 'eApp Notas', title: 'eApp: Notas & Memos', icon: 'description', colorClass: 'from-amber-400 to-amber-600' },
  'admin-hub': { label: 'eApp Diretoria', title: 'eApp: Diretoria da Loja Cadastrada', icon: 'admin_panel_settings', imageUrl: '/src/assets/images/gabinete_dono_icon_1793220878436.jpg', colorClass: 'from-rose-600 via-amber-600 to-amber-800' },
  appstore: { label: 'eApp Store', title: 'eApp Store', icon: 'local_mall', colorClass: 'from-amber-600 to-amber-800' },
  browser: { label: 'eApp Navegador', title: 'eApp: Navegador Web', icon: 'public', colorClass: 'from-amber-600 to-amber-800' },
  settings: { label: 'eApp Configurações', title: 'eApp: Painel de Controle', icon: 'settings', colorClass: 'from-stone-700 to-stone-900' },
  system: { label: 'eApp Este PC', title: 'eApp: Este Computador', icon: 'folder', colorClass: 'from-amber-700 to-amber-900' },
  'waiter-sim': { label: 'SIM: App Garçom', title: 'Simulador: App Garçom (Android)', icon: 'restaurant_menu', colorClass: 'from-amber-500 to-amber-700' },
  'driver-sim': { label: 'SIM: App Motorista', title: 'Simulador: App Motorista (Android)', icon: 'local_shipping', colorClass: 'from-emerald-600 to-emerald-800' },
  'consumer-sim': { label: 'SIM: Marketplace', title: 'Simulador: App Consumidor (Marketplace)', icon: 'shopping_bag', colorClass: 'from-amber-600 via-rose-700 to-amber-800' }
};
