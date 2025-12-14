-- ============================================
-- STRYK: Categories, Players, Attendance Tables
-- ============================================

-- Create venues table for training locations
CREATE TABLE public.venues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, name)
);

-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sport_id UUID REFERENCES public.sports(id),
  venue_id UUID REFERENCES public.venues(id),
  trainer_id UUID REFERENCES public.profiles(id),
  start_time TIME,
  end_time TIME,
  days_of_week TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, name)
);

-- Create payment_status enum
CREATE TYPE public.payment_status AS ENUM ('al_dia', 'pendiente', 'atrasado');

-- Create players table
CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id),
  full_name TEXT NOT NULL,
  phone TEXT,
  tutor_name TEXT,
  position TEXT,
  plan TEXT,
  monthly_fee DECIMAL(10,2),
  payment_status public.payment_status NOT NULL DEFAULT 'pendiente',
  is_scholarship BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attendance_status enum
CREATE TYPE public.attendance_status AS ENUM ('presente', 'ausente', 'justificado');

-- Create attendance table
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status public.attendance_status NOT NULL DEFAULT 'ausente',
  notes TEXT,
  recorded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(player_id, date, category_id)
);

-- Enable RLS on all tables
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for VENUES
-- ============================================

CREATE POLICY "Users can view venues in their organization"
ON public.venues FOR SELECT
USING (organization_id = public.get_current_org_id());

CREATE POLICY "Org owner and director can insert venues"
ON public.venues FOR INSERT
WITH CHECK (
  organization_id = public.get_current_org_id() 
  AND (public.has_org_role('org_owner') OR public.has_org_role('director_deportivo'))
);

CREATE POLICY "Org owner and director can update venues"
ON public.venues FOR UPDATE
USING (organization_id = public.get_current_org_id() AND (public.has_org_role('org_owner') OR public.has_org_role('director_deportivo')))
WITH CHECK (organization_id = public.get_current_org_id() AND (public.has_org_role('org_owner') OR public.has_org_role('director_deportivo')));

-- ============================================
-- RLS Policies for CATEGORIES
-- ============================================

-- Helper function to check if user is trainer for a category
CREATE OR REPLACE FUNCTION public.is_category_trainer(_category_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.categories
    WHERE id = _category_id
      AND trainer_id = auth.uid()
      AND organization_id = public.get_current_org_id()
  );
$$;

-- SELECT: Org owner/director see all, trainer sees only their categories
CREATE POLICY "Users can view categories in their organization"
ON public.categories FOR SELECT
USING (
  organization_id = public.get_current_org_id()
  AND (
    public.has_org_role('org_owner')
    OR public.has_org_role('director_deportivo')
    OR public.has_org_role('administrativo')
    OR (public.has_org_role('entrenador') AND trainer_id = auth.uid())
  )
);

CREATE POLICY "Org owner and director can insert categories"
ON public.categories FOR INSERT
WITH CHECK (
  organization_id = public.get_current_org_id()
  AND (public.has_org_role('org_owner') OR public.has_org_role('director_deportivo'))
);

CREATE POLICY "Org owner and director can update categories"
ON public.categories FOR UPDATE
USING (organization_id = public.get_current_org_id() AND (public.has_org_role('org_owner') OR public.has_org_role('director_deportivo')))
WITH CHECK (organization_id = public.get_current_org_id() AND (public.has_org_role('org_owner') OR public.has_org_role('director_deportivo')));

-- ============================================
-- RLS Policies for PLAYERS
-- ============================================

-- SELECT: Director/Admin/Owner see all, Trainer sees only players in their categories
CREATE POLICY "Users can view players in their organization"
ON public.players FOR SELECT
USING (
  organization_id = public.get_current_org_id()
  AND (
    public.has_org_role('org_owner')
    OR public.has_org_role('director_deportivo')
    OR public.has_org_role('administrativo')
    OR (public.has_org_role('entrenador') AND public.is_category_trainer(category_id))
  )
);

CREATE POLICY "Director and admin can insert players"
ON public.players FOR INSERT
WITH CHECK (
  organization_id = public.get_current_org_id()
  AND (public.has_org_role('org_owner') OR public.has_org_role('director_deportivo') OR public.has_org_role('administrativo'))
);

CREATE POLICY "Director and admin can update players"
ON public.players FOR UPDATE
USING (organization_id = public.get_current_org_id() AND (public.has_org_role('org_owner') OR public.has_org_role('director_deportivo') OR public.has_org_role('administrativo')))
WITH CHECK (organization_id = public.get_current_org_id() AND (public.has_org_role('org_owner') OR public.has_org_role('director_deportivo') OR public.has_org_role('administrativo')));

-- ============================================
-- RLS Policies for ATTENDANCE
-- ============================================

CREATE POLICY "Users can view attendance in their organization"
ON public.attendance FOR SELECT
USING (
  organization_id = public.get_current_org_id()
  AND (
    public.has_org_role('org_owner')
    OR public.has_org_role('director_deportivo')
    OR public.has_org_role('administrativo')
    OR (public.has_org_role('entrenador') AND public.is_category_trainer(category_id))
  )
);

-- Trainer can record attendance for their categories
CREATE POLICY "Trainers can insert attendance for their categories"
ON public.attendance FOR INSERT
WITH CHECK (
  organization_id = public.get_current_org_id()
  AND (
    public.has_org_role('org_owner')
    OR public.has_org_role('director_deportivo')
    OR (public.has_org_role('entrenador') AND public.is_category_trainer(category_id))
  )
);

CREATE POLICY "Trainers can update attendance for their categories"
ON public.attendance FOR UPDATE
USING (
  organization_id = public.get_current_org_id()
  AND (
    public.has_org_role('org_owner')
    OR public.has_org_role('director_deportivo')
    OR (public.has_org_role('entrenador') AND public.is_category_trainer(category_id))
  )
)
WITH CHECK (
  organization_id = public.get_current_org_id()
  AND (
    public.has_org_role('org_owner')
    OR public.has_org_role('director_deportivo')
    OR (public.has_org_role('entrenador') AND public.is_category_trainer(category_id))
  )
);

-- ============================================
-- Triggers for updated_at
-- ============================================

CREATE TRIGGER update_venues_updated_at
BEFORE UPDATE ON public.venues
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_players_updated_at
BEFORE UPDATE ON public.players
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at
BEFORE UPDATE ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Indexes for performance
-- ============================================

CREATE INDEX idx_categories_organization ON public.categories(organization_id);
CREATE INDEX idx_categories_trainer ON public.categories(trainer_id);
CREATE INDEX idx_players_organization ON public.players(organization_id);
CREATE INDEX idx_players_category ON public.players(category_id);
CREATE INDEX idx_attendance_player ON public.attendance(player_id);
CREATE INDEX idx_attendance_category ON public.attendance(category_id);
CREATE INDEX idx_attendance_date ON public.attendance(date);