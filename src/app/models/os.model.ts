export type OSAppId = 
  | 'pos' | 'tables' | 'kds' | 'inventory' | 'finance' | 'appstore' 
  | 'browser' | 'settings' | 'system' | 'tasks' | 'whatsapp' | 'instagram' 
  | 'ifood' | 'agenda' | 'calculator' | 'notes' | 'services' | 'docs' 
  | 'reports' | 'history' | 'crm' | 'store-manager' | 'rh' | 'drivers' | 'admin-hub' | 'calendar'
  | 'suppliers' | 'reconciliation' | 'stock-audit' | 'google-drive' | 'waiter-sim' | 'driver-sim' | 'consumer-sim';

export interface OSWindow {
  id: OSAppId;
  title: string;
  icon: string;
  isMinimized: boolean;
  isMaximized: boolean;
  dockPosition?: 'left' | 'right' | 'full';
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

export interface OSAppDefinition {
  label: string;
  title: string;
  icon: string;
  colorClass: string;
  imageUrl?: string;
}

};
