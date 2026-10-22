import { offlineQueue } from './offlineQueue';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // If browser is actively offline and it's a mutating POST/PUT operation, queue it immediately!
  const isMutating = options.method === 'POST' || options.method === 'PUT';
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  if (isOffline && isMutating) {
    const payload = options.body ? JSON.parse(options.body as string) : {};
    offlineQueue.enqueue('GENERIC_POST', endpoint, payload, headers as Record<string, string>);
    return {
      queued: true,
      offline: true,
      message: 'Network offline. Request saved in offline buffer and will sync automatically.',
    } as unknown as T;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (err: any) {
    // If network failure occurs during a mutating operation, buffer it
    if (isMutating && (err.name === 'TypeError' || err.message?.includes('fetch'))) {
      const payload = options.body ? JSON.parse(options.body as string) : {};
      offlineQueue.enqueue('GENERIC_POST', endpoint, payload, headers as Record<string, string>);
      return {
        queued: true,
        offline: true,
        message: 'Connection dropped. Request held in offline queue and will sync automatically.',
      } as unknown as T;
    }
    throw err;
  }
}
