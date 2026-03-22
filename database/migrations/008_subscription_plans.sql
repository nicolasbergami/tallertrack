CREATE TABLE IF NOT EXISTS subscription_plans (
  slug       TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  price_ars  NUMERIC(12,2) NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO subscription_plans (slug, name, price_ars) VALUES
  ('starter',      'Básico',      18000),
  ('professional', 'Profesional', 35000),
  ('enterprise',   'Red',         80000)
ON CONFLICT (slug) DO NOTHING;
