-- =============================================================================
-- TallerTrack — Migration 000: Initial Schema
-- Idempotente: puede re-ejecutarse sin errores
-- Para agregar cambios futuros: crea 001_xxx.sql, 002_xxx.sql, etc.
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
DO $$ BEGIN CREATE TYPE subscription_plan AS ENUM ('free','starter','professional','enterprise');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE subscription_status AS ENUM ('active','trialing','past_due','canceled','paused');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE user_role AS ENUM ('owner','admin','mechanic','receptionist');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE user_status AS ENUM ('active','inactive','suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE work_order_status AS ENUM (
    'received', 'diagnosing', 'awaiting_parts', 'in_progress',
    'quality_control', 'ready', 'delivered', 'cancelled'
);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE quote_status AS ENUM ('draft','sent','approved','rejected','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE item_type AS ENUM ('labor','part','consumable','external_service');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- TABLAS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tenants (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug             TEXT NOT NULL UNIQUE,
    name             TEXT NOT NULL,
    tax_id           TEXT,
    phone            TEXT,
    email            TEXT,
    address          TEXT,
    city             TEXT,
    country          CHAR(2) NOT NULL DEFAULT 'CL',
    plan             subscription_plan   NOT NULL DEFAULT 'free',
    sub_status       subscription_status NOT NULL DEFAULT 'trialing',
    trial_ends_at    TIMESTAMPTZ,
    sub_current_period_start TIMESTAMPTZ,
    sub_current_period_end   TIMESTAMPTZ,
    max_users        SMALLINT NOT NULL DEFAULT 3,
    max_vehicles     INT      NOT NULL DEFAULT 100,
    settings         JSONB    NOT NULL DEFAULT '{}',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants (slug);

CREATE TABLE IF NOT EXISTS users (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    email            TEXT NOT NULL,
    password_hash    TEXT NOT NULL,
    full_name        TEXT NOT NULL,
    phone            TEXT,
    avatar_url       TEXT,
    role             user_role   NOT NULL DEFAULT 'mechanic',
    status           user_status NOT NULL DEFAULT 'active',
    last_login_at    TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_users_tenant_email UNIQUE (tenant_id, email)
);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users (tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email     ON users (email);

CREATE TABLE IF NOT EXISTS clients (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    full_name        TEXT NOT NULL,
    tax_id           TEXT,
    email            TEXT,
    phone            TEXT,
    address          TEXT,
    notes            TEXT,
    created_by       UUID REFERENCES users (id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_clients_tenant_tax_id UNIQUE (tenant_id, tax_id)
);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_id ON clients (tenant_id);

CREATE TABLE IF NOT EXISTS vehicles (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    client_id        UUID NOT NULL REFERENCES clients (id) ON DELETE RESTRICT,
    license_plate    TEXT NOT NULL,
    vin              TEXT,
    brand            TEXT NOT NULL,
    model            TEXT NOT NULL,
    year             SMALLINT,
    color            TEXT,
    fuel_type        TEXT,
    engine_cc        INT,
    mileage_km       INT,
    notes            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_vehicles_tenant_plate UNIQUE (tenant_id, license_plate)
);
CREATE INDEX IF NOT EXISTS idx_vehicles_tenant_id ON vehicles (tenant_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_client_id ON vehicles (client_id);

CREATE TABLE IF NOT EXISTS work_orders (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    vehicle_id       UUID NOT NULL REFERENCES vehicles (id) ON DELETE RESTRICT,
    client_id        UUID NOT NULL REFERENCES clients (id) ON DELETE RESTRICT,
    order_number     TEXT NOT NULL,
    status           work_order_status NOT NULL DEFAULT 'received',
    mileage_in       INT,
    mileage_out      INT,
    complaint        TEXT NOT NULL,
    diagnosis        TEXT,
    internal_notes   TEXT,
    assigned_to      UUID REFERENCES users (id) ON DELETE SET NULL,
    received_by      UUID REFERENCES users (id) ON DELETE SET NULL,
    received_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    estimated_delivery TIMESTAMPTZ,
    delivered_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_work_orders_tenant_number UNIQUE (tenant_id, order_number)
);
CREATE INDEX IF NOT EXISTS idx_work_orders_tenant_id  ON work_orders (tenant_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_vehicle_id ON work_orders (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_client_id  ON work_orders (client_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status     ON work_orders (tenant_id, status);

CREATE TABLE IF NOT EXISTS quotes (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    work_order_id    UUID NOT NULL REFERENCES work_orders (id) ON DELETE CASCADE,
    quote_number     TEXT NOT NULL,
    status           quote_status NOT NULL DEFAULT 'draft',
    subtotal         NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_rate         NUMERIC(5,4)  NOT NULL DEFAULT 0.19,
    tax_amount       NUMERIC(12,2) GENERATED ALWAYS AS (subtotal * tax_rate) STORED,
    total            NUMERIC(12,2) GENERATED ALWAYS AS (subtotal * (1 + tax_rate)) STORED,
    notes            TEXT,
    valid_until      DATE,
    created_by       UUID REFERENCES users (id) ON DELETE SET NULL,
    approved_by_client BOOLEAN NOT NULL DEFAULT FALSE,
    approved_at      TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_quotes_tenant_number UNIQUE (tenant_id, quote_number)
);
CREATE INDEX IF NOT EXISTS idx_quotes_tenant_id     ON quotes (tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotes_work_order_id ON quotes (work_order_id);

CREATE TABLE IF NOT EXISTS quote_items (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id         UUID NOT NULL REFERENCES quotes (id) ON DELETE CASCADE,
    tenant_id        UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    item_type        item_type NOT NULL,
    description      TEXT NOT NULL,
    part_number      TEXT,
    quantity         NUMERIC(10,3) NOT NULL DEFAULT 1,
    unit_price       NUMERIC(12,2) NOT NULL,
    discount_pct     NUMERIC(5,2)  NOT NULL DEFAULT 0,
    line_total       NUMERIC(12,2) GENERATED ALWAYS AS (
                         quantity * unit_price * (1 - discount_pct / 100)
                     ) STORED,
    sort_order       SMALLINT NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id  ON quote_items (quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_tenant_id ON quote_items (tenant_id);

CREATE TABLE IF NOT EXISTS history_logs (
    id             BIGSERIAL PRIMARY KEY,
    tenant_id      UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    entity_type    TEXT NOT NULL,
    entity_id      UUID NOT NULL,
    action         TEXT NOT NULL,
    old_values     JSONB,
    new_values     JSONB,
    changed_fields TEXT[],
    performed_by   UUID REFERENCES users (id) ON DELETE SET NULL,
    performed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address     INET,
    user_agent     TEXT,
    metadata       JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_history_tenant_id    ON history_logs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_history_entity       ON history_logs (tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_history_performed_at ON history_logs (tenant_id, performed_at DESC);

DROP RULE IF EXISTS no_update_history ON history_logs;
CREATE RULE no_update_history AS ON UPDATE TO history_logs DO INSTEAD NOTHING;
DROP RULE IF EXISTS no_delete_history ON history_logs;
CREATE RULE no_delete_history AS ON DELETE TO history_logs DO INSTEAD NOTHING;

-- ---------------------------------------------------------------------------
-- ROW-LEVEL SECURITY
-- (current_setting con missing_ok=true → devuelve NULL en vez de error)
-- ---------------------------------------------------------------------------
ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients      ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders  ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE history_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON users;
CREATE POLICY tenant_isolation ON users
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

DROP POLICY IF EXISTS tenant_isolation ON clients;
CREATE POLICY tenant_isolation ON clients
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

DROP POLICY IF EXISTS tenant_isolation ON vehicles;
CREATE POLICY tenant_isolation ON vehicles
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

DROP POLICY IF EXISTS tenant_isolation ON work_orders;
CREATE POLICY tenant_isolation ON work_orders
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

DROP POLICY IF EXISTS tenant_isolation ON quotes;
CREATE POLICY tenant_isolation ON quotes
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

DROP POLICY IF EXISTS tenant_isolation ON quote_items;
CREATE POLICY tenant_isolation ON quote_items
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

DROP POLICY IF EXISTS tenant_isolation ON history_logs;
CREATE POLICY tenant_isolation ON history_logs
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- ---------------------------------------------------------------------------
-- FUNCIONES Y TRIGGERS
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_tenants_updated_at    ON tenants;
CREATE TRIGGER trg_tenants_updated_at    BEFORE UPDATE ON tenants    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated_at      ON users;
CREATE TRIGGER trg_users_updated_at      BEFORE UPDATE ON users      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_clients_updated_at    ON clients;
CREATE TRIGGER trg_clients_updated_at    BEFORE UPDATE ON clients    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_vehicles_updated_at   ON vehicles;
CREATE TRIGGER trg_vehicles_updated_at   BEFORE UPDATE ON vehicles   FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_work_orders_updated_at ON work_orders;
CREATE TRIGGER trg_work_orders_updated_at BEFORE UPDATE ON work_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_quotes_updated_at     ON quotes;
CREATE TRIGGER trg_quotes_updated_at     BEFORE UPDATE ON quotes     FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION sync_quote_subtotal()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE quotes
       SET subtotal = (SELECT COALESCE(SUM(line_total), 0)
                         FROM quote_items
                        WHERE quote_id = COALESCE(NEW.quote_id, OLD.quote_id))
     WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_quote_subtotal ON quote_items;
CREATE TRIGGER trg_sync_quote_subtotal
    AFTER INSERT OR UPDATE OR DELETE ON quote_items
    FOR EACH ROW EXECUTE FUNCTION sync_quote_subtotal();
