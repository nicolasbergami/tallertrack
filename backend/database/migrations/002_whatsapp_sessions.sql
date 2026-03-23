-- ============================================================
-- Migration 002: WhatsApp direct sessions
-- Multi-tenant Baileys session persistence
-- ============================================================

-- Main credentials row (one per tenant, stores Baileys AuthenticationCreds as JSONB)
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
    tenant_id   UUID        PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    creds       JSONB       NOT NULL,
    status      TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'connected', 'disconnected')),
    phone       TEXT,                           -- linked WhatsApp phone number
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Signal key store rows (Baileys cryptographic keys — many per tenant)
CREATE TABLE IF NOT EXISTS whatsapp_session_keys (
    tenant_id   TEXT    NOT NULL,
    key_type    TEXT    NOT NULL,
    key_id      TEXT    NOT NULL,
    key_data    JSONB   NOT NULL,
    PRIMARY KEY (tenant_id, key_type, key_id)
);

-- Index for fast tenant-scoped key lookups
CREATE INDEX IF NOT EXISTS idx_wa_keys_tenant ON whatsapp_session_keys (tenant_id);

-- Auto-update updated_at on whatsapp_sessions
DO $$ BEGIN
    CREATE TRIGGER set_updated_at_whatsapp_sessions
        BEFORE UPDATE ON whatsapp_sessions
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
