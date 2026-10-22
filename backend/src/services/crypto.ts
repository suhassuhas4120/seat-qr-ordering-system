import crypto from 'crypto';

const HMAC_SECRET = process.env.HMAC_SECRET || 'restaurant-ultra-pro-max-secret-key-2026';

/**
 * Generate cryptographic signature for a seat URL based on its current epoch hash.
 * URL: /seat/:seatId?sig=...
 */
export function generateSeatSignature(seatId: number, epochHash: string): string {
  const hmac = crypto.createHmac('sha256', HMAC_SECRET);
  hmac.update(`seat:${seatId}:epoch:${epochHash}`);
  return hmac.digest('hex').substring(0, 32);
}

/**
 * Verify signature matches the current seat's epoch hash.
 * Protects against URL tampering (e.g. changing /seat/14 to /seat/15).
 */
export function verifySeatSignature(seatId: number, epochHash: string, providedSig: string): boolean {
  if (!providedSig) return false;
  const expectedSig = generateSeatSignature(seatId, epochHash);
  try {
    return crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(providedSig));
  } catch {
    return false;
  }
}

/**
 * Mint a high-entropy 64-character ephemeral session token for a newly claimed seat.
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
