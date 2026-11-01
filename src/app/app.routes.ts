import { Routes } from '@angular/router';
import { hqAdminGuard, storeOperatorGuard } from './guards/auth.guard';

export const routes: Routes = [
  // 1. Entrada Direta: Redireciona imediatamente a raiz (/) para o Portal do Consumidor (/home)
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { 
    path: 'home', 
    loadComponent: () => import('./components/regional-marketplace').then(m => m.RegionalMarketplaceComponent) 
  },
  { path: 'marketplace', redirectTo: 'home', pathMatch: 'full' },
  { path: 'regional', redirectTo: 'home', pathMatch: 'full' },

  // 2. Autenticação & Perfil do Consumidor Final (Banco de Consumidores)
  { 
    path: 'consumer/login', 
    loadComponent: () => import('./components/auth/consumer-auth').then(m => m.ConsumerAuthComponent) 
  },
  { path: 'minha-conta', redirectTo: 'consumer/login', pathMatch: 'full' },

  // 3. Apresentação Comercial e Portal do Lojista (Banco de Tenants / Lojas)
  { 
    path: 'seja-parceiro', 
    loadComponent: () => import('./components/landing-page').then(m => m.LandingPageComponent) 
  },
  { path: 'para-lojistas', redirectTo: 'seja-parceiro', pathMatch: 'full' },
  { 
    path: 'os/login', 
    loadComponent: () => import('./components/auth/merchant-auth').then(m => m.MerchantAuthComponent) 
  },
  { 
    path: 'os', 
    loadComponent: () => import('./components/client-os').then(m => m.ClientOsComponent),
    canActivate: [storeOperatorGuard] 
  },
  { 
    path: 'pos', 
    loadComponent: () => import('./components/pos-terminal').then(m => m.PosTerminalComponent),
    canActivate: [storeOperatorGuard] 
  },
  { path: 'pdv', redirectTo: 'pos', pathMatch: 'full' },

  // 4. Portal e Gabinete de Governança do Dono da Plataforma (HQ Central - Banco Mestre)
  { 
    path: 'hq/login', 
    loadComponent: () => import('./components/auth/hq-auth').then(m => m.HqAuthComponent) 
  },
  { path: 'admin/login', redirectTo: 'hq/login', pathMatch: 'full' },
  { 
    path: 'hq', 
    loadComponent: () => import('./components/hq-central').then(m => m.HQCentralComponent),
    canActivate: [hqAdminGuard] 
  },

  // 6. Apps Móveis Auxiliares Nativos
  { 
    path: 'driver', 
    loadComponent: () => import('./components/driver-app').then(m => m.DriverAppComponent) 
  },
  { 
    path: 'waiter', 
    loadComponent: () => import('./components/waiter-app').then(m => m.WaiterAppComponent) 
  },

  // 7. Vitrine Pública Individual do Estabelecimento
  { 
    path: 'p/:id', 
    loadComponent: () => import('./components/customer-storefront').then(m => m.CustomerStorefrontComponent) 
  },

  // 8. Rota Curinga: Redireciona para o Portal do Consumidor (/home)
  { path: '**', redirectTo: 'home' }
];
