import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { QueuedAction, SyncConflictRecord } from './offline-outbox.engine';

const DB_NAME = '3eatcru_commercial_os_db';
const DB_VERSION = 1;

const STORES = {
  OUTBOX: 'outbox_queue',
  CONFLICTS: 'conflicts',
  DLQ: 'dead_letter',
  ENTITY_CACHE: 'entity_cache'
} as const;

@Injectable({
  providedIn: 'root'
})
export class IndexedDbPersistenceService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  constructor() {
    if (this.isBrowser && typeof indexedDB !== 'undefined') {
      this.dbPromise = this.initDatabase();
    }
  }

  private initDatabase(): Promise<IDBDatabase | null> {
    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          if (!db.objectStoreNames.contains(STORES.OUTBOX)) {
            const outboxStore = db.createObjectStore(STORES.OUTBOX, { keyPath: 'id' });
            outboxStore.createIndex('timestamp', 'timestamp', { unique: false });
            outboxStore.createIndex('action', 'action', { unique: false });
          }

          if (!db.objectStoreNames.contains(STORES.CONFLICTS)) {
            const conflictStore = db.createObjectStore(STORES.CONFLICTS, { keyPath: 'id' });
            conflictStore.createIndex('timestamp', 'timestamp', { unique: false });
            conflictStore.createIndex('status', 'status', { unique: false });
          }

          if (!db.objectStoreNames.contains(STORES.DLQ)) {
            const dlqStore = db.createObjectStore(STORES.DLQ, { keyPath: 'id' });
            dlqStore.createIndex('timestamp', 'timestamp', { unique: false });
          }

          if (!db.objectStoreNames.contains(STORES.ENTITY_CACHE)) {
            db.createObjectStore(STORES.ENTITY_CACHE, { keyPath: 'key' });
          }
        };

        request.onsuccess = (event) => {
          resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = (err) => {
          console.warn('IndexedDB unavailable, falling back to LocalStorage:', err);
          resolve(null);
        };
      } catch (err) {
        console.warn('IndexedDB initialization failed:', err);
        resolve(null);
      }
    });
  }

  private async getDb(): Promise<IDBDatabase | null> {
    if (!this.dbPromise) return null;
    return this.dbPromise;
  }

  async saveQueue(items: QueuedAction[]): Promise<void> {
    const db = await this.getDb();
    if (!db) {
      this.fallbackSave('3eatcru_offline_queue', items);
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORES.OUTBOX, 'readwrite');
        const store = tx.objectStore(STORES.OUTBOX);
        store.clear();
        for (const item of items) {
          store.put(item);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => {
          this.fallbackSave('3eatcru_offline_queue', items);
          resolve();
        };
      } catch {
        this.fallbackSave('3eatcru_offline_queue', items);
        resolve();
      }
    });
  }

  async loadQueue(): Promise<QueuedAction[]> {
    const db = await this.getDb();
    if (!db) {
      return this.fallbackLoad<QueuedAction[]>('3eatcru_offline_queue', []);
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORES.OUTBOX, 'readonly');
        const store = tx.objectStore(STORES.OUTBOX);
        const req = store.getAll();

        req.onsuccess = () => {
          const result = req.result as QueuedAction[];
          if (!result || result.length === 0) {
            // Check if there was legacy data in localStorage to migrate
            const legacy = this.fallbackLoad<QueuedAction[]>('3eatcru_offline_queue', []);
            if (legacy.length > 0) {
              this.saveQueue(legacy);
              resolve(legacy);
              return;
            }
          }
          resolve(result || []);
        };

        req.onerror = () => {
          resolve(this.fallbackLoad<QueuedAction[]>('3eatcru_offline_queue', []));
        };
      } catch {
        resolve(this.fallbackLoad<QueuedAction[]>('3eatcru_offline_queue', []));
      }
    });
  }

  async saveConflicts(conflicts: SyncConflictRecord[]): Promise<void> {
    const db = await this.getDb();
    if (!db) {
      this.fallbackSave('3eatcru_offline_conflicts', conflicts);
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORES.CONFLICTS, 'readwrite');
        const store = tx.objectStore(STORES.CONFLICTS);
        store.clear();
        for (const item of conflicts) {
          store.put(item);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => {
          this.fallbackSave('3eatcru_offline_conflicts', conflicts);
          resolve();
        };
      } catch {
        this.fallbackSave('3eatcru_offline_conflicts', conflicts);
        resolve();
      }
    });
  }

  async loadConflicts(): Promise<SyncConflictRecord[]> {
    const db = await this.getDb();
    if (!db) {
      return this.fallbackLoad<SyncConflictRecord[]>('3eatcru_offline_conflicts', []);
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORES.CONFLICTS, 'readonly');
        const store = tx.objectStore(STORES.CONFLICTS);
        const req = store.getAll();

        req.onsuccess = () => {
          resolve((req.result as SyncConflictRecord[]) || []);
        };

        req.onerror = () => {
          resolve(this.fallbackLoad<SyncConflictRecord[]>('3eatcru_offline_conflicts', []));
        };
      } catch {
        resolve(this.fallbackLoad<SyncConflictRecord[]>('3eatcru_offline_conflicts', []));
      }
    });
  }

  async saveDlq(dlq: QueuedAction[]): Promise<void> {
    const db = await this.getDb();
    if (!db) {
      this.fallbackSave('3eatcru_offline_dlq', dlq);
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORES.DLQ, 'readwrite');
        const store = tx.objectStore(STORES.DLQ);
        store.clear();
        for (const item of dlq) {
          store.put(item);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => {
          this.fallbackSave('3eatcru_offline_dlq', dlq);
          resolve();
        };
      } catch {
        this.fallbackSave('3eatcru_offline_dlq', dlq);
        resolve();
      }
    });
  }

  async loadDlq(): Promise<QueuedAction[]> {
    const db = await this.getDb();
    if (!db) {
      return this.fallbackLoad<QueuedAction[]>('3eatcru_offline_dlq', []);
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORES.DLQ, 'readonly');
        const store = tx.objectStore(STORES.DLQ);
        const req = store.getAll();

        req.onsuccess = () => {
          resolve((req.result as QueuedAction[]) || []);
        };

        req.onerror = () => {
          resolve(this.fallbackLoad<QueuedAction[]>('3eatcru_offline_dlq', []));
        };
      } catch {
        resolve(this.fallbackLoad<QueuedAction[]>('3eatcru_offline_dlq', []));
      }
    });
  }

  async putCache(key: string, data: unknown): Promise<void> {
    const db = await this.getDb();
    const entry = { key, data, updatedAt: new Date().toISOString() };
    if (!db) {
      this.fallbackSave(`3eatcru_cache_${key}`, entry);
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORES.ENTITY_CACHE, 'readwrite');
        const store = tx.objectStore(STORES.ENTITY_CACHE);
        store.put(entry);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async getCache<T>(key: string): Promise<T | null> {
    const db = await this.getDb();
    if (!db) {
      const fallback = this.fallbackLoad<{ data: T } | null>(`3eatcru_cache_${key}`, null);
      return fallback ? fallback.data : null;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORES.ENTITY_CACHE, 'readonly');
        const store = tx.objectStore(STORES.ENTITY_CACHE);
        const req = store.get(key);

        req.onsuccess = () => {
          const res = req.result as { data: T } | undefined;
          resolve(res ? res.data : null);
        };

        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  private fallbackSave(key: string, val: unknown) {
    if (this.isBrowser) {
      try {
        localStorage.setItem(key, JSON.stringify(val));
      } catch {
        // LocalStorage quota or blocked
      }
    }
  }

  private fallbackLoad<T>(key: string, fallback: T): T {
    if (this.isBrowser) {
      try {
        const item = localStorage.getItem(key);
        return item ? (JSON.parse(item) as T) : fallback;
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
}
