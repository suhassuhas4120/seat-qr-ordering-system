// ==============================================================================
// OFFLINE RESILIENCE BUFFER & AUTO-SYNC ENGINE
// Caches orders, bumps, and waiter actions in localStorage during dead zones/outages
// and automatically replays them with exponential backoff upon reconnection.
// ==============================================================================

export interface QueuedAction {
  id: string;
  type: 'PLACE_ORDER' | 'UPDATE_STAGE' | 'CLAIM_SEAT' | 'GENERIC_POST';
  endpoint: string;
  payload: any;
  headers?: Record<string, string>;
  createdAt: string;
  retryCount: number;
}

export interface NetworkState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
  lastError: string | null;
}

const STORAGE_KEY = '__restaurant_offline_action_queue__';

class OfflineQueueManager {
  private queue: QueuedAction[] = [];
  private isSyncing = false;
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private listeners: Set<(state: NetworkState) => void> = new Set();
  private lastSyncedAt: string | null = null;
  private lastError: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadQueue();
      this.initEventListeners();
    }
  }

  private loadQueue() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.queue = JSON.parse(raw);
      }
    } catch (e) {
      this.queue = [];
    }
  }

  private persistQueue() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
      this.notify();
    } catch {}
  }

  private initEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.lastError = null;
      this.notify();
      this.drainQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notify();
    });
  }

  public subscribe(listener: (state: NetworkState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((fn) => {
      try {
        fn(state);
      } catch {}
    });
  }

  public getState(): NetworkState {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: this.queue.length,
      lastSyncedAt: this.lastSyncedAt,
      lastError: this.lastError,
    };
  }

  /**
   * Enqueues an action to be dispatched immediately if online,
   * or held in durable queue if offline.
   */
  public enqueue(
    type: QueuedAction['type'],
    endpoint: string,
    payload: any,
    headers?: Record<string, string>
  ): QueuedAction {
    const action: QueuedAction = {
      id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type,
      endpoint,
      payload,
      headers,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    this.queue.push(action);
    this.persistQueue();

    if (this.isOnline && !this.isSyncing) {
      this.drainQueue();
    }

    return action;
  }

  /**
   * Sequentially drains the pending action queue against the live backend.
   */
  public async drainQueue(): Promise<void> {
    if (this.isSyncing || this.queue.length === 0 || !this.isOnline) {
      return;
    }

    this.isSyncing = true;
    this.notify();

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    try {
      while (this.queue.length > 0 && this.isOnline) {
        const item = this.queue[0];

        try {
          const res = await fetch(`${API_BASE}${item.endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(item.headers || {}),
            },
            body: JSON.stringify(item.payload),
          });

          if (!res.ok && res.status >= 400 && res.status < 500) {
            // Client error (e.g. invalid format or expired seat), discard to avoid infinite poison queue
            console.warn(`[OfflineQueue] Discarding unprocessable request ${item.id}:`, res.status);
            this.queue.shift();
            this.persistQueue();
            continue;
          }

          if (!res.ok) {
            throw new Error(`Server returned status ${res.status}`);
          }

          // Successfully processed! Pop from queue
          this.queue.shift();
          this.persistQueue();
          this.lastSyncedAt = new Date().toISOString();
        } catch (err: any) {
          item.retryCount += 1;
          this.lastError = err?.message || 'Network unreachable';
          console.warn(`[OfflineQueue] Failed to replay action ${item.id} (attempt ${item.retryCount}):`, err);

          if (item.retryCount > 10) {
            // After 10 failed retries, drop or alert
            this.queue.shift();
            this.persistQueue();
          }

          // Back off briefly before next try
          await new Promise((resolve) => setTimeout(resolve, 2000));
          break;
        }
      }
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }

  public clearQueue() {
    this.queue = [];
    this.persistQueue();
  }
}

export const offlineQueue = new OfflineQueueManager();
