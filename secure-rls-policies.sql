-- ============================================================
-- Script de Sécurisation des Politiques RLS
-- À exécuter dans le SQL Editor de Supabase Dashboard
-- ============================================================

-- Ce script va :
-- 1. Supprimer les politiques permissives existantes
-- 2. Créer des politiques sécurisées basées sur user_id
-- 3. Garantir l'isolation des données par utilisateur

-- ============================================================
-- ÉTAPE 1 : Supprimer les anciennes politiques permissives
-- ============================================================

-- Table: forex_strategies
DROP POLICY IF EXISTS "Allow all operations on forex_strategies" ON forex_strategies;
DROP POLICY IF EXISTS "Enable read access for all users" ON forex_strategies;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON forex_strategies;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON forex_strategies;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON forex_strategies;

-- Table: saved_scenarios
DROP POLICY IF EXISTS "Allow all operations on saved_scenarios" ON saved_scenarios;
DROP POLICY IF EXISTS "Enable read access for all users" ON saved_scenarios;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON saved_scenarios;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON saved_scenarios;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON saved_scenarios;

-- Table: risk_matrices
DROP POLICY IF EXISTS "Allow all operations on risk_matrices" ON risk_matrices;
DROP POLICY IF EXISTS "Enable read access for all users" ON risk_matrices;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON risk_matrices;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON risk_matrices;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON risk_matrices;

-- Table: hedging_instruments
DROP POLICY IF EXISTS "Allow all operations on hedging_instruments" ON hedging_instruments;
DROP POLICY IF EXISTS "Enable read access for all users" ON hedging_instruments;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON hedging_instruments;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON hedging_instruments;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON hedging_instruments;

-- ============================================================
-- ÉTAPE 2 : S'assurer que RLS est activé
-- ============================================================

ALTER TABLE forex_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_matrices ENABLE ROW LEVEL SECURITY;
ALTER TABLE hedging_instruments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ÉTAPE 3 : Créer les politiques sécurisées
-- ============================================================

-- Table: forex_strategies
-- ============================================================

-- Politique pour SELECT
CREATE POLICY "Users can view their own forex strategies"
ON forex_strategies
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Politique pour INSERT
CREATE POLICY "Users can create their own forex strategies"
ON forex_strategies
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Politique pour UPDATE
CREATE POLICY "Users can update their own forex strategies"
ON forex_strategies
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Politique pour DELETE
CREATE POLICY "Users can delete their own forex strategies"
ON forex_strategies
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Table: saved_scenarios
-- ============================================================

-- Politique pour SELECT
CREATE POLICY "Users can view their own scenarios"
ON saved_scenarios
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Politique pour INSERT
CREATE POLICY "Users can create their own scenarios"
ON saved_scenarios
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Politique pour UPDATE
CREATE POLICY "Users can update their own scenarios"
ON saved_scenarios
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Politique pour DELETE
CREATE POLICY "Users can delete their own scenarios"
ON saved_scenarios
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Table: risk_matrices
-- ============================================================

-- Politique pour SELECT
CREATE POLICY "Users can view their own risk matrices"
ON risk_matrices
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Politique pour INSERT
CREATE POLICY "Users can create their own risk matrices"
ON risk_matrices
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Politique pour UPDATE
CREATE POLICY "Users can update their own risk matrices"
ON risk_matrices
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Politique pour DELETE
CREATE POLICY "Users can delete their own risk matrices"
ON risk_matrices
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Table: hedging_instruments
-- ============================================================

-- Politique pour SELECT
CREATE POLICY "Users can view their own hedging instruments"
ON hedging_instruments
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Politique pour INSERT
CREATE POLICY "Users can create their own hedging instruments"
ON hedging_instruments
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Politique pour UPDATE
CREATE POLICY "Users can update their own hedging instruments"
ON hedging_instruments
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Politique pour DELETE
CREATE POLICY "Users can delete their own hedging instruments"
ON hedging_instruments
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================
-- ÉTAPE 4 : Vérification
-- ============================================================

-- Afficher toutes les politiques créées
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN (
        'forex_strategies', 
        'saved_scenarios', 
        'risk_matrices', 
        'hedging_instruments'
    )
ORDER BY tablename, operation, policyname;

-- Vérifier que RLS est activé
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'forex_strategies', 
        'saved_scenarios', 
        'risk_matrices', 
        'hedging_instruments'
    )
ORDER BY tablename;

-- ============================================================
-- RÉSULTAT ATTENDU
-- ============================================================

-- Vous devriez voir :
-- 1. RLS activé (rls_enabled = true) pour toutes les tables
-- 2. 4 politiques par table (SELECT, INSERT, UPDATE, DELETE)
-- 3. Toutes les politiques limitées au rôle "authenticated"
-- 4. Toutes les politiques utilisant "user_id = auth.uid()"

-- ============================================================
-- TEST RAPIDE
-- ============================================================

-- Ce test devrait échouer si vous n'êtes pas authentifié :
-- SELECT * FROM forex_strategies;

-- Ce test devrait échouer (violation RLS) :
-- INSERT INTO forex_strategies (name, user_id, start_date, strategy_start_date, 
--     months_to_hedge, domestic_rate, foreign_rate, base_volume, quote_volume, 
--     spot_price, currency_pair)
-- VALUES ('Test', gen_random_uuid(), CURRENT_DATE, CURRENT_DATE, 12, 1.0, 0.5, 
--     1000000, 1085000, 1.0850, '{}'::jsonb);

-- ============================================================
-- 🎉 Configuration terminée !
-- ============================================================

-- Votre base de données est maintenant SÉCURISÉE avec :
-- ✅ RLS activé sur toutes les tables
-- ✅ Isolation complète des données par utilisateur
-- ✅ Authentification requise pour toutes les opérations
-- ✅ Politiques granulaires (SELECT, INSERT, UPDATE, DELETE)

-- Prochaines étapes :
-- 1. Créer un utilisateur de test dans Authentication > Users
-- 2. Tester l'application avec npm run dev
-- 3. Se connecter et créer des données
-- 4. Vérifier que les données sont bien isolées par utilisateur

