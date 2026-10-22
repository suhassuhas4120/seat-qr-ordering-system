import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ==============================================================================
// THOOGUDEEPA V2: PURE STRICT SINGLETON SUPABASE CLIENT
// Prevents GoTrueClient duplicate instance warnings and socket listener leaks
// ==============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('placeholder')
);

// Global browser window symbol anchor to resist hot-module re-evaluations
const GLOBAL_SUPABASE_KEY = '__thoogudeepa_v2_supabase_singleton__';

declare global {
  interface Window {
    [GLOBAL_SUPABASE_KEY]?: SupabaseClient;
  }
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }

  // 1. Check module cache
  if (cachedClient) {
    return cachedClient;
  }

  // 2. Check browser window anchor
  if (typeof window !== 'undefined' && window[GLOBAL_SUPABASE_KEY]) {
    cachedClient = window[GLOBAL_SUPABASE_KEY];
    return cachedClient;
  }

  // 3. Create single master client
  try {
    cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 40,
        },
      },
    });

    if (typeof window !== 'undefined') {
      window[GLOBAL_SUPABASE_KEY] = cachedClient;
    }

    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase singleton client:', err);
    return null;
  }
}

// Exported singleton reference
export const supabase = getSupabaseClient();
