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
  driverId?: string;
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
  readonly executionModeRevision = signal(0);

  readonly executionMode = signal<SystemExecutionMode>('real');
  readonly isSimulated = computed(() => this.executionMode() === 'simulation');
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
          const simulatedSession: UserSession = {
            ...parsed,
            tenantId: parsed.role === 'hq_admin' ? 'hq' : 'tenant-1',
            tenantName: parsed.role === 'hq_admin' ? '3EATCRU HQ Central' : 'Burger & Co Gourmet',
            token: 'simulated-token'
          };
          this.currentSession.set(simulatedSession);
          this.token.set('simulated-token');
          this.updateExecutionMode('simulation');
          this.authInitialized.set(true);
          sessionStorage.setItem('3eatcru_simulated_session', JSON.stringify(simulatedSession));
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
        this.updateExecutionMode('real');
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
    tenantId = simulatedRole === 'hq_admin' ? 'hq' : 'tenant-1',
    tenantName = simulatedRole === 'hq_admin' ? '3EATCRU HQ Central' : 'Burger & Co Gourmet'
  ) {
    this.updateExecutionMode(mode);
    if (mode === 'simulation') {
      this.setSimulatedSession(
        simulatedRole,
        `simulacao.${simulatedRole}@3eatcru.local`,
        `Usuário Simulado (${simulatedRole})`,
        tenantId,
        tenantName
      );
    } else {
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

  async setExecutionModeAndWait(
    mode: SystemExecutionMode,
    simulatedRole: AppRole = 'tenant_owner',
    tenantId = simulatedRole === 'hq_admin' ? 'hq' : 'tenant-1',
    tenantName = simulatedRole === 'hq_admin' ? '3EATCRU HQ Central' : 'Burger & Co Gourmet'
  ): Promise<UserSession | null> {
    if (mode === 'simulation') {
      this.setExecutionMode(mode, simulatedRole, tenantId, tenantName);
      return this.currentSession();
    }

    this.updateExecutionMode('real');
    if (this.isBrowser) {
      try {
        sessionStorage.removeItem('3eatcru_simulated_session');
      } catch {
        // ignore
      }
    }
    this.clearSession();

    const user = this.firebase.currentUser();
    if (!user) {
      this.authInitialized.set(true);
      return null;
    }
    return this.updateSessionFromFirebaseUser(user, true);
  }

  toggleExecutionMode() {
    const next = this.executionMode() === 'real' ? 'simulation' : 'real';
    const session = this.currentSession();
    if (next === 'simulation') {
      this.setExecutionMode(next, session?.role ?? 'tenant_owner');
      return;
    }
    this.setExecutionMode(
      next,
      session?.role ?? 'tenant_owner',
      session?.tenantId ?? 'tenant-1',
      session?.tenantName ?? 'Burger & Co Gourmet'
    );
  }

  private updateExecutionMode(mode: SystemExecutionMode) {
    if (this.executionMode() !== mode) {
      this.executionModeRevision.update((revision) => revision + 1);
      this.executionMode.set(mode);
    }
  }

  setSimulatedSession(
    role: AppRole,
    email = 'simulacao@3eatcru.local',
    name = 'Usuário Simulado',
    tenantId?: string,
    tenantName?: string
  ): UserSession {
    const demoTenantId = role === 'hq_admin' ? 'hq' : tenantId || 'tenant-1';
    const demoTenantName = role === 'hq_admin' ? '3EATCRU HQ Central' : tenantName || 'Burger & Co Gourmet';
    const wasSimulation = this.executionMode() === 'simulation';
    const previousSession = this.currentSession();
    this.updateExecutionMode('simulation');
    if (wasSimulation && (
      previousSession?.role !== role ||
      previousSession?.email !== email ||
      previousSession?.tenantId !== tenantId
    )) {
      this.executionModeRevision.update((revision) => revision + 1);
    }

    const session: UserSession = {
      name,
      email,
      role,
      tenantId: demoTenantId,
      tenantName: demoTenantName,
      token: 'simulated-token'
    };

    this.token.set('simulated-token');
    this.currentUid.set(null);
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
    this.updateExecutionMode('real');
    const previousUid = this.currentUid();
    if (previousUid && previousUid !== user.uid) {
      this.executionModeRevision.update((revision) => revision + 1);
    }

    try {
      let idToken = await user.getIdToken(forceRefresh);
      this.token.set(idToken);
      this.currentUid.set(user.uid);

      const idTokenResult = await user.getIdTokenResult(forceRefresh);
      let role = (idTokenResult.claims['role'] as AppRole) || 'consumer';
      let tenantId = idTokenResult.claims['tenantId'] as string | undefined;
      let driverId = idTokenResult.claims['driverId'] as string | undefined;
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
            driverId = serverProfile.driverId || driverId;
            resolvedName = serverProfile.name || resolvedName;
          }
        } catch {
          // Offline fallback relies strictly on cryptographically signed Firebase ID Token claims in memory
        }
      }

      const session: UserSession = {
        id: user.uid,
        name: resolvedName,
        email: user.email || '',
        role,
        tenantId,
        driverId,
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
    if (this.currentUid() !== null || this.currentSession() !== null) {
      this.executionModeRevision.update((revision) => revision + 1);
    }
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
    this.updateExecutionMode('real');
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
