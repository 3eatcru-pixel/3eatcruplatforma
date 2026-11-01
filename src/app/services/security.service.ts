import { Injectable, signal, inject, PLATFORM_ID, effect, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  AppRole,
  CompanyTenant,
  EcosystemPillar,
  StoreAddress,
  UserSession,
  SystemExecutionMode
} from '../models/ecosystem.model';
import { Router, NavigationEnd } from '@angular/router';
import { FirebaseService } from '../core/firebase/firebase.service';
import { User } from 'firebase/auth';

interface AuthMeResponse {
  id: string;
  email: string;
  emailVerified: boolean;
  role: AppRole;
  tenantId?: string;
  name?: string;
  claimsUpdated?: boolean;
}

interface RegisterMerchantResponse {
  tenant: CompanyTenant;
  role: AppRole;
  tenantId: string;
  claimsUpdated: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SecurityService {
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly firebase = inject(FirebaseService);

  readonly currentSession = signal<UserSession | null>(null);
  readonly token = signal<string | null>(null);
  readonly currentUid = signal<string | null>(null);
  readonly currentPillar = signal<EcosystemPillar>('marketplace');
  readonly authInitialized = signal<boolean>(false);

  readonly executionMode = signal<SystemExecutionMode>('real');
  readonly isSimulated = signal<boolean>(false);
  readonly isRealMode = computed(() => this.executionMode() === 'real');

  setPillar(pillar: EcosystemPillar) {
    this.currentPillar.set(pillar);
  }

  async waitForAuth(): Promise<UserSession | null> {
    if (this.authInitialized()) return this.currentSession();
    
    return new Promise((resolve) => {
      const sub = effect(() => {
        if (this.authInitialized()) {
          sub.destroy();
          resolve(this.currentSession());
        }
      });
    });
  }

  constructor() {
    if (this.isBrowser) {
      localStorage.removeItem('3eatcru_session');
      try {
        const savedSim = sessionStorage.getItem('3eatcru_simulated_session');
        if (savedSim) {
          const parsed = JSON.parse(savedSim) as UserSession;
          this.currentSession.set(parsed);
          this.token.set(parsed.token || 'simulated-token');
          this.isSimulated.set(true);
          this.executionMode.set('simulation');
          this.authInitialized.set(true);
        }
      } catch {
        // ignore parse error
      }

      this.syncPillarFromUrl(window.location.pathname);
    }

    // Auto-detect and keep currentPillar synchronized with router navigation
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.syncPillarFromUrl(event.urlAfterRedirects || event.url);
      }
    });

    effect(() => {
      const user = this.firebase.currentUser();
      if (user) {
        this.isSimulated.set(false);
        this.executionMode.set('real');
        if (this.isBrowser) sessionStorage.removeItem('3eatcru_simulated_session');
        this.updateSessionFromFirebaseUser(user);
      } else if (!this.firebase.authLoading()) {
        if (!this.isSimulated()) {
          this.clearSession();
        }
        this.authInitialized.set(true);
      }
    });
  }

  syncPillarFromUrl(url: string) {
    if (url.startsWith('/hq') || url.startsWith('/admin')) {
      this.currentPillar.set('hq');
    } else if (url.startsWith('/os') || url.startsWith('/pos') || url.startsWith('/pdv')) {
      this.currentPillar.set('os');
    } else if (url.startsWith('/p/')) {
      this.currentPillar.set('storefront');
    } else if (url.startsWith('/waiter')) {
      this.currentPillar.set('waiter');
    } else if (url.startsWith('/driver')) {
      this.currentPillar.set('driver');
    } else if (url.startsWith('/home') || url.startsWith('/marketplace') || url.startsWith('/seja-parceiro') || url.startsWith('/consumer')) {
      this.currentPillar.set('marketplace');
    }
  }

  setExecutionMode(
    mode: SystemExecutionMode,
    simulatedRole: AppRole = 'tenant_owner',
    tenantId = 'tenant-sp-001',
    tenantName = 'Burger & Co. Jardins'
  ) {
    this.executionMode.set(mode);
    if (mode === 'simulation') {
      this.setSimulatedSession(
        simulatedRole,
        `simulacao.${simulatedRole}@3eatcru.local`,
        `Usuário Simulado (${simulatedRole})`,
        tenantId,
        tenantName
      );
    } else {
      this.isSimulated.set(false);
      if (this.isBrowser) {
        try {
          sessionStorage.removeItem('3eatcru_simulated_session');
        } catch {
          // ignore
        }
      }
      const user = this.firebase.currentUser();
      if (user) {
        this.updateSessionFromFirebaseUser(user, true);
      } else {
        this.clearSession();
      }
    }
  }

  toggleExecutionMode() {
    const next = this.executionMode() === 'real' ? 'simulation' : 'real';
    this.setExecutionMode(next);
  }

  setSimulatedSession(
    role: AppRole,
    email = 'simulacao@3eatcru.local',
    name = 'Usuário Simulado',
    tenantId?: string,
    tenantName?: string
  ): UserSession {
    const session: UserSession = {
      name,
      email,
      role,
      tenantId,
      tenantName: tenantName || (tenantId ? `Estabelecimento ${tenantId}` : '3EATCRU HQ Central'),
      token: 'simulated-token'
    };

    this.isSimulated.set(true);
    this.token.set('simulated-token');
    this.currentSession.set(session);
    this.authInitialized.set(true);

    if (this.isBrowser) {
      try {
        sessionStorage.setItem('3eatcru_simulated_session', JSON.stringify(session));
      } catch {
        // ignore
      }
    }

    return session;
  }

  async updateSessionFromFirebaseUser(user: User, forceRefresh = false): Promise<UserSession | null> {
    try {
      let idToken = await user.getIdToken(forceRefresh);
      this.token.set(idToken);
      this.currentUid.set(user.uid);

      const idTokenResult = await user.getIdTokenResult(forceRefresh);
      let role = (idTokenResult.claims['role'] as AppRole) || 'consumer';
      let tenantId = idTokenResult.claims['tenantId'] as string | undefined;
      let resolvedName = user.displayName || user.email?.split('@')[0] || 'Usuário';

      if (this.isBrowser) {
        try {
          const resp = await fetch('/api/auth/me', {
            headers: { 
              'Authorization': `Bearer ${idToken}`,
              'X-3eatcru-Pillar': this.currentPillar()
            }
          });
          if (resp.ok) {
            const serverProfile = (await resp.json()) as AuthMeResponse;
            if (serverProfile.claimsUpdated) {
              idToken = await user.getIdToken(true);
              this.token.set(idToken);
            }
            role = serverProfile.role || role;
            tenantId = serverProfile.tenantId || tenantId;
            resolvedName = serverProfile.name || resolvedName;
          }
        } catch {
          // Offline fallback relies strictly on cryptographically signed Firebase ID Token claims in memory
        }
      }

      const session: UserSession = {
        name: resolvedName,
        email: user.email || '',
        role,
        tenantId,
        tenantName: tenantId ? `Estabelecimento ${tenantId}` : 'Marketplace',
        token: idToken
      };

      this.currentSession.set(session);
      this.authInitialized.set(true);
      return session;
    } catch (err) {
      console.error('Error updating session:', err);
      this.clearSession();
      return null;
    }
  }

  private clearSession() {
    this.token.set(null);
    this.currentUid.set(null);
    this.currentSession.set(null);
  }

  async loginWithGoogle(): Promise<UserSession | null> {
    const user = await this.firebase.loginWithGoogle();
    if (!user) return null;
    return this.updateSessionFromFirebaseUser(user, true);
  }

  async registerMerchant(payload: {
    storeName: string;
    legalName?: string;
    cnpj: string;
    phone: string;
    address: StoreAddress;
    category?: CompanyTenant['category'];
  }): Promise<RegisterMerchantResponse> {
    const user = this.firebase.auth?.currentUser;
    if (!user) {
      throw new Error('Autenticação Google obrigatória antes de registrar loja.');
    }
    const idToken = await user.getIdToken();
    const resp = await fetch('/api/auth/register-merchant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const errBody = await resp.json().catch(() => ({}));
      throw new Error(errBody.error || 'Falha ao provisionar estabelecimento.');
    }

    const result = (await resp.json()) as RegisterMerchantResponse;
    await this.updateSessionFromFirebaseUser(user, true);
    return result;
  }

  async logout() {
    this.isSimulated.set(false);
    if (this.isBrowser) {
      try {
        sessionStorage.removeItem('3eatcru_simulated_session');
      } catch {
        // ignore
      }
    }
    await this.firebase.logout();
    this.clearSession();
    this.router.navigate(['/']);
  }

  isHqAdmin(): boolean {
    const session = this.currentSession();
    return session?.role === 'hq_admin' && this.currentPillar() === 'hq';
  }

  isOperator(): boolean {
    const role = this.currentSession()?.role;
    const pillar = this.currentPillar();
    return pillar === 'os' && (role === 'tenant_owner' || role === 'operator');
  }

  isStoreStaff(): boolean {
    const role = this.currentSession()?.role;
    const pillar = this.currentPillar();
    
    // STRICT PILLAR GUARD: Only allow staff roles within the Store OS pillar
    if (pillar !== 'os') return false;

    return (
      role === 'tenant_owner' ||
      role === 'operator' ||
      role === 'waiter' ||
      role === 'hq_admin'
    );
  }
}
