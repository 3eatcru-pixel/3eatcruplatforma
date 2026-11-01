import { afterNextRender, Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { FirebaseApp } from 'firebase/app';
import type { Auth, User } from 'firebase/auth';
import type { Firestore, Unsubscribe } from 'firebase/firestore';
import firebaseConfig from '../../../../firebase-applet-config.json';
import {
  OrderTransaction,
  DeliveryRoute,
  PublicCatalogProduct
} from '../../models/ecosystem.model';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private readonly platformId = inject(PLATFORM_ID);
  public readonly isBrowser = isPlatformBrowser(this.platformId);

  public app: FirebaseApp | null = null;
  public db: Firestore | null = null;
  public auth: Auth | null = null;

  public readonly isConnected = signal<boolean>(false);
  public readonly isInitialized = signal<boolean>(false);
  public readonly currentUser = signal<User | null>(null);
  public readonly authLoading = signal<boolean>(true);
  public readonly lastError = signal<string | null>(null);
  private authSdk: typeof import('firebase/auth') | null = null;
  private firebaseInitPromise: Promise<void> | null = null;
  private firestoreInitPromise: Promise<{
    sdk: typeof import('firebase/firestore');
    db: Firestore;
  }> | null = null;

  constructor() {
    if (this.isBrowser) {
      afterNextRender(() => {
        void this.initFirebase();
      });
    } else {
      this.authLoading.set(false);
    }
  }

  private initFirebase(): Promise<void> {
    if (this.firebaseInitPromise) return this.firebaseInitPromise;
    if (!this.isBrowser) {
      this.authLoading.set(false);
      return Promise.resolve();
    }

    this.firebaseInitPromise = Promise.all([
      import('firebase/app'),
      import('firebase/auth')
    ]).then(([appSdk, authSdk]) => {
      this.authSdk = authSdk;
      this.app = appSdk.initializeApp(firebaseConfig);
      this.auth = authSdk.getAuth(this.app);
      this.isInitialized.set(true);

      authSdk.onAuthStateChanged(this.auth, (user) => {
        this.currentUser.set(user);
        this.authLoading.set(false);
      });
    }).catch((err: unknown) => {
      console.error('Firebase init failed:', err);
      this.authLoading.set(false);
    });

    return this.firebaseInitPromise;
  }

  private initFirestore(): Promise<{
    sdk: typeof import('firebase/firestore');
    db: Firestore;
  }> {
    if (this.firestoreInitPromise) return this.firestoreInitPromise;

    this.firestoreInitPromise = this.initFirebase()
      .then(async () => {
        const app = this.app;
        if (!app) throw new Error('Firebase app is unavailable.');
        const sdk = await import('firebase/firestore');
        this.db = sdk.getFirestore(app, firebaseConfig.firestoreDatabaseId);
        return { sdk, db: this.db };
      })
      .catch((error: unknown) => {
        this.firestoreInitPromise = null;
        throw error;
      });

    return this.firestoreInitPromise;
  }

  private listenWhenFirestoreReady(
    operationType: OperationType,
    path: string,
    createListener: (sdk: typeof import('firebase/firestore'), db: Firestore) => Unsubscribe
  ): Unsubscribe | null {
    if (!this.isBrowser) return null;

    let cancelled = false;
    let unsubscribe: Unsubscribe | null = null;

    void this.initFirestore()
      .then(({ sdk, db }) => {
        if (cancelled) return;
        try {
          unsubscribe = createListener(sdk, db);
        } catch (error: unknown) {
          try {
            this.handleFirestoreError(error, operationType, path);
          } catch {
            // The listener error has already been recorded and logged.
          }
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        try {
          this.handleFirestoreError(error, operationType, path);
        } catch {
          // The initialization error has already been recorded and logged.
        }
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }

  public async testConnection(): Promise<void> {
    if (!this.isBrowser) return;
    try {
      const { sdk, db } = await this.initFirestore();
      await sdk.getDocFromServer(sdk.doc(db, 'public_regional', 'default'));
      this.isConnected.set(true);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.error('Please check your Firebase configuration: client is offline.');
        this.isConnected.set(false);
      } else {
        this.isConnected.set(true);
      }
    }
  }

  public handleFirestoreError(
    error: unknown,
    operationType: OperationType,
    path: string | null
  ): never {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: this.auth?.currentUser?.uid,
        email: this.auth?.currentUser?.email,
        emailVerified: this.auth?.currentUser?.emailVerified,
        isAnonymous: this.auth?.currentUser?.isAnonymous,
        tenantId: this.auth?.currentUser?.tenantId,
        providerInfo:
          this.auth?.currentUser?.providerData?.map((provider) => ({
            providerId: provider.providerId,
            email: provider.email
          })) || []
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    this.lastError.set(errInfo.error);
    throw new Error(JSON.stringify(errInfo));
  }

  public async loginWithGoogle(): Promise<User | null> {
    await this.initFirebase();
    if (!this.auth) return null;
    try {
      const provider = new this.authSdk!.GoogleAuthProvider();
      const credential = await this.authSdk!.signInWithPopup(this.auth, provider);
      this.currentUser.set(credential.user);
      return credential.user;
    } catch (err: unknown) {
      console.error('Login error:', err);
      throw err;
    }
  }

  public async logout(): Promise<void> {
    await this.initFirebase();
    if (!this.auth) return;
    try {
      await this.authSdk!.signOut(this.auth);
      this.currentUser.set(null);
    } catch (err: unknown) {
      console.error('Logout error:', err);
    }
  }

  /**
   * Read-only realtime listener for Store Staff orders (`staffUids` array-contains + `tenantId`).
   * All writes pass exclusively through Express `/api/orders` -> CommerceEngine.
   */
  public listenTenantOrders(
    tenantId: string,
    staffUid: string,
    onUpdate: (orders: OrderTransaction[]) => void
  ): Unsubscribe | null {
    if (!tenantId || !staffUid || !this.auth?.currentUser) return null;
    const path = 'orders';
    return this.listenWhenFirestoreReady(OperationType.LIST, path, (firestoreSdk, db) => {
      const q = firestoreSdk.query(
        firestoreSdk.collection(db, path),
        firestoreSdk.where('tenantId', '==', tenantId),
        firestoreSdk.where('staffUids', 'array-contains', staffUid)
      );
      return firestoreSdk.onSnapshot(
        q,
        (snapshot) => {
          onUpdate(snapshot.docs.map((d) => d.data() as OrderTransaction));
        },
        (error) => {
          this.handleFirestoreError(error, OperationType.LIST, path);
        }
      );
    });
  }

  /**
   * Read-only realtime listener for Consumer's own orders (`customerId == uid`).
   */
  public listenConsumerOrders(
    customerUid: string,
    onUpdate: (orders: OrderTransaction[]) => void
  ): Unsubscribe | null {
    if (!customerUid || !this.auth?.currentUser) return null;
    const path = 'orders';
    return this.listenWhenFirestoreReady(OperationType.LIST, path, (firestoreSdk, db) => {
      const q = firestoreSdk.query(
        firestoreSdk.collection(db, path),
        firestoreSdk.where('customerId', '==', customerUid)
      );
      return firestoreSdk.onSnapshot(
        q,
        (snapshot) => {
          onUpdate(snapshot.docs.map((d) => d.data() as OrderTransaction));
        },
        (error) => {
          this.handleFirestoreError(error, OperationType.LIST, path);
        }
      );
    });
  }

  /**
   * Read-only realtime listener for Delivery Routes scoped by staffUid or driverId.
   */
  public listenDeliveryRoutes(
    options: { tenantId?: string; staffUid?: string; driverId?: string },
    onUpdate: (routes: DeliveryRoute[]) => void
  ): Unsubscribe | null {
    if (!this.auth?.currentUser || (!options.driverId && !(options.tenantId && options.staffUid))) return null;
    const path = 'delivery_routes';
    return this.listenWhenFirestoreReady(OperationType.LIST, path, (firestoreSdk, db) => {
      let q;
      if (options.driverId) {
        q = firestoreSdk.query(
          firestoreSdk.collection(db, path),
          firestoreSdk.where('driverId', '==', options.driverId)
        );
      } else if (options.tenantId && options.staffUid) {
        q = firestoreSdk.query(
          firestoreSdk.collection(db, path),
          firestoreSdk.where('tenantId', '==', options.tenantId),
          firestoreSdk.where('staffUids', 'array-contains', options.staffUid)
        );
      } else {
        throw new Error('Delivery route listener requires a driver or tenant scope.');
      }

      return firestoreSdk.onSnapshot(
        q,
        (snapshot) => {
          onUpdate(snapshot.docs.map((d) => d.data() as DeliveryRoute));
        },
        (error) => {
          this.handleFirestoreError(error, OperationType.LIST, path);
        }
      );
    });
  }

  /**
   * Read-only realtime listener for Store Tables scoped to authorized staff.
   */
  public listenTables(
    tenantId: string,
    staffUid: string,
    onUpdate: (tables: Record<string, unknown>[]) => void
  ): Unsubscribe | null {
    if (!tenantId || !staffUid || !this.auth?.currentUser) return null;
    const path = 'tables';
    return this.listenWhenFirestoreReady(OperationType.LIST, path, (firestoreSdk, db) => {
      const q = firestoreSdk.query(
        firestoreSdk.collection(db, path),
        firestoreSdk.where('tenantId', '==', tenantId),
        firestoreSdk.where('staffUids', 'array-contains', staffUid)
      );
      return firestoreSdk.onSnapshot(
        q,
        (snapshot) => {
          onUpdate(snapshot.docs.map((d) => d.data()));
        },
        (error) => {
          this.handleFirestoreError(error, OperationType.LIST, path);
        }
      );
    });
  }

  /**
   * Read-only public Marketplace catalog listener (`/public_catalog`).
   */
  public listenPublicCatalog(
    tenantId: string,
    onUpdate: (items: PublicCatalogProduct[]) => void
  ): Unsubscribe | null {
    if (!tenantId) return null;
    const path = 'public_catalog';
    return this.listenWhenFirestoreReady(OperationType.LIST, path, (firestoreSdk, db) => {
      const q = firestoreSdk.query(
        firestoreSdk.collection(db, path),
        firestoreSdk.where('tenantId', '==', tenantId),
        firestoreSdk.where('availableOnline', '==', true)
      );
      return firestoreSdk.onSnapshot(
        q,
        (snapshot) => {
          onUpdate(snapshot.docs.map((d) => d.data() as PublicCatalogProduct));
        },
        (error) => {
          this.handleFirestoreError(error, OperationType.LIST, path);
        }
      );
    });
  }
}
