-- ============================================================
-- Migration 003: Billing — Mercado Pago subscription support
-- ============================================================

-- Add Mercado Pago fields to tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS mp_preapproval_id TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS mp_payer_email    TEXT;

CREATE INDEX IF NOT EXISTS idx_tenants_mp_preapproval ON tenants (mp_preapproval_id)
    WHERE mp_preapproval_id IS NOT NULL;

-- ── Billing events (immutable audit log) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS billing_events (
    id          BIGSERIAL   PRIMARY KEY,
    tenant_id   UUID        REFERENCES tenants(id) ON DELETE SET NULL,
    mp_id       TEXT        NOT NULL,    -- MP preapproval or payment ID
    event_type  TEXT        NOT NULL,    -- 'subscription.authorized', 'payment.approved', etc.
    plan        TEXT,                    -- 'starter' | 'professional' | 'enterprise'
    amount      NUMERIC(12,2),
    currency    CHAR(3)     NOT NULL DEFAULT 'ARS',
    status      TEXT,                    -- MP object status at the time of event
    raw         JSONB       NOT NULL,    -- full MP API response (never modified)
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_tenant ON billing_events (tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_mp_id  ON billing_events (mp_id);

-- Block UPDATE and DELETE on billing_events to keep it immutable
CREATE OR REPLACE RULE billing_events_no_update AS
    ON UPDATE TO billing_events DO INSTEAD NOTHING;

CREATE OR REPLACE RULE billing_events_no_delete AS
    ON DELETE TO billing_events DO INSTEAD NOTHING;
