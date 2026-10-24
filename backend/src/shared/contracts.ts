/**
 * Canonical Seat Identifier & Domain Contracts
 * High-performance, deterministic normalization for Dine-In (1..100) and Takeaway (0 / TK-01).
 */

export interface NormalizedSeatIdentity {
  /** Numerical seat ID (0 = Takeaway TK-01, 1..N = Dine-in) */
  seatId: number;
  /** Normalized string chair ID without leading zeroes for consistency ("0", "1", "4", "20") */
  chairId: string;
  /** Standard 2-digit zero-padded chair ID for display ("00", "01", "04", "20") */
  paddedChairId: string;
  /** User-facing human readable label ("TAKEAWAY (TK-01)" or "SEAT #04") */
  label: string;
  /** Whether this represents a takeaway order */
  isTakeaway: boolean;
}

/**
 * Deterministically normalizes any seat / chair representation.
 * Guarantees zero empty string bugs for Seat 0 / Takeaway.
 */
export function normalizeSeatIdentity(raw: unknown): NormalizedSeatIdentity {
  if (raw === null || raw === undefined) {
    return {
      seatId: 1,
      chairId: '1',
      paddedChairId: '01',
      label: 'SEAT #01',
      isTakeaway: false,
    };
  }

  const rawStr = String(raw).trim();

  // Check for takeaway tokens
  if (
    rawStr === '0' ||
    rawStr === '00' ||
    rawStr.toUpperCase() === 'TK-00' ||
    rawStr.toUpperCase() === 'TK-01' ||
    rawStr.toUpperCase().includes('TK') ||
    rawStr.toUpperCase().includes('TAKEAWAY') ||
    rawStr.toUpperCase().includes('PARCEL')
  ) {
    return {
      seatId: 0,
      chairId: '0',
      paddedChairId: '00',
      label: 'Seat 0 (Parcel)',
      isTakeaway: true,
    };
  }

  // Extract digits
  const digitsOnly = rawStr.replace(/[^0-9]/g, '');
  const parsedNum = parseInt(digitsOnly, 10);

  if (isNaN(parsedNum) || parsedNum <= 0) {
    // Fallback if unable to parse
    return {
      seatId: 1,
      chairId: '1',
      paddedChairId: '01',
      label: 'SEAT #01',
      isTakeaway: false,
    };
  }

  const numStr = String(parsedNum);
  const padded = numStr.padStart(2, '0');

  return {
    seatId: parsedNum,
    chairId: numStr,
    paddedChairId: padded,
    label: `SEAT #${padded}`,
    isTakeaway: false,
  };
}

/**
 * Realtime Event Envelope for strict causal tracing & echo prevention.
 */
export interface RealtimeEnvelope<T = unknown> {
  eventId: string;
  originDeviceId?: string;
  seatId?: number;
  timestamp: string;
  version?: number;
  payload: T;
}

/**
 * Domain-specific Realtime Topics / Namespaces
 */
export const REALTIME_TOPICS = {
  // Scoped Seat Room: seat:{seatId}
  SEAT_ROOM: (seatId: number | string) => `seat:${normalizeSeatIdentity(seatId).seatId}`,

  // Role broadcast channels
  KITCHEN_FEED: 'kds:kitchen',
  STAFF_ALERTS: 'staff:alerts',
  MANAGER_FEED: 'manager:admin',
} as const;
