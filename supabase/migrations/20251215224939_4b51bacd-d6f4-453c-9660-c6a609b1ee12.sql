-- Add position field to match_players for tracking position played in each match
ALTER TABLE public.match_players 
ADD COLUMN IF NOT EXISTS position TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.match_players.position IS 'Position played in this specific match (football: portero, defensa, medio, delantero)';