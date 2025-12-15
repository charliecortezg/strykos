-- Create matches table for tracking games/partidos
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  category_id UUID NOT NULL REFERENCES public.categories(id),
  trainer_id UUID REFERENCES public.profiles(id),
  venue_id UUID REFERENCES public.venues(id),
  
  -- Match info
  match_date TIMESTAMP WITH TIME ZONE NOT NULL,
  rival_name TEXT NOT NULL,
  match_type TEXT NOT NULL DEFAULT 'amistoso' CHECK (match_type IN ('liga', 'torneo', 'amistoso')),
  status TEXT NOT NULL DEFAULT 'programado' CHECK (status IN ('programado', 'terminado', 'cancelado')),
  
  -- Score
  goals_for INTEGER NOT NULL DEFAULT 0,
  goals_against INTEGER NOT NULL DEFAULT 0,
  
  -- Notes
  notes TEXT,
  technical_notes TEXT,
  
  -- Traceability
  created_by UUID REFERENCES public.profiles(id),
  last_edited_by UUID REFERENCES public.profiles(id),
  last_edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create match_players table for attendance and stats per player
CREATE TABLE public.match_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  
  -- Attendance
  attended BOOLEAN NOT NULL DEFAULT false,
  
  -- Stats (flexible for different sports)
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(match_id, player_id)
);

-- Enable RLS
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;

-- RLS Policies for matches
CREATE POLICY "Users can view matches in their organization"
ON public.matches
FOR SELECT
USING (
  organization_id = get_current_org_id() AND (
    has_org_role('org_owner'::org_role) OR
    has_org_role('director_deportivo'::org_role) OR
    has_org_role('administrativo'::org_role) OR
    (has_org_role('entrenador'::org_role) AND trainer_id = auth.uid())
  )
);

CREATE POLICY "Trainers can insert matches for their categories"
ON public.matches
FOR INSERT
WITH CHECK (
  organization_id = get_current_org_id() AND
  has_org_role('entrenador'::org_role) AND
  is_category_trainer(category_id)
);

CREATE POLICY "Director and owner can update matches"
ON public.matches
FOR UPDATE
USING (
  organization_id = get_current_org_id() AND (
    has_org_role('org_owner'::org_role) OR
    has_org_role('director_deportivo'::org_role)
  )
)
WITH CHECK (
  organization_id = get_current_org_id() AND (
    has_org_role('org_owner'::org_role) OR
    has_org_role('director_deportivo'::org_role)
  )
);

-- RLS Policies for match_players
CREATE POLICY "Users can view match players in their organization"
ON public.match_players
FOR SELECT
USING (
  organization_id = get_current_org_id() AND (
    has_org_role('org_owner'::org_role) OR
    has_org_role('director_deportivo'::org_role) OR
    has_org_role('administrativo'::org_role) OR
    has_org_role('entrenador'::org_role)
  )
);

CREATE POLICY "Trainers can insert match players"
ON public.match_players
FOR INSERT
WITH CHECK (
  organization_id = get_current_org_id() AND
  has_org_role('entrenador'::org_role)
);

CREATE POLICY "Director and owner can update match players"
ON public.match_players
FOR UPDATE
USING (
  organization_id = get_current_org_id() AND (
    has_org_role('org_owner'::org_role) OR
    has_org_role('director_deportivo'::org_role)
  )
)
WITH CHECK (
  organization_id = get_current_org_id() AND (
    has_org_role('org_owner'::org_role) OR
    has_org_role('director_deportivo'::org_role)
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_matches_updated_at
BEFORE UPDATE ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_match_players_updated_at
BEFORE UPDATE ON public.match_players
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();