export interface QueuedAction {
  id: string;
  action: 'CREATE_ORDER' | 'UPDATE_STOCK' | 'RECORD_FINANCIAL' | 'UPDATE_TABLE';
  tenantId?: string;
  createdByUid?: string;
  mode?: 'real' | 'simulation';
  endpoint: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  timestamp: string;
  retries: number;
}

export interface SyncConflictRecord {
  id: string;
  action: QueuedAction['action'];
  idempotencyKey: string;
  orderNumber?: string;
  tenantId?: string;
  createdByUid?: string;
  total?: number;
  code: string;
  reason: string;
  status: 'conflict_cancelled' | 'resolved_by_operator';
  detectedAt: string;
  payload: Record<string, unknown>;
}

export interface SyncBatchSummary {
  processed: number;
  failed: number;
  conflicts: number;
  deadLetterCount: number;
}

export interface OutboxTransportError {
  status: number;
  code?: string;
  message?: string;
}

export type OutboxPostTransport = (
  endpoint: string,
  payload: Record<string, unknown>,
  headers: Record<string, string>
) => Promise<unknown>;

/**
 * Pure Commercial Outbox Classification Rule:
 * Deterministic business rejections (409 Stock Conflict, 400 Bad Payload, 403 Tenant/RBAC Forbidden,
 * 404 Not Found, 422 Unprocessable Minimums) MUST NOT loop infinitely in the offline queue.
 */
export function isDeterministicBusinessRejection(status: number): boolean {
  return status === 409 || status === 400 || status === 403 || status === 404 || status === 422;
}

/**
 * Pure Offline Outbox Replay & Conflict Resolution Engine
 * Shared identically by Angular `OfflineSyncService` and Commercial Warfare Integration Tests.
 */
export async function executeOfflineOutboxReplay(params: {
  queue: QueuedAction[];
  transport: OutboxPostTransport;
  maxRetries?: number;
  onSynced?: (item: QueuedAction, serverResponse: unknown) => void;
  onConflict?: (conflict: SyncConflictRecord) => void;
}): Promise<{
  summary: SyncBatchSummary;
  remainingQueue: QueuedAction[];
  deadLetterQueue: QueuedAction[];
  newConflicts: SyncConflictRecord[];
}> {
  const { queue, transport, maxRetries = 5, onSynced, onConflict } = params;
  const remainingQueue: QueuedAction[] = [];
  const deadLetterQueue: QueuedAction[] = [];
  const newConflicts: SyncConflictRecord[] = [];
  let processed = 0;
  let failed = 0;
  let conflicts = 0;

  for (let queueIndex = 0; queueIndex < queue.length; queueIndex++) {
    const rawItem = queue[queueIndex]!;
    const item: QueuedAction = { ...rawItem };
    try {
      const response = await transport(item.endpoint, item.payload, {
        'X-Idempotency-Key': item.idempotencyKey,
        'X-Offline-Queue-ID': item.id
      });
      processed++;
      onSynced?.(item, response);
    } catch (rawErr: unknown) {
      const err = rawErr as Partial<OutboxTransportError>;
      const status = typeof err?.status === 'number' ? err.status : 0;

      if (err?.code === 'CONTEXT_CHANGED') {
        remainingQueue.push(item, ...queue.slice(queueIndex + 1).map((queued) => ({ ...queued })));
        break;
      }

      if (isDeterministicBusinessRejection(status)) {
        const conflictRecord: SyncConflictRecord = {
          id: item.id,
          action: item.action,
          idempotencyKey: item.idempotencyKey,
          orderNumber:
            typeof item.payload['orderNumber'] === 'string'
              ? item.payload['orderNumber']
              : item.id,
          tenantId:
            typeof item.payload['tenantId'] === 'string' ? item.payload['tenantId'] : undefined,
          createdByUid: item.createdByUid,
          total: typeof item.payload['total'] === 'number' ? item.payload['total'] : undefined,
          code: err?.code || (status === 409 ? 'STOCK_CONFLICT' : `HTTP_${status}`),
          reason:
            err?.message || 'Conflito comercial detectado ao sincronizar operação offline.',
          status: 'conflict_cancelled',
          detectedAt: new Date().toISOString(),
          payload: item.payload
        };

        newConflicts.push(conflictRecord);
        conflicts++;
        onConflict?.(conflictRecord);
      } else {
        item.retries++;
        if (item.retries < maxRetries) {
          remainingQueue.push(item);
        } else {
          deadLetterQueue.push({
            ...item,
            timestamp: new Date().toISOString()
          });
        }
        failed++;
      }
    }
  }

  return {
    summary: { processed, failed, conflicts, deadLetterCount: deadLetterQueue.length },
    remainingQueue,
    deadLetterQueue,
    newConflicts
  };
}
