-- Schema SQL pour Supabase - Forex Pricers
-- Exécuter ces commandes dans l'éditeur SQL de Supabase

-- Table des stratégies Forex
CREATE TABLE IF NOT EXISTS forex_strategies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Paramètres principaux
  start_date DATE NOT NULL,
  strategy_start_date DATE NOT NULL,
  months_to_hedge INTEGER NOT NULL DEFAULT 12,
  domestic_rate DECIMAL(5,2) NOT NULL DEFAULT 1.0,
  foreign_rate DECIMAL(5,2) NOT NULL DEFAULT 0.5,
  base_volume BIGINT NOT NULL DEFAULT 10000000,
  quote_volume BIGINT NOT NULL DEFAULT 10000000,
  spot_price DECIMAL(10,6) NOT NULL DEFAULT 1.0850,
  currency_pair JSONB NOT NULL,
  use_custom_periods BOOLEAN DEFAULT FALSE,
  custom_periods JSONB DEFAULT '[]',
  
  -- Composants de stratégie
  strategy_components JSONB DEFAULT '[]',
  
  -- Modèles de pricing
  option_pricing_model VARCHAR(50) DEFAULT 'garman-kohlhagen',
  barrier_pricing_model VARCHAR(50) DEFAULT 'closed-form',
  
  -- Options avancées
  use_implied_vol BOOLEAN DEFAULT FALSE,
  implied_volatilities JSONB DEFAULT '{}',
  use_custom_option_prices BOOLEAN DEFAULT FALSE,
  custom_option_prices JSONB DEFAULT '{}',
  barrier_option_simulations INTEGER DEFAULT 1000,
  
  -- Résultats
  results JSONB,
  payoff_data JSONB DEFAULT '[]',
  
  -- Scénarios de stress test
  stress_test_scenarios JSONB DEFAULT '{}',
  
  -- Prix manuels et réels
  manual_forwards JSONB DEFAULT '{}',
  real_prices JSONB DEFAULT '{}',
  real_price_params JSONB DEFAULT '{}'
);

-- Table des scénarios sauvegardés
CREATE TABLE IF NOT EXISTS saved_scenarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES forex_strategies(id) ON DELETE CASCADE,
  
  -- Données du scénario
  params JSONB NOT NULL,
  strategy JSONB DEFAULT '[]',
  results JSONB DEFAULT '[]',
  payoff_data JSONB DEFAULT '[]',
  stress_test JSONB,
  manual_forwards JSONB DEFAULT '{}',
  real_prices JSONB DEFAULT '{}',
  use_implied_vol BOOLEAN DEFAULT FALSE,
  implied_volatilities JSONB DEFAULT '{}',
  custom_option_prices JSONB DEFAULT '{}'
);

-- Table des matrices de risque
CREATE TABLE IF NOT EXISTS risk_matrices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  components JSONB DEFAULT '[]',
  coverage_ratio DECIMAL(5,2) DEFAULT 0,
  results JSONB DEFAULT '[]'
);

-- Table des instruments de couverture
CREATE TABLE IF NOT EXISTS hedging_instruments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Données de l'instrument
  instrument_type VARCHAR(100) NOT NULL,
  currency_pair VARCHAR(20) NOT NULL,
  notional_base DECIMAL(15,2) NOT NULL,
  notional_quote DECIMAL(15,2) NOT NULL,
  strike_price DECIMAL(10,6),
  strike_type VARCHAR(20) DEFAULT 'percent',
  volatility DECIMAL(5,2),
  quantity INTEGER DEFAULT 100,
  barrier_level DECIMAL(10,6),
  second_barrier DECIMAL(10,6),
  barrier_type VARCHAR(20) DEFAULT 'percent',
  rebate DECIMAL(10,2),
  time_to_payoff DECIMAL(5,2),
  
  -- Dates
  start_date DATE NOT NULL,
  maturity_date DATE NOT NULL,
  
  -- Prix et résultats
  option_price DECIMAL(10,6),
  premium DECIMAL(15,2),
  mtm_value DECIMAL(15,2),
  
  -- Métadonnées
  hedge_accounting BOOLEAN DEFAULT FALSE,
  notes TEXT,
  
  -- Données complètes (pour compatibilité)
  full_data JSONB
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_forex_strategies_user_id ON forex_strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_forex_strategies_created_at ON forex_strategies(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_scenarios_user_id ON saved_scenarios(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_scenarios_created_at ON saved_scenarios(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_matrices_user_id ON risk_matrices(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_matrices_created_at ON risk_matrices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hedging_instruments_user_id ON hedging_instruments(user_id);
CREATE INDEX IF NOT EXISTS idx_hedging_instruments_created_at ON hedging_instruments(created_at DESC);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour mettre à jour updated_at
CREATE TRIGGER update_forex_strategies_updated_at 
    BEFORE UPDATE ON forex_strategies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_scenarios_updated_at 
    BEFORE UPDATE ON saved_scenarios 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risk_matrices_updated_at 
    BEFORE UPDATE ON risk_matrices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hedging_instruments_updated_at 
    BEFORE UPDATE ON hedging_instruments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Politiques RLS (Row Level Security)
-- Activer RLS sur toutes les tables
ALTER TABLE forex_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_matrices ENABLE ROW LEVEL SECURITY;
ALTER TABLE hedging_instruments ENABLE ROW LEVEL SECURITY;

-- Politiques pour permettre l'accès public (pour l'instant)
-- Vous pouvez les modifier plus tard pour ajouter l'authentification
CREATE POLICY "Allow all operations on forex_strategies" ON forex_strategies
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on saved_scenarios" ON saved_scenarios
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on risk_matrices" ON risk_matrices
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on hedging_instruments" ON hedging_instruments
    FOR ALL USING (true);

-- Données d'exemple (optionnel)
INSERT INTO forex_strategies (
  name, 
  description, 
  start_date, 
  strategy_start_date, 
  months_to_hedge,
  domestic_rate,
  foreign_rate,
  base_volume,
  quote_volume,
  spot_price,
  currency_pair
) VALUES (
  'Stratégie EUR/USD Exemple',
  'Exemple de stratégie de couverture EUR/USD',
  CURRENT_DATE,
  CURRENT_DATE,
  12,
  1.0,
  0.5,
  10000000,
  10850000,
  1.0850,
  '{"symbol": "EUR/USD", "name": "Euro / US Dollar", "base": "EUR", "quote": "USD", "category": "majors", "default_spot_rate": 1.0850}'
) ON CONFLICT DO NOTHING;
