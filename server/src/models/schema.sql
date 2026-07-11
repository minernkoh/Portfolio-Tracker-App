-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  ticker VARCHAR(20) NOT NULL,
  name VARCHAR(255),
  type VARCHAR(10) NOT NULL CHECK (type IN ('Buy', 'Sell')),
  quantity DECIMAL(20, 10) NOT NULL,
  price DECIMAL(20, 10) NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  asset_type VARCHAR(10) DEFAULT 'Stock' CHECK (asset_type IN ('Stock', 'Crypto', 'Commodity')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_ticker ON transactions(ticker);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);

-- Historical prices table
CREATE TABLE IF NOT EXISTS historical_prices (
  id SERIAL PRIMARY KEY,
  ticker VARCHAR(20) NOT NULL,
  date DATE NOT NULL,
  price DECIMAL(20, 10) NOT NULL,
  asset_type VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(ticker, date)
);

CREATE INDEX IF NOT EXISTS idx_historical_prices_lookup ON historical_prices(ticker, date);
