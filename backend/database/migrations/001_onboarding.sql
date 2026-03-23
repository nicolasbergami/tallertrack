-- =============================================================================
-- Migration 001: Onboarding — registro de nuevos talleres con OTP WhatsApp
-- =============================================================================

-- Índices únicos en tenants para prevenir registros duplicados.
-- Se aplican a TODOS los registros (incluyendo soft-deleted) para bloquear
-- el reuso de CUIT/WhatsApp aunque la cuenta haya sido cancelada.
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenants_tax_id
    ON tenants (tax_id) WHERE tax_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tenants_phone
    ON tenants (phone) WHERE phone IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Tabla de registros pendientes de verificación
-- Almacena el intento de registro ANTES de que se verifique el WhatsApp.
-- Una vez verificado, se crea el tenant + usuario y se marca como 'verified'.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_registrations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Datos del taller
    workshop_name   TEXT NOT NULL,
    email           TEXT NOT NULL,
    password_hash   TEXT NOT NULL,
    cuit            TEXT NOT NULL,          -- solo dígitos: "20123456789"
    whatsapp        TEXT NOT NULL,          -- E.164: "+5491112345678"

    -- OTP
    otp_hash        TEXT NOT NULL,          -- SHA-256("id:código")
    otp_expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '10 minutes',
    otp_attempts    SMALLINT NOT NULL DEFAULT 0,   -- máx 5 → inválida
    resend_count    SMALLINT NOT NULL DEFAULT 0,   -- máx 3 reenvíos
    last_resend_at  TIMESTAMPTZ,

    -- Estado
    status          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'verified', 'expired')),
    tenant_id       UUID REFERENCES tenants (id) ON DELETE SET NULL,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_reg_email    ON tenant_registrations (email);
CREATE INDEX IF NOT EXISTS idx_tenant_reg_cuit     ON tenant_registrations (cuit);
CREATE INDEX IF NOT EXISTS idx_tenant_reg_whatsapp ON tenant_registrations (whatsapp);
CREATE INDEX IF NOT EXISTS idx_tenant_reg_status   ON tenant_registrations (status, created_at);

DROP TRIGGER IF EXISTS trg_tenant_reg_updated_at ON tenant_registrations;
CREATE TRIGGER trg_tenant_reg_updated_at
    BEFORE UPDATE ON tenant_registrations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
