-- Script pour vérifier les politiques RLS dans Supabase
-- Exécutez ce script dans l'éditeur SQL de Supabase Dashboard

-- 1. Vérifier si RLS est activé sur les tables
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

-- 2. Lister toutes les politiques RLS existantes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as operation,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN (
        'forex_strategies', 
        'saved_scenarios', 
        'risk_matrices', 
        'hedging_instruments'
    )
ORDER BY tablename, policyname;

-- 3. Vérifier les utilisateurs existants
SELECT 
    id,
    email,
    created_at,
    confirmed_at,
    last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;

-- 4. Compter les enregistrements dans chaque table
SELECT 'forex_strategies' as table_name, COUNT(*) as count FROM forex_strategies
UNION ALL
SELECT 'saved_scenarios', COUNT(*) FROM saved_scenarios
UNION ALL
SELECT 'risk_matrices', COUNT(*) FROM risk_matrices
UNION ALL
SELECT 'hedging_instruments', COUNT(*) FROM hedging_instruments;

-- 5. Vérifier la structure des tables
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name IN (
        'forex_strategies', 
        'saved_scenarios', 
        'risk_matrices', 
        'hedging_instruments'
    )
ORDER BY table_name, ordinal_position;

