ALTER TABLE meetings ADD COLUMN IF NOT EXISTS feedback JSONB DEFAULT '{"positives": [], "negatives": []}'::jsonb;
