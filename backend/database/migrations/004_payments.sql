-- Migration 004: Payment tracking on work_orders
-- Run as: tallertrack_migrator

ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS payment_status  TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'partial', 'paid')),
  ADD COLUMN IF NOT EXISTS payment_method  TEXT
    CHECK (payment_method IN ('cash', 'transfer', 'card', 'mercadopago', 'other')),
  ADD COLUMN IF NOT EXISTS paid_amount     NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS paid_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_notes   TEXT;

-- Index for "pending payments" dashboard query
CREATE INDEX IF NOT EXISTS idx_work_orders_payment_status
  ON work_orders (tenant_id, payment_status)
  WHERE deleted_at IS NULL;
