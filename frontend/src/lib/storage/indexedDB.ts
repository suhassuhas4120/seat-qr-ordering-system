import { openDB, IDBPDatabase } from 'idb';

// ==============================================================================
// THOOGUDEEPA V2: NON-BLOCKING ASYNCHRONOUS INDEXEDDB STORAGE SHIELD
// Replaces blocking main-thread localStorage with asynchronous IndexedDB
// ==============================================================================

const DB_NAME = 'thoogudeepa_v2_store';
const DB_VERSION = 1;
const KV_STORE = 'keyval';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> | null {
  if (typeof window === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db: IDBPDatabase) {
        if (!db.objectStoreNames.contains(KV_STORE)) {
          db.createObjectStore(KV_STORE);
        }
      },
    });
  }
  return dbPromise;
}

export const asyncStorage = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const db = await getDB();
      if (db) {
        const val = await db.get(KV_STORE, key);
        if (val !== undefined) return val as T;
      }
    } catch {
      // Fall through to synchronous fallback if IndexedDB is restricted
    }

    if (typeof window !== 'undefined') {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      } catch {
        return null;
      }
    }
    return null;
  },

  async set<T>(key: string, val: T): Promise<void> {
    try {
      const db = await getDB();
      if (db) {
        await db.put(KV_STORE, val, key);
      }
    } catch {
      // Fall through
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(val));
      } catch {
        // Storage quota exceeded or blocked
      }
    }
  },

  async remove(key: string): Promise<void> {
    try {
      const db = await getDB();
      if (db) {
        await db.delete(KV_STORE, key);
      }
    } catch {
      // Fall through
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignore
      }
    }
  },

  async clearThoogudeepaKeys(): Promise<void> {
    try {
      const db = await getDB();
      if (db) {
        await db.clear(KV_STORE);
      }
    } catch {
      // Fall through
    }

    if (typeof window !== 'undefined') {
      try {
        const keys = Object.keys(localStorage);
        for (const k of keys) {
          if (
            k.startsWith('thoogudeepa') ||
            k.includes('order') ||
            k.includes('session') ||
            k.includes('cart') ||
            k.includes('stages')
          ) {
            localStorage.removeItem(k);
          }
        }
        sessionStorage.clear();
      } catch {
        // Ignore
      }
    }
  },
};
