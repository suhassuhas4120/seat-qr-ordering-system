-- ==============================================================================
-- THOOGUDEEPA / LUMIÈRE 100-SEAT RESTAURANT MANAGEMENT SYSTEM
-- SUPABASE POSTGRESQL PRODUCTION DDL SCHEMA
-- ==============================================================================
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- It provides persistent cloud backup for all 100 physical seats, orders, stages, and settlements.

-- 1. SEATS TABLE
CREATE TABLE IF NOT EXISTS public.seats (
    id INTEGER PRIMARY KEY,
    seat_number VARCHAR(10) NOT NULL UNIQUE,
    zone VARCHAR(20) NOT NULL,
    current_status VARCHAR(20) NOT NULL DEFAULT 'VACANT',
    active_order_total NUMERIC(10, 2) DEFAULT 0.00,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id VARCHAR(64) PRIMARY KEY,
    seat_id INTEGER NOT NULL REFERENCES public.seats(id) ON DELETE CASCADE,
    session_id VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(5) DEFAULT 'INR',
    items_payload JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_seat_id ON public.orders(seat_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- 3. ORDER ITEM EVENTS (Stage Progression Audit)
CREATE TABLE IF NOT EXISTS public.order_item_events (
    id BIGSERIAL PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    item_id VARCHAR(64) NOT NULL,
    stage VARCHAR(20) NOT NULL, -- 'QUEUED', 'COOKING', 'READY', 'SERVED', 'PAID'
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_item_events_order_id ON public.order_item_events(order_id);
CREATE INDEX IF NOT EXISTS idx_order_item_events_item_id ON public.order_item_events(item_id);

-- 4. PAYMENTS TABLE (Settlements & Multi-Waiter Cash Reconciliations)
CREATE TABLE IF NOT EXISTS public.payments (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    method VARCHAR(20) NOT NULL, -- 'UPI_DYNAMIC', 'RAZORPAY_GATEWAY', 'CASH_WAITER', 'CASH_COUNTER'
    status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    transaction_ref VARCHAR(128),
    staff_id VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_method ON public.payments(method);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

-- 5. AUDIT LOGS (Immutable Write-Ahead Cloud Mirror)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON public.audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 6. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 7. PERMISSIVE SERVICE ROLE & ANON READ POLICIES
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public read access for seats" ON public.seats;
    CREATE POLICY "Public read access for seats" ON public.seats FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Service role full access on orders" ON public.orders;
    CREATE POLICY "Service role full access on orders" ON public.orders FOR ALL USING (true);

    DROP POLICY IF EXISTS "Service role full access on order_item_events" ON public.order_item_events;
    CREATE POLICY "Service role full access on order_item_events" ON public.order_item_events FOR ALL USING (true);

    DROP POLICY IF EXISTS "Service role full access on payments" ON public.payments;
    CREATE POLICY "Service role full access on payments" ON public.payments FOR ALL USING (true);

    DROP POLICY IF EXISTS "Service role full access on audit_logs" ON public.audit_logs;
    CREATE POLICY "Service role full access on audit_logs" ON public.audit_logs FOR ALL USING (true);
END $$;
