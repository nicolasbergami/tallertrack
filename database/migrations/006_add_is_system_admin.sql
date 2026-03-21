-- =============================================================================
-- Migration 006: Add is_system_admin field to users table
--
-- This field identifies TallerTrack SaaS owners who have access to the
-- /backoffice panel and can query across all tenants.
--
-- Run as: tallertrack_migrator (or postgres superuser)
-- =============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_system_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Partial index — only indexes the very few rows where is_system_admin = TRUE.
-- Keeps the index tiny and fast even with millions of users.
CREATE INDEX IF NOT EXISTS idx_users_is_system_admin
  ON users (is_system_admin)
  WHERE is_system_admin = TRUE;

COMMENT ON COLUMN users.is_system_admin IS
  'TallerTrack SaaS owner access. Grants read access to /api/v1/backoffice endpoints
   which bypass Row-Level Security and expose cross-tenant metrics.
   Set to TRUE only for the SaaS founders/admins — never for workshop users.';

-- =============================================================================
-- To grant superadmin to an existing user (replace the email):
--   UPDATE users SET is_system_admin = TRUE WHERE email = 'admin@tallertrack.com';
--
-- The ADMIN_DATABASE_URL backend env var should connect as tallertrack_migrator
-- (BYPASSRLS) so the backoffice service can query across all tenants.
-- =============================================================================
