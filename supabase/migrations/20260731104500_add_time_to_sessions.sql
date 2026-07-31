-- Add time column to training_sessions
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS time text;
