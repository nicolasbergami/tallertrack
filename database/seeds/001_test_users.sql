-- =============================================================================
-- Seed: Test Users para desarrollo
-- Tenant: taller-demo (creado en schema.sql)
--
-- Usuarios disponibles:
--   owner@tallertrack.com  / Admin1234!   → role: owner
--   mecanico@tallertrack.com / Admin1234! → role: mechanic
-- =============================================================================

DO $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Obtener el ID del tenant demo
  SELECT id INTO v_tenant_id FROM tenants WHERE slug = 'taller-demo' LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant taller-demo no encontrado. Ejecuta schema.sql primero.';
  END IF;

  -- ── Owner / Dueño ──────────────────────────────────────────────────────────
  INSERT INTO users (tenant_id, email, password_hash, full_name, phone, role, status)
  VALUES (
    v_tenant_id,
    'owner@tallertrack.com',
    '$2b$12$lmaS/jm9TPMKWeCyUIj2w./X2SAAATJ2TkVzmdKid2X1j5VyYa0VS',  -- Admin1234!
    'Carlos Propietario',
    '+56912345678',
    'owner',
    'active'
  )
  ON CONFLICT (tenant_id, email) DO NOTHING;

  -- ── Mecánico ───────────────────────────────────────────────────────────────
  INSERT INTO users (tenant_id, email, password_hash, full_name, phone, role, status)
  VALUES (
    v_tenant_id,
    'mecanico@tallertrack.com',
    '$2b$12$lmaS/jm9TPMKWeCyUIj2w./X2SAAATJ2TkVzmdKid2X1j5VyYa0VS',  -- Admin1234!
    'Pedro Mecánico',
    '+56987654321',
    'mechanic',
    'active'
  )
  ON CONFLICT (tenant_id, email) DO NOTHING;

  RAISE NOTICE 'Seed completado para tenant: % (%)', 'taller-demo', v_tenant_id;
END;
$$;
