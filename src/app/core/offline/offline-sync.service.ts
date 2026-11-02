import { Injectable, signal, computed, inject, PLATFORM_ID, effect } from '@angular/core';
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
import { SecurityService } from '../../services/security.service';

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
  private readonly security = inject(SecurityService);

  private successHandlers: SyncSuccessHandler[] = [];
  private conflictHandlers: SyncConflictHandler[] = [];

  // Mutex lock to prevent concurrent overlapping outbox replay routines
  private isReplayInProgress = false;

  readonly isOnline = signal<boolean>(this.isBrowser ? navigator.onLine : true);
  readonly offlineQueue = signal<QueuedAction[]>([]);
  readonly syncConflicts = signal<SyncConflictRecord[]>([]);
  readonly deadLetterQueue = signal<QueuedAction[]>([]);
  readonly isInitialized = signal<boolean>(false);
  readonly isSyncing = signal(false);

  readonly pendingSyncCount = computed(() => {
    const tenantId = this.currentTenantId();
    const uid = this.security.currentUid();
    return tenantId ? this.offlineQueue().filter((item) => this.itemTenantId(item) === tenantId &&
      (!item.createdByUid || item.createdByUid === uid) && !this.isSimulatedItem(item)).length : 0;
  });
  readonly visibleDeadLetters = computed(() => {
    const tenantId = this.currentTenantId();
    const uid = this.security.currentUid();
    return tenantId ? this.deadLetterQueue().filter((item) => this.itemTenantId(item) === tenantId &&
      (!item.createdByUid || item.createdByUid === uid) && !this.isSimulatedItem(item)) : [];
  });
  readonly deadLetterCount = computed(() => this.visibleDeadLetters().length);
  readonly unresolvedConflicts = computed(() =>
    this.syncConflicts().filter((conflict) =>
      conflict.status === 'conflict_cancelled' && conflict.tenantId === this.currentTenantId() && !this.security.isSimulated()
      && (!conflict.createdByUid || conflict.createdByUid === this.security.currentUid())
      && conflict.payload['isSimulated'] !== true && conflict.payload['mode'] !== 'simulation'
    )
  );
  readonly unresolvedConflictsCount = computed(() => this.unresolvedConflicts().length);
  readonly lastSyncTimestamp = signal<string | null>(null);

  constructor() {
    this.initializePersistence();
    effect(() => {
      const ready = this.isInitialized();
      const hasQueue = this.offlineQueue().length > 0;
      const online = this.isOnline();
      const context = this.currentReplayContext();
      if (ready && hasQueue && online && context) void this.processSyncQueue();
    });

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
    if (this.security.isSimulated() || payload['isSimulated'] === true || payload['mode'] === 'simulation') {
      throw new Error('Pedidos simulados não podem entrar na fila real de sincronização.');
    }
    const generatedId =
      explicitIdempotencyKey || `off-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const queuedItem: QueuedAction = {
      id: generatedId,
      action,
      ...(this.currentTenantId() ? { tenantId: this.currentTenantId() } : {}),
      ...(this.security.currentUid() ? { createdByUid: this.security.currentUid()! } : {}),
      mode: 'real',
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

    const context = this.currentReplayContext();
    if (!context || !this.isOnline() || this.offlineQueue().length === 0) {
      return { processed: 0, failed: 0, conflicts: 0, deadLetterCount: this.deadLetterCount() };
    }

    const initialQueue = [...this.offlineQueue()];
    const replayQueue = initialQueue.filter((item) =>
      !this.isSimulatedItem(item) && this.itemTenantId(item) === context.tenantId &&
      (!item.createdByUid || item.createdByUid === context.uid)
    );
    if (replayQueue.length === 0) {
      return { processed: 0, failed: 0, conflicts: 0, deadLetterCount: this.deadLetterCount() };
    }
    const replayIds = new Set(replayQueue.map((item) => item.id));

    this.isReplayInProgress = true;
    this.isSyncing.set(true);

    try {
      const { summary, remainingQueue, deadLetterQueue: newDlqItems, newConflicts } = await executeOfflineOutboxReplay({
        queue: replayQueue,
        transport: async (endpoint, payload, headers) => {
          if (!this.isReplayContextCurrent(context) || payload['tenantId'] !== context.tenantId) {
            throw { status: 0, code: 'CONTEXT_CHANGED', message: 'A sessão mudou antes do envio da operação offline.' };
          }
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
          if (!this.isReplayContextCurrent(context)) return;
          for (const handler of this.successHandlers) {
            handler(item, response);
          }
        },
        onConflict: (conflict) => {
          if (!this.isReplayContextCurrent(context)) return;
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

      const remainingById = new Map(remainingQueue.map((item) => [item.id, item]));
      const deadLetterIds = new Set(newDlqItems.map((item) => item.id));
      const mergedQueue = this.offlineQueue().flatMap((item) => {
        if (!replayIds.has(item.id)) return [item];
        const retry = remainingById.get(item.id);
        return retry && !deadLetterIds.has(item.id) ? [retry] : [];
      });
      this.offlineQueue.set(mergedQueue);
      this.idb.saveQueue(mergedQueue);
      this.lastSyncTimestamp.set(new Date().toLocaleTimeString('pt-BR'));

      return summary;
    } finally {
      this.isReplayInProgress = false;
      this.isSyncing.set(false);
      const nextContext = this.currentReplayContext();
      const contextChanged = Boolean(nextContext && (
        nextContext.uid !== context.uid || nextContext.tenantId !== context.tenantId || nextContext.revision !== context.revision
      ));
      if (contextChanged && this.isOnline() && this.offlineQueue().length > 0) {
        void Promise.resolve().then(() => this.processSyncQueue());
      }
    }
  }

  acknowledgeConflict(conflictId: string): void {
    const context = this.currentReplayContext();
    const conflict = this.unresolvedConflicts().find((item) => item.id === conflictId);
    if (!context || !conflict || conflict.tenantId !== context.tenantId ||
        (conflict.createdByUid && conflict.createdByUid !== context.uid)) return;
    const updated = this.syncConflicts().map((c) =>
      c.id === conflictId ? { ...c, status: 'resolved_by_operator' as const } : c
    );
    this.syncConflicts.set(updated);
    this.idb.saveConflicts(updated);
  }

  clearResolvedConflicts(): void {
    const context = this.currentReplayContext();
    if (!context) return;
    const remaining = this.syncConflicts().filter((conflict) =>
      !(conflict.status === 'resolved_by_operator' && conflict.tenantId === context.tenantId &&
        (!conflict.createdByUid || conflict.createdByUid === context.uid))
    );
    this.syncConflicts.set(remaining);
    this.idb.saveConflicts(remaining);
  }

  async retryDeadLetter(id: string): Promise<boolean> {
    const context = this.currentReplayContext();
    if (!context) throw new Error('É necessário estar autenticado no modo real para reprocessar esta operação.');
    const item = this.visibleDeadLetters().find((candidate) => candidate.id === id);
    if (!item || this.isSimulatedItem(item) || this.itemTenantId(item) !== context.tenantId ||
        item.payload['tenantId'] !== context.tenantId || (item.createdByUid && item.createdByUid !== context.uid)) {
      return false;
    }
    if (this.offlineQueue().some((queued) => queued.id === item.id)) return false;

    const retryItem: QueuedAction = { ...item, retries: 0 };
    const nextQueue = [retryItem, ...this.offlineQueue()];
    const nextDeadLetters = this.deadLetterQueue().filter((candidate) => candidate.id !== item.id);
    await this.idb.moveDeadLetterToQueue(retryItem, nextQueue, nextDeadLetters);
    this.offlineQueue.update((current) => current.some((candidate) => candidate.id === retryItem.id)
      ? current
      : [retryItem, ...current]);
    this.deadLetterQueue.update((current) => current.filter((candidate) => candidate.id !== retryItem.id));
    if (this.isOnline() && this.isReplayContextCurrent(context)) void this.processSyncQueue();
    return true;
  }

  clearQueue() {
    this.offlineQueue.set([]);
    this.idb.saveQueue([]);
  }

  private currentTenantId(): string | undefined {
    if (this.security.isSimulated()) return undefined;
    return this.security.currentSession()?.tenantId;
  }

  private currentReplayContext(): { uid: string; tenantId: string; revision: number } | null {
    const session = this.security.currentSession();
    const role = session?.role;
    const allowedRole = role === 'tenant_owner' || role === 'operator' || role === 'waiter';
    const uid = this.security.currentUid();
    const tenantId = session?.tenantId;
    if (!this.isInitialized() || !this.security.authInitialized() || !this.security.isRealMode() ||
        !uid || !tenantId || !allowedRole) return null;
    return { uid, tenantId, revision: this.security.executionModeRevision() };
  }

  private isReplayContextCurrent(context: { uid: string; tenantId: string; revision: number }): boolean {
    return this.security.isRealMode() && !this.security.isSimulated() &&
      this.security.currentUid() === context.uid &&
      this.security.currentSession()?.tenantId === context.tenantId &&
      this.security.executionModeRevision() === context.revision;
  }

  private itemTenantId(item: QueuedAction): string | undefined {
    return item.tenantId || (typeof item.payload['tenantId'] === 'string' ? item.payload['tenantId'] : undefined);
  }

  private isSimulatedItem(item: QueuedAction): boolean {
    return item.mode === 'simulation' || item.payload['isSimulated'] === true || item.payload['mode'] === 'simulation';
  }
}
