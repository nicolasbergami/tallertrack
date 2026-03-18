-- =============================================================================
-- TallerTrack - PostgreSQL Schema
-- Multi-tenancy strategy: Shared Database, Shared Schema
-- Row-Level Security (RLS) enforced at DB level
-- =============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
CREATE TYPE subscription_plan AS ENUM ('free', 'starter', 'professional', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'trialing', 'past_due', 'canceled', 'paused');

CREATE TYPE user_role AS ENUM ('owner', 'admin', 'mechanic', 'receptionist');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');

CREATE TYPE work_order_status AS ENUM (
    'received',
    'diagnosing',
    'awaiting_approval',
    'approved',
    'in_progress',
    'awaiting_parts',
    'completed',
    'delivered',
    'cancelled'
);

CREATE TYPE quote_status AS ENUM ('draft', 'sent', 'approved', 'rejected', 'expired');

CREATE TYPE item_type AS ENUM ('labor', 'part', 'consumable', 'external_service');

-- ---------------------------------------------------------------------------
-- 1. TENANTS (Talleres)
-- ---------------------------------------------------------------------------
CREATE TABLE tenants (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug             TEXT NOT NULL UNIQUE,          -- subdomain: "taller-gomez.tallertrack.com"
    name             TEXT NOT NULL,
    tax_id           TEXT,                          -- RUT / CUIT / RFC
    phone            TEXT,
    email            TEXT,
    address          TEXT,
    city             TEXT,
    country          CHAR(2) NOT NULL DEFAULT 'CL', -- ISO 3166-1

    -- Subscription
    plan             subscription_plan    NOT NULL DEFAULT 'free',
    sub_status       subscription_status  NOT NULL DEFAULT 'trialing',
    trial_ends_at    TIMESTAMPTZ,
    sub_current_period_start TIMESTAMPTZ,
    sub_current_period_end   TIMESTAMPTZ,
    max_users        SMALLINT NOT NULL DEFAULT 3,
    max_vehicles     INT      NOT NULL DEFAULT 100,

    -- Settings (JSON flexible: timezone, currency, logo_url, etc.)
    settings         JSONB    NOT NULL DEFAULT '{}',

    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ                     -- soft delete
);

CREATE INDEX idx_tenants_slug ON tenants (slug);

-- ---------------------------------------------------------------------------
-- 2. USERS (Mecánicos / Dueños)
-- ---------------------------------------------------------------------------
CREATE TABLE users (
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

    -- Email único POR tenant (dos tenants pueden tener el mismo email)
    CONSTRAINT uq_users_tenant_email UNIQUE (tenant_id, email)
);

CREATE INDEX idx_users_tenant_id  ON users (tenant_id);
CREATE INDEX idx_users_email      ON users (email);

