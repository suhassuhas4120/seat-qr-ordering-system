-- ==============================================================================
-- THOOGUDEEPA / LUMIÈRE 100-SEAT RESTAURANT MANAGEMENT SYSTEM
-- ULTRA-ELITE PRODUCTION SUPABASE POSTGRESQL DDL SCHEMA
-- ==============================================================================
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- It provides zero-fault cloud persistence for all 100 physical seats, Takeaway (TK-01),
-- dining sessions, orders, KDS item stages, settlements, and service alerts.

-- 1. SEATS TABLE
CREATE TABLE IF NOT EXISTS public.seats (
    id INTEGER PRIMARY KEY,
    seat_number VARCHAR(10) NOT NULL UNIQUE,
    zone VARCHAR(20) NOT NULL,
    current_status VARCHAR(20) NOT NULL DEFAULT 'VACANT',
    active_order_total NUMERIC(10, 2) DEFAULT 0.00,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Takeaway (Seat 0) and Dine-In (Seats 1..100)
INSERT INTO public.seats (id, seat_number, zone, current_status)
VALUES (0, 'TK-01', 'COUNTER_A', 'VACANT')
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
    FOR i IN 1..100 LOOP
        INSERT INTO public.seats (id, seat_number, zone, current_status)
        VALUES (
            i,
            'S' || LPAD(i::text, 3, '0'),
            CASE 
                WHEN i <= 20 THEN 'COUNTER_A'
                WHEN i <= 40 THEN 'COUNTER_B'
                WHEN i <= 60 THEN 'BAR'
                WHEN i <= 80 THEN 'WINDOW'
                ELSE 'CENTER'
            END,
            'VACANT'
        )
        ON CONFLICT (id) DO NOTHING;
    END LOOP;
END $$;

-- 2. SEAT SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.seat_sessions (
    id VARCHAR(64) PRIMARY KEY,
    seat_id INTEGER NOT NULL REFERENCES public.seats(id) ON DELETE CASCADE,
    session_token VARCHAR(128) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'SETTLING', 'COMPLETED'
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_seat_sessions_seat ON public.seat_sessions(seat_id, status);

-- 3. ORDERS TABLE (Supports multiple KOT batches per dining session)
CREATE TABLE IF NOT EXISTS public.orders (
    id VARCHAR(64) PRIMARY KEY,
    seat_id INTEGER NOT NULL REFERENCES public.seats(id) ON DELETE CASCADE,
    session_id VARCHAR(64) NOT NULL REFERENCES public.seat_sessions(id) ON DELETE CASCADE,
    ticket_number VARCHAR(32) NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'PLACED', 'PREPARING', 'READY', 'SERVED', 'PAID'
    total_amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(5) DEFAULT 'INR',
    items_payload JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_seat_id ON public.orders(seat_id);
CREATE INDEX IF NOT EXISTS idx_orders_session_id ON public.orders(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- 4. ORDER ITEM STAGE EVENTS (Stage Progression Audit for KDS analytics)
CREATE TABLE IF NOT EXISTS public.order_item_events (
    id BIGSERIAL PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    item_id VARCHAR(64) NOT NULL,
    stage VARCHAR(20) NOT NULL, -- 'QUEUED', 'COOKING', 'READY', 'SERVED', 'PAID'
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_item_events_order_id ON public.order_item_events(order_id);
CREATE INDEX IF NOT EXISTS idx_order_item_events_item_id ON public.order_item_events(item_id);

-- 5. PAYMENTS TABLE (Settlements linked to Session & Seat, preventing 1-to-1 order lock)
CREATE TABLE IF NOT EXISTS public.payments (
    id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL REFERENCES public.seat_sessions(id) ON DELETE CASCADE,
    seat_id INTEGER NOT NULL REFERENCES public.seats(id) ON DELETE CASCADE,
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    final_amount NUMERIC(10, 2) NOT NULL,
    method VARCHAR(30) NOT NULL, -- 'UPI', 'RAZORPAY', 'STRIPE', 'CASH'
    status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    transaction_ref VARCHAR(128),
    settled_by_role VARCHAR(30) NOT NULL, -- 'CUSTOMER_SELF', 'WAITER', 'MANAGER'
    staff_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_session_id ON public.payments(session_id);
CREATE INDEX IF NOT EXISTS idx_payments_seat_id ON public.payments(seat_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

-- 6. SERVICE ALERTS TABLE (Floor Captain & Bill requests)
CREATE TABLE IF NOT EXISTS public.service_alerts (
    id VARCHAR(64) PRIMARY KEY,
    seat_id INTEGER NOT NULL REFERENCES public.seats(id) ON DELETE CASCADE,
    alert_type VARCHAR(30) NOT NULL, -- 'customer_call', 'kitchen_ready', 'bill_requested'
    title VARCHAR(128) NOT NULL,
    message TEXT NOT NULL,
    bill_amount NUMERIC(10, 2) DEFAULT 0.00,
    is_urgent BOOLEAN DEFAULT true,
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alerts_unresolved ON public.service_alerts(seat_id, is_resolved);

-- 7. AUDIT LOGS (Immutable Write-Ahead Cloud Mirror)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON public.audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    -- Read policies (Public floor status visibility for customer menu/tracking)
    DROP POLICY IF EXISTS "Public read access for seats" ON public.seats;
    CREATE POLICY "Public read access for seats" ON public.seats FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public read access for sessions" ON public.seat_sessions;
    CREATE POLICY "Public read access for sessions" ON public.seat_sessions FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public read access for orders" ON public.orders;
    CREATE POLICY "Public read access for orders" ON public.orders FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public read access for order events" ON public.order_item_events;
    CREATE POLICY "Public read access for order events" ON public.order_item_events FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public read access for payments" ON public.payments;
    CREATE POLICY "Public read access for payments" ON public.payments FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public read access for alerts" ON public.service_alerts;
    CREATE POLICY "Public read access for alerts" ON public.service_alerts FOR SELECT USING (true);

    -- Strict write policies: Only backend service role key can insert/update/delete
    DROP POLICY IF EXISTS "Service role write on seats" ON public.seats;
    CREATE POLICY "Service role write on seats" ON public.seats FOR ALL USING (auth.role() = 'service_role');

    DROP POLICY IF EXISTS "Service role write on sessions" ON public.seat_sessions;
    CREATE POLICY "Service role write on sessions" ON public.seat_sessions FOR ALL USING (auth.role() = 'service_role');

    DROP POLICY IF EXISTS "Service role write on orders" ON public.orders;
    CREATE POLICY "Service role write on orders" ON public.orders FOR ALL USING (auth.role() = 'service_role');

    DROP POLICY IF EXISTS "Service role write on order_item_events" ON public.order_item_events;
    CREATE POLICY "Service role write on order_item_events" ON public.order_item_events FOR ALL USING (auth.role() = 'service_role');

    DROP POLICY IF EXISTS "Service role write on payments" ON public.payments;
    CREATE POLICY "Service role write on payments" ON public.payments FOR ALL USING (auth.role() = 'service_role');

    DROP POLICY IF EXISTS "Service role write on service_alerts" ON public.service_alerts;
    CREATE POLICY "Service role write on service_alerts" ON public.service_alerts FOR ALL USING (auth.role() = 'service_role');

    DROP POLICY IF EXISTS "Service role write on audit_logs" ON public.audit_logs;
    CREATE POLICY "Service role write on audit_logs" ON public.audit_logs FOR ALL USING (auth.role() = 'service_role');
END $$;
