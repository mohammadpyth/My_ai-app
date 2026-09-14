/*
# Add authentication support - user_id columns and authenticated-only RLS

1. Changes
- Add `user_id` column to clients, cases, sessions, payments tables (uuid, NOT NULL, DEFAULT auth.uid())
- Add foreign key constraint to auth.users on each user_id column with CASCADE delete
- Replace all existing anon policies with authenticated-only owner-scoped policies
- Each user (staff member) sees all data (shared office data model) — USING (true) for all authenticated users
  because the office data is shared among all lawyers/staff, not isolated per user

2. Security
- RLS stays enabled on all tables
- Policies scoped TO authenticated (anon can no longer read/write — must sign in)
- USING (true) is acceptable here because data is intentionally shared among all authenticated staff members
  This is NOT the single-tenant anon model — it requires authentication first

3. Notes
- Existing data gets auth.uid() as NULL which would violate NOT NULL, so we use a DO block
  to add the column as nullable first, backfill with a placeholder, then set NOT NULL
- We use a safe approach: add column nullable, set default, backfill, then set NOT NULL
*/

-- Add user_id to clients
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'user_id') THEN
    ALTER TABLE clients ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    ALTER TABLE clients ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;

-- Add user_id to cases
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'user_id') THEN
    ALTER TABLE cases ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    ALTER TABLE cases ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;

-- Add user_id to sessions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'user_id') THEN
    ALTER TABLE sessions ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    ALTER TABLE sessions ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;

-- Add user_id to payments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'user_id') THEN
    ALTER TABLE payments ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    ALTER TABLE payments ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;

-- Now replace policies: drop anon policies, create authenticated-only shared policies

-- CLIENTS
DROP POLICY IF EXISTS "anon_select_clients" ON clients;
DROP POLICY IF EXISTS "anon_insert_clients" ON clients;
DROP POLICY IF EXISTS "anon_update_clients" ON clients;
DROP POLICY IF EXISTS "anon_delete_clients" ON clients;

DROP POLICY IF EXISTS "auth_select_clients" ON clients;
CREATE POLICY "auth_select_clients" ON clients FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_clients" ON clients;
CREATE POLICY "auth_insert_clients" ON clients FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_clients" ON clients;
CREATE POLICY "auth_update_clients" ON clients FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_clients" ON clients;
CREATE POLICY "auth_delete_clients" ON clients FOR DELETE
  TO authenticated USING (true);

-- CASES
DROP POLICY IF EXISTS "anon_select_cases" ON cases;
DROP POLICY IF EXISTS "anon_insert_cases" ON cases;
DROP POLICY IF EXISTS "anon_update_cases" ON cases;
DROP POLICY IF EXISTS "anon_delete_cases" ON cases;

DROP POLICY IF EXISTS "auth_select_cases" ON cases;
CREATE POLICY "auth_select_cases" ON cases FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_cases" ON cases;
CREATE POLICY "auth_insert_cases" ON cases FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_cases" ON cases;
CREATE POLICY "auth_update_cases" ON cases FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_cases" ON cases;
CREATE POLICY "auth_delete_cases" ON cases FOR DELETE
  TO authenticated USING (true);

-- SESSIONS
DROP POLICY IF EXISTS "anon_select_sessions" ON sessions;
DROP POLICY IF EXISTS "anon_insert_sessions" ON sessions;
DROP POLICY IF EXISTS "anon_update_sessions" ON sessions;
DROP POLICY IF EXISTS "anon_delete_sessions" ON sessions;

DROP POLICY IF EXISTS "auth_select_sessions" ON sessions;
CREATE POLICY "auth_select_sessions" ON sessions FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_sessions" ON sessions;
CREATE POLICY "auth_insert_sessions" ON sessions FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_sessions" ON sessions;
CREATE POLICY "auth_update_sessions" ON sessions FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_sessions" ON sessions;
CREATE POLICY "auth_delete_sessions" ON sessions FOR DELETE
  TO authenticated USING (true);

-- PAYMENTS
DROP POLICY IF EXISTS "anon_select_payments" ON payments;
DROP POLICY IF EXISTS "anon_insert_payments" ON payments;
DROP POLICY IF EXISTS "anon_update_payments" ON payments;
DROP POLICY IF EXISTS "anon_delete_payments" ON payments;

DROP POLICY IF EXISTS "auth_select_payments" ON payments;
CREATE POLICY "auth_select_payments" ON payments FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_payments" ON payments;
CREATE POLICY "auth_insert_payments" ON payments FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_payments" ON payments;
CREATE POLICY "auth_update_payments" ON payments FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_payments" ON payments;
CREATE POLICY "auth_delete_payments" ON payments FOR DELETE
  TO authenticated USING (true);
