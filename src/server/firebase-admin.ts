import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let cachedApp: App | null = null;
let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;

let testDbOverride: Firestore | null = null;
let testAuthOverride: Auth | null = null;

export function __setFirebaseAdminTestOverrides(
  overrides: { db?: unknown; auth?: unknown } | null
): void {
  testDbOverride = (overrides?.db as Firestore) ?? null;
  testAuthOverride = (overrides?.auth as Auth) ?? null;
}

function ensureApp(): App {
  if (!cachedApp) {
    if (!getApps().length) {
      cachedApp = initializeApp({
        projectId: firebaseConfig.projectId
      });
    } else {
      cachedApp = getApps()[0]!;
    }
  }
  return cachedApp;
}

function getRealAuth(): Auth {
  if (testAuthOverride) return testAuthOverride;
  if (!cachedAuth) {
    cachedAuth = getAuth(ensureApp());
  }
  return cachedAuth;
}

function getRealDb(): Firestore {
  if (testDbOverride) return testDbOverride;
  if (!cachedDb) {
    const appInstance = ensureApp();
    cachedDb = firebaseConfig.firestoreDatabaseId
      ? getFirestore(appInstance, firebaseConfig.firestoreDatabaseId)
      : getFirestore(appInstance);
  }
  return cachedDb;
}

export const adminAuth: Auth = new Proxy({} as Auth, {
  get(_target, prop) {
    const instance = getRealAuth() as unknown as Record<PropertyKey, unknown>;
    const val = instance[prop];
    return typeof val === 'function' ? (val as (...args: unknown[]) => unknown).bind(instance) : val;
  }
});

export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(_target, prop) {
    const instance = getRealDb() as unknown as Record<PropertyKey, unknown>;
    const val = instance[prop];
    return typeof val === 'function' ? (val as (...args: unknown[]) => unknown).bind(instance) : val;
  }
});
