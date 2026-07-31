-- Add logos to matches table
ALTER TABLE matches ADD COLUMN IF NOT EXISTS home_logo text;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS away_logo text;
