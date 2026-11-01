import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  QueuedAction,
  SyncBatchSummary,
  SyncConflictRecord,
  executeOfflineOutboxReplay
} from './offline-outbox.engine';
import { IndexedDbPersistenceService } from './indexed-db.service';

export type { QueuedAction, SyncBatchSummary, SyncConflictRecord };

type SyncSuccessHandler = (item: QueuedAction, serverResponse: unknown) => void;
type SyncConflictHandler = (conflict: SyncConflictRecord) => void;

@Injectable({
  providedIn: 'root'
})
export class OfflineSyncService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly idb = inject(IndexedDbPersistenceService);

  private successHandlers: SyncSuccessHandler[] = [];
  private conflictHandlers: SyncConflictHandler[] = [];

  // Mutex lock to prevent concurrent overlapping outbox replay routines
  private isReplayInProgress = false;

  readonly isOnline = signal<boolean>(this.isBrowser ? navigator.onLine : true);
  readonly offlineQueue = signal<QueuedAction[]>([]);
  readonly syncConflicts = signal<SyncConflictRecord[]>([]);
  readonly deadLetterQueue = signal<QueuedAction[]>([]);
  readonly isInitialized = signal<boolean>(false);

  readonly pendingSyncCount = computed(() => this.offlineQueue().length);
  readonly deadLetterCount = computed(() => this.deadLetterQueue().length);
  readonly unresolvedConflicts = computed(() =>
    this.syncConflicts().filter((c) => c.status === 'conflict_cancelled')
  );
  readonly unresolvedConflictsCount = computed(() => this.unresolvedConflicts().length);
  readonly lastSyncTimestamp = signal<string | null>(null);

  constructor() {
    this.initializePersistence();

    if (this.isBrowser) {
      window.addEventListener('online', () => this.handleOnlineStatusChange(true));
      window.addEventListener('offline', () => this.handleOnlineStatusChange(false));
    }
  }

  private async initializePersistence(): Promise<void> {
    if (!this.isBrowser) return;

    try {
      const [queue, conflicts, dlq] = await Promise.all([
        this.idb.loadQueue(),
        this.idb.loadConflicts(),
        this.idb.loadDlq()
      ]);

      this.offlineQueue.set(queue);
      this.syncConflicts.set(conflicts);
      this.deadLetterQueue.set(dlq);
      this.isInitialized.set(true);

      if (this.isOnline() && queue.length > 0) {
        this.processSyncQueue();
      }
    } catch (err) {
      console.warn('Failed to initialize IndexedDB offline stores:', err);
      this.isInitialized.set(true);
    }
  }

  onActionSynced(handler: SyncSuccessHandler): void {
    this.successHandlers.push(handler);
  }

  onActionConflict(handler: SyncConflictHandler): void {
    this.conflictHandlers.push(handler);
  }

  private handleOnlineStatusChange(online: boolean) {
    this.isOnline.set(online);
    if (online) {
      this.processSyncQueue();
    }
  }

  enqueueAction(
    action: QueuedAction['action'],
    endpoint: string,
    payload: Record<string, unknown>,
    explicitIdempotencyKey?: string
  ): QueuedAction {
    const generatedId =
      explicitIdempotencyKey || `off-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const queuedItem: QueuedAction = {
      id: generatedId,
      action,
      endpoint,
      payload,
      idempotencyKey:
        explicitIdempotencyKey ||
        `idemp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      retries: 0
    };

    const updated = [...this.offlineQueue(), queuedItem];
    this.offlineQueue.set(updated);
    this.idb.saveQueue(updated);

    if (this.isOnline()) {
      this.processSyncQueue();
    }

    return queuedItem;
  }

  async processSyncQueue(): Promise<SyncBatchSummary> {
    // Concurrency lock: prevent duplicate overlapping runs
    if (this.isReplayInProgress) {
      return { processed: 0, failed: 0, conflicts: 0, deadLetterCount: this.deadLetterCount() };
    }

    if (!this.isOnline() || this.offlineQueue().length === 0) {
      return { processed: 0, failed: 0, conflicts: 0, deadLetterCount: this.deadLetterCount() };
    }

    this.isReplayInProgress = true;

    try {
      const { summary, remainingQueue, deadLetterQueue: newDlqItems, newConflicts } = await executeOfflineOutboxReplay({
        queue: [...this.offlineQueue()],
        transport: async (endpoint, payload, headers) => {
          try {
            return await firstValueFrom(this.http.post(endpoint, payload, { headers }));
          } catch (rawErr: unknown) {
            const httpErr = rawErr as HttpErrorResponse & {
              error?: { error?: string; code?: string };
            };
            throw {
              status: typeof httpErr?.status === 'number' ? httpErr.status : 0,
              code: httpErr?.error?.code,
              message: httpErr?.error?.error || httpErr?.message
            };
          }
        },
        onSynced: (item, response) => {
          for (const handler of this.successHandlers) {
            handler(item, response);
          }
        },
        onConflict: (conflict) => {
          for (const handler of this.conflictHandlers) {
            handler(conflict);
          }
        }
      });

      if (newConflicts.length > 0) {
        const updatedConflicts = [...newConflicts, ...this.syncConflicts()];
        this.syncConflicts.set(updatedConflicts);
        this.idb.saveConflicts(updatedConflicts);
      }

      if (newDlqItems.length > 0) {
        const updatedDlq = [...newDlqItems, ...this.deadLetterQueue()];
        this.deadLetterQueue.set(updatedDlq);
        this.idb.saveDlq(updatedDlq);
      }

      this.offlineQueue.set(remainingQueue);
      this.idb.saveQueue(remainingQueue);
      this.lastSyncTimestamp.set(new Date().toLocaleTimeString('pt-BR'));

      return summary;
    } finally {
      this.isReplayInProgress = false;
    }
  }

  acknowledgeConflict(conflictId: string): void {
    const updated = this.syncConflicts().map((c) =>
      c.id === conflictId ? { ...c, status: 'resolved_by_operator' as const } : c
    );
    this.syncConflicts.set(updated);
    this.idb.saveConflicts(updated);
  }

  clearResolvedConflicts(): void {
    const remaining = this.syncConflicts().filter((c) => c.status !== 'resolved_by_operator');
    this.syncConflicts.set(remaining);
    this.idb.saveConflicts(remaining);
  }

  clearQueue() {
    this.offlineQueue.set([]);
    this.idb.saveQueue([]);
  }
}
