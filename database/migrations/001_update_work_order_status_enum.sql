-- Migration 001: Update work_order_status enum to match business flow
-- Recibido → Diagnóstico → Esperando Repuestos → Reparación → Control Calidad → Listo → Entregado
--
-- PostgreSQL does not support removing enum values, so we recreate the type.
-- Run this inside a transaction.

BEGIN;

-- Step 1: Remove the existing default so we can alter the column
ALTER TABLE work_orders ALTER COLUMN status DROP DEFAULT;

-- Step 2: Rename old type
ALTER TYPE work_order_status RENAME TO work_order_status_old;

-- Step 3: Create the new enum with the canonical business flow
CREATE TYPE work_order_status AS ENUM (
    'received',         -- Recibido
    'diagnosing',       -- En diagnóstico
    'awaiting_parts',   -- Esperando repuestos
    'in_progress',      -- En reparación
    'quality_control',  -- Control de calidad
    'ready',            -- Listo para retirar
    'delivered',        -- Entregado
    'cancelled'         -- Cancelado
);

-- Step 4: Migrate existing data (map old values to new ones)
ALTER TABLE work_orders
    ALTER COLUMN status TYPE work_order_status
    USING (
        CASE status::TEXT
            WHEN 'received'          THEN 'received'
            WHEN 'diagnosing'        THEN 'diagnosing'
            WHEN 'awaiting_approval' THEN 'diagnosing'   -- fold into diagnosing
            WHEN 'approved'          THEN 'in_progress'
            WHEN 'in_progress'       THEN 'in_progress'
            WHEN 'awaiting_parts'    THEN 'awaiting_parts'
            WHEN 'completed'         THEN 'quality_control'
            WHEN 'delivered'         THEN 'delivered'
            WHEN 'cancelled'         THEN 'cancelled'
            ELSE 'received'
        END
    )::work_order_status;

-- Step 5: Restore default
ALTER TABLE work_orders ALTER COLUMN status SET DEFAULT 'received';

-- Step 6: Drop old type
DROP TYPE work_order_status_old;

COMMIT;
