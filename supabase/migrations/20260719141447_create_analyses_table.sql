/*
# Create analyses table for PredictAI (single-tenant, no auth)

1. New Tables
- `analyses`
  - `id` (uuid, primary key)
  - `machine_name` (text, name of the machine analyzed)
  - `risk_level` (text, one of Low/Medium/High)
  - `risk_score` (numeric, 0-100 risk score)
  - `metrics` (jsonb, aggregated sensor health metrics)
  - `sensor_summary` (jsonb, per-sensor statistics)
  - `ai_explanation` (text, Gemini-generated explanation)
  - `recommendations` (jsonb, array of maintenance recommendations)
  - `record_count` (integer, number of sensor readings analyzed)
  - `created_at` (timestamptz, default now)
2. Security
- Enable RLS on `analyses`.
- Allow anon + authenticated CRUD because the app is intentionally shared/public (no sign-in).
*/

CREATE TABLE IF NOT EXISTS analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_name text NOT NULL DEFAULT 'Unnamed Machine',
  risk_level text NOT NULL CHECK (risk_level IN ('Low', 'Medium', 'High')),
  risk_score numeric(5,2) NOT NULL DEFAULT 0,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  sensor_summary jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_explanation text NOT NULL DEFAULT '',
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  record_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_analyses" ON analyses;
CREATE POLICY "anon_select_analyses" ON analyses FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_analyses" ON analyses;
CREATE POLICY "anon_insert_analyses" ON analyses FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_analyses" ON analyses;
CREATE POLICY "anon_update_analyses" ON analyses FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_analyses" ON analyses;
CREATE POLICY "anon_delete_analyses" ON analyses FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS analyses_created_at_idx ON analyses (created_at DESC);
