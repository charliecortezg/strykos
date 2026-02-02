-- =====================================================
-- STRYK WAY - FASE 2 COMPLEMENT: Player Challenges Table
-- =====================================================

-- Create player_challenges table for tracking challenge progress
CREATE TABLE IF NOT EXISTS public.player_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES public.stryk_challenges(id) ON DELETE CASCADE,
  progress integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(player_id, challenge_id)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_player_challenges_player 
ON public.player_challenges(player_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_player_challenges_challenge 
ON public.player_challenges(challenge_id);

-- Enable RLS
ALTER TABLE public.player_challenges ENABLE ROW LEVEL SECURITY;

-- RLS: Org users can view player challenges
CREATE POLICY "Org users can view player challenges"
ON public.player_challenges FOR SELECT
TO authenticated
USING (organization_id = public.get_current_org_id());

-- RLS: System can manage player challenges
CREATE POLICY "System can manage player challenges"
ON public.player_challenges FOR ALL
TO authenticated
USING (organization_id = public.get_current_org_id())
WITH CHECK (organization_id = public.get_current_org_id());

-- Add updated_at trigger
CREATE TRIGGER update_player_challenges_updated_at
BEFORE UPDATE ON public.player_challenges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();