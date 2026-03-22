-- ============================================================
-- Migration 003: Trial Abuse Guard — WhatsApp phone registry
-- ============================================================
-- Adds a persistent "burned" phone number column to tenants.
-- Once a WhatsApp number is successfully connected to any tenant
-- (trial OR paid), it gets recorded here. Future trial accounts
-- that attempt to reuse the same number are blocked immediately.
-- ============================================================

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- Partial unique index: enforces one-tenant-per-number,
-- but only for rows where the number is actually set.
-- NULL values (tenants that never connected WA) are excluded.
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_whatsapp_number
  ON tenants (whatsapp_number)
  WHERE whatsapp_number IS NOT NULL;