-- ---------------------------------------------------------------------------
-- 3. CLIENTS (Clientes)
-- ---------------------------------------------------------------------------
CREATE TABLE clients (
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

CREATE INDEX idx_clients_tenant_id ON clients (tenant_id);

-- ---------------------------------------------------------------------------
-- 4. VEHICLES (Vehículos)
-- ---------------------------------------------------------------------------
CREATE TABLE vehicles (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    client_id        UUID NOT NULL REFERENCES clients (id) ON DELETE RESTRICT,

    license_plate    TEXT NOT NULL,
    vin              TEXT,                          -- número de chasis
    brand            TEXT NOT NULL,
    model            TEXT NOT NULL,
    year             SMALLINT,
    color            TEXT,
    fuel_type        TEXT,
    engine_cc        INT,
    mileage_km       INT,                           -- último odómetro registrado
    notes            TEXT,

    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ,

    -- Patente única dentro del taller
    CONSTRAINT uq_vehicles_tenant_plate UNIQUE (tenant_id, license_plate)
);

CREATE INDEX idx_vehicles_tenant_id  ON vehicles (tenant_id);
CREATE INDEX idx_vehicles_client_id  ON vehicles (client_id);

-- ---------------------------------------------------------------------------
-- 5. WORK ORDERS (Órdenes de Trabajo)
-- ---------------------------------------------------------------------------
CREATE TABLE work_orders (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    vehicle_id       UUID NOT NULL REFERENCES vehicles (id) ON DELETE RESTRICT,
    client_id        UUID NOT NULL REFERENCES clients (id) ON DELETE RESTRICT,

    order_number     TEXT NOT NULL,                -- "OT-2024-00042" generado por app
    status           work_order_status NOT NULL DEFAULT 'received',

    mileage_in       INT,                          -- odómetro al ingreso
    mileage_out      INT,                          -- odómetro a la entrega
    complaint        TEXT NOT NULL,                -- falla reportada por cliente
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

CREATE INDEX idx_work_orders_tenant_id  ON work_orders (tenant_id);
CREATE INDEX idx_work_orders_vehicle_id ON work_orders (vehicle_id);
CREATE INDEX idx_work_orders_client_id  ON work_orders (client_id);
CREATE INDEX idx_work_orders_status     ON work_orders (tenant_id, status);

-- ---------------------------------------------------------------------------
-- 6. QUOTES (Presupuestos)
-- ---------------------------------------------------------------------------
CREATE TABLE quotes (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    work_order_id    UUID NOT NULL REFERENCES work_orders (id) ON DELETE CASCADE,

    quote_number     TEXT NOT NULL,
    status           quote_status NOT NULL DEFAULT 'draft',

    subtotal         NUMERIC(12, 2) NOT NULL DEFAULT 0,
    tax_rate         NUMERIC(5, 4)  NOT NULL DEFAULT 0.19,  -- 19% IVA por defecto
    tax_amount       NUMERIC(12, 2) GENERATED ALWAYS AS (subtotal * tax_rate) STORED,
    total            NUMERIC(12, 2) GENERATED ALWAYS AS (subtotal * (1 + tax_rate)) STORED,

    notes            TEXT,
    valid_until      DATE,

    created_by       UUID REFERENCES users (id) ON DELETE SET NULL,
    approved_by_client BOOLEAN NOT NULL DEFAULT FALSE,
    approved_at      TIMESTAMPTZ,

    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_quotes_tenant_number UNIQUE (tenant_id, quote_number)
);

CREATE INDEX idx_quotes_tenant_id      ON quotes (tenant_id);
CREATE INDEX idx_quotes_work_order_id  ON quotes (work_order_id);

-- ---------------------------------------------------------------------------
-- 7. QUOTE ITEMS (Ítems de Presupuesto)
-- ---------------------------------------------------------------------------
CREATE TABLE quote_items (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id         UUID NOT NULL REFERENCES quotes (id) ON DELETE CASCADE,
    tenant_id        UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,

    item_type        item_type NOT NULL,
    description      TEXT NOT NULL,
    part_number      TEXT,                          -- código de repuesto
    quantity         NUMERIC(10, 3) NOT NULL DEFAULT 1,
    unit_price       NUMERIC(12, 2) NOT NULL,
    discount_pct     NUMERIC(5, 2)  NOT NULL DEFAULT 0,
    line_total       NUMERIC(12, 2) GENERATED ALWAYS AS (
                         quantity * unit_price * (1 - discount_pct / 100)
                     ) STORED,

    sort_order       SMALLINT NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quote_items_quote_id   ON quote_items (quote_id);
CREATE INDEX idx_quote_items_tenant_id  ON quote_items (tenant_id);

-- ---------------------------------------------------------------------------
-- 8. HISTORY LOGS (Trazabilidad Inmutable)
-- ---------------------------------------------------------------------------
CREATE TABLE history_logs (
    id               BIGSERIAL PRIMARY KEY,         -- BIGSERIAL, no UUID (volumen alto)
    tenant_id        UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,

    entity_type      TEXT NOT NULL,                 -- 'work_order', 'quote', 'vehicle', ...
    entity_id        UUID NOT NULL,
    action           TEXT NOT NULL,                 -- 'status_changed', 'created', 'updated', ...

    old_values       JSONB,                         -- snapshot anterior
    new_values       JSONB,                         -- snapshot nuevo
    changed_fields   TEXT[],                        -- campos modificados

    performed_by     UUID REFERENCES users (id) ON DELETE SET NULL,
    performed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    ip_address       INET,
    user_agent       TEXT,
    metadata         JSONB DEFAULT '{}'
    -- SIN updated_at / deleted_at: los logs son INMUTABLES
);

CREATE INDEX idx_history_tenant_id    ON history_logs (tenant_id);
CREATE INDEX idx_history_entity       ON history_logs (tenant_id, entity_type, entity_id);
CREATE INDEX idx_history_performed_at ON history_logs (tenant_id, performed_at DESC);

-- Prevenir UPDATE y DELETE en la tabla de logs
CREATE RULE no_update_history AS ON UPDATE TO history_logs DO INSTEAD NOTHING;
CREATE RULE no_delete_history AS ON DELETE TO history_logs DO INSTEAD NOTHING;

-- =============================================================================
-- ROW-LEVEL SECURITY (RLS) — El corazón del multi-tenancy
-- =============================================================================

-- Habilitar RLS en todas las tablas de datos
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients        ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE history_logs   ENABLE ROW LEVEL SECURITY;

-- La app setea la variable de sesión al autenticar al usuario
-- SET app.current_tenant_id = '<uuid>';

CREATE POLICY tenant_isolation ON users
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation ON clients
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation ON vehicles
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation ON work_orders
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation ON quotes
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation ON quote_items
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation ON history_logs
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- =============================================================================
-- TRIGGER: auto-update de updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_vehicles_updated_at
    BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_work_orders_updated_at
    BEFORE UPDATE ON work_orders
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_quotes_updated_at
    BEFORE UPDATE ON quotes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TRIGGER: recalcular subtotal de quote cuando cambian los items
-- =============================================================================
CREATE OR REPLACE FUNCTION sync_quote_subtotal()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE quotes
       SET subtotal = (
               SELECT COALESCE(SUM(line_total), 0)
                 FROM quote_items
                WHERE quote_id = COALESCE(NEW.quote_id, OLD.quote_id)
           )
     WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_quote_subtotal
    AFTER INSERT OR UPDATE OR DELETE ON quote_items
    FOR EACH ROW EXECUTE FUNCTION sync_quote_subtotal();

-- =============================================================================
-- ROLES DE BASE DE DATOS
-- =============================================================================

-- Rol de la aplicación (backend API): acceso a datos, respeta RLS
CREATE ROLE tallertrack_app LOGIN PASSWORD 'CHANGE_ME_IN_PROD';
GRANT CONNECT ON DATABASE tallertrack TO tallertrack_app;
GRANT USAGE  ON SCHEMA public TO tallertrack_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tallertrack_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tallertrack_app;

-- Rol de migraciones (bypasses RLS para DDL)
CREATE ROLE tallertrack_migrator LOGIN PASSWORD 'CHANGE_ME_IN_PROD';
GRANT tallertrack_app TO tallertrack_migrator;
ALTER ROLE tallertrack_migrator BYPASSRLS;

-- =============================================================================
-- SEED: Tenant de ejemplo
-- =============================================================================
INSERT INTO tenants (slug, name, country, plan, sub_status, settings)
VALUES (
    'taller-demo',
    'Taller Demo S.A.',
    'CL',
    'starter',
    'trialing',
    '{"timezone": "America/Santiago", "currency": "CLP", "logo_url": null}'
);
