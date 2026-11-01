import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  Auth,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  doc,
  getDocFromServer,
  collection,
  query,
  where,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
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

  constructor() {
    if (this.isBrowser) {
      this.initFirebase();
    } else {
      this.authLoading.set(false);
    }
  }

  private initFirebase(): void {
    try {
      this.app = initializeApp(firebaseConfig);
      this.db = getFirestore(this.app, firebaseConfig.firestoreDatabaseId);
      this.auth = getAuth(this.app);

      this.isInitialized.set(true);
      this.testConnection();

      onAuthStateChanged(this.auth, (user) => {
        this.currentUser.set(user);
        this.authLoading.set(false);
      });
    } catch (err) {
      console.error('Firebase init failed:', err);
      this.authLoading.set(false);
    }
  }

  public async testConnection(): Promise<void> {
    if (!this.db) return;
    try {
      await getDocFromServer(doc(this.db, 'public_regional', 'default'));
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
    if (!this.auth) return null;
    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(this.auth, provider);
      this.currentUser.set(credential.user);
      return credential.user;
    } catch (err: unknown) {
      console.error('Login error:', err);
      throw err;
    }
  }

  public async logout(): Promise<void> {
    if (!this.auth) return;
    try {
      await signOut(this.auth);
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
    if (!this.db || !tenantId || !staffUid || !this.auth?.currentUser) return null;
    const path = 'orders';
    try {
      const q = query(
        collection(this.db, path),
        where('tenantId', '==', tenantId),
        where('staffUids', 'array-contains', staffUid)
      );
      return onSnapshot(
        q,
        (snapshot) => {
          onUpdate(snapshot.docs.map((d) => d.data() as OrderTransaction));
        },
        (error) => {
          this.handleFirestoreError(error, OperationType.LIST, path);
        }
      );
    } catch (error: unknown) {
      this.handleFirestoreError(error, OperationType.LIST, path);
    }
  }

  /**
   * Read-only realtime listener for Consumer's own orders (`customerId == uid`).
   */
  public listenConsumerOrders(
    customerUid: string,
    onUpdate: (orders: OrderTransaction[]) => void
  ): Unsubscribe | null {
    if (!this.db || !customerUid || !this.auth?.currentUser) return null;
    const path = 'orders';
    try {
      const q = query(collection(this.db, path), where('customerId', '==', customerUid));
      return onSnapshot(
        q,
        (snapshot) => {
          onUpdate(snapshot.docs.map((d) => d.data() as OrderTransaction));
        },
        (error) => {
          this.handleFirestoreError(error, OperationType.LIST, path);
        }
      );
    } catch (error: unknown) {
      this.handleFirestoreError(error, OperationType.LIST, path);
    }
  }

  /**
   * Read-only realtime listener for Delivery Routes scoped by staffUid or driverId.
   */
  public listenDeliveryRoutes(
    options: { tenantId?: string; staffUid?: string; driverId?: string },
    onUpdate: (routes: DeliveryRoute[]) => void
  ): Unsubscribe | null {
    if (!this.db || !this.auth?.currentUser) return null;
    const path = 'delivery_routes';
    try {
      let q;
      if (options.driverId) {
        q = query(collection(this.db, path), where('driverId', '==', options.driverId));
      } else if (options.tenantId && options.staffUid) {
        q = query(
          collection(this.db, path),
          where('tenantId', '==', options.tenantId),
          where('staffUids', 'array-contains', options.staffUid)
        );
      } else {
        return null;
      }

      return onSnapshot(
        q,
        (snapshot) => {
          onUpdate(snapshot.docs.map((d) => d.data() as DeliveryRoute));
        },
        (error) => {
          this.handleFirestoreError(error, OperationType.LIST, path);
        }
      );
    } catch (error: unknown) {
      this.handleFirestoreError(error, OperationType.LIST, path);
    }
  }

  /**
   * Read-only realtime listener for Store Tables scoped to authorized staff.
   */
  public listenTables(
    tenantId: string,
    staffUid: string,
    onUpdate: (tables: Record<string, unknown>[]) => void
  ): Unsubscribe | null {
    if (!this.db || !tenantId || !staffUid || !this.auth?.currentUser) return null;
    const path = 'tables';
    try {
      const q = query(
        collection(this.db, path),
        where('tenantId', '==', tenantId),
        where('staffUids', 'array-contains', staffUid)
      );
      return onSnapshot(
        q,
        (snapshot) => {
          onUpdate(snapshot.docs.map((d) => d.data()));
        },
        (error) => {
          this.handleFirestoreError(error, OperationType.LIST, path);
        }
      );
    } catch (error: unknown) {
      this.handleFirestoreError(error, OperationType.LIST, path);
    }
  }

  /**
   * Read-only public Marketplace catalog listener (`/public_catalog`).
   */
  public listenPublicCatalog(
    tenantId: string,
    onUpdate: (items: PublicCatalogProduct[]) => void
  ): Unsubscribe | null {
    if (!this.db || !tenantId) return null;
    const path = 'public_catalog';
    try {
      const q = query(
        collection(this.db, path),
        where('tenantId', '==', tenantId),
        where('availableOnline', '==', true)
      );
      return onSnapshot(
        q,
        (snapshot) => {
          onUpdate(snapshot.docs.map((d) => d.data() as PublicCatalogProduct));
        },
        (error) => {
          this.handleFirestoreError(error, OperationType.LIST, path);
        }
      );
    } catch (error: unknown) {
      this.handleFirestoreError(error, OperationType.LIST, path);
    }
  }
}
