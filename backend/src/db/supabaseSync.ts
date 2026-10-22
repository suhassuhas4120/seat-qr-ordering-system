import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Order, Payment, Seat } from '@seat-order/shared';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('placeholder')
);

class SupabaseSyncService {
  private client: SupabaseClient | null = null;
  private isEnabled = false;

  constructor() {
    if (isSupabaseConfigured) {
      try {
        this.client = createClient(supabaseUrl, supabaseKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        });
        this.isEnabled = true;
        console.log('⚡ Supabase Cloud Database Sync: ACTIVE & CONNECTED');
      } catch (err) {
        console.warn('⚠️ Failed to initialize Supabase client:', err);
      }
    } else {
      console.log('ℹ️ Supabase credentials not set - Operating in ultra-fast local ACID + WAL mode.');
    }
  }

  /**
   * Asynchronously mirrors an order to Supabase Postgres.
   * Completely non-blocking — local requests respond at sub-millisecond speeds.
   */
  public async syncOrder(order: Order): Promise<void> {
    if (!this.isEnabled || !this.client) return;

    try {
      const { error } = await this.client
        .from('orders')
        .upsert({
          id: order.id,
          seat_id: order.seatId,
          session_id: order.sessionId,
          status: order.overallStage,
          total_amount: order.items.reduce((sum, item) => sum + (item.priceSnapshot * item.quantity), 0),
          currency: 'INR',
          created_at: order.placedAt,
          items_payload: order.items,
        }, { onConflict: 'id' });

      if (error) {
        console.warn(`[SupabaseSync] Failed to sync order ${order.id}:`, error.message);
      }
    } catch (err: any) {
      console.warn(`[SupabaseSync] Error syncing order ${order.id}:`, err?.message || err);
    }
  }

  /**
   * Asynchronously updates dish stage in cloud database.
   */
  public async syncItemStage(orderId: string, itemId: string, stage: string): Promise<void> {
    if (!this.isEnabled || !this.client) return;

    try {
      const { error } = await this.client
        .from('order_item_events')
        .insert({
          order_id: orderId,
          item_id: itemId,
          stage,
          recorded_at: new Date().toISOString(),
        });

      if (error) {
        console.warn(`[SupabaseSync] Failed to log stage event:`, error.message);
      }
    } catch (err: any) {
      console.warn(`[SupabaseSync] Error logging stage:`, err?.message || err);
    }
  }

  /**
   * Asynchronously mirrors financial settlement to Supabase.
   */
  public async syncPayment(payment: Payment): Promise<void> {
    if (!this.isEnabled || !this.client) return;

    try {
      const { error } = await this.client
        .from('payments')
        .upsert({
          id: payment.id,
          order_id: payment.sessionId, // linked to session
          amount: payment.finalAmount,
          method: payment.gateway,
          status: payment.status,
          transaction_ref: payment.gatewayPaymentId || null,
          staff_id: payment.staffId ? String(payment.staffId) : null,
          created_at: payment.completedAt || new Date().toISOString(),
        }, { onConflict: 'id' });

      if (error) {
        console.warn(`[SupabaseSync] Failed to sync payment ${payment.id}:`, error.message);
      }
    } catch (err: any) {
      console.warn(`[SupabaseSync] Error syncing payment ${payment.id}:`, err?.message || err);
    }
  }

  /**
   * Asynchronously records an audit log entry.
   */
  public async syncAuditLog(type: string, payload: any): Promise<void> {
    if (!this.isEnabled || !this.client) return;

    try {
      await this.client
        .from('audit_logs')
        .insert({
          event_type: type,
          payload,
          created_at: new Date().toISOString(),
        });
    } catch {
      // Silently ignore cloud audit log failures
    }
  }

  /**
   * Syncs seat live state.
   */
  public async syncSeat(seat: Seat): Promise<void> {
    if (!this.isEnabled || !this.client) return;

    try {
      await this.client
        .from('seats')
        .upsert({
          id: seat.id,
          seat_number: seat.seatNumber,
          zone: seat.zone,
          current_status: seat.currentStatus,
          active_order_total: seat.activeOrderTotal || 0,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
    } catch {
      // Non-blocking
    }
  }
}

export const supabaseSync = new SupabaseSyncService();
