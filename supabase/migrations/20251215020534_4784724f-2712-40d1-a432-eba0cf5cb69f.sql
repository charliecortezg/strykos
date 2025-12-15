-- Add is_trial column to players table for trial/sample class tracking
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS is_trial BOOLEAN NOT NULL DEFAULT false;

-- Add index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_players_is_trial ON public.players(is_trial) WHERE is_trial = true;