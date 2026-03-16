
-- Exercise Library table
CREATE TABLE public.exercise_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  title TEXT NOT NULL,
  description TEXT,
  coach_tip TEXT,
  category TEXT NOT NULL,
  skill_tags TEXT[] DEFAULT '{}',
  age_min INT DEFAULT 6,
  age_max INT DEFAULT 18,
  duration_minutes INT,
  difficulty TEXT DEFAULT 'beginner',
  equipment_needed TEXT,
  partner_required BOOLEAN DEFAULT false,
  video_source TEXT DEFAULT 'youtube',
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Exercise Addon Subscriptions table
CREATE TABLE public.exercise_addon_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id UUID REFERENCES public.guardians(id),
  player_id UUID REFERENCES public.players(id),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  plan_type TEXT DEFAULT 'exercise_addon',
  status TEXT DEFAULT 'active',
  stripe_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_exercise_library_org ON public.exercise_library(organization_id);
CREATE INDEX idx_exercise_library_category ON public.exercise_library(category);
CREATE INDEX idx_exercise_addon_subs_guardian ON public.exercise_addon_subscriptions(guardian_id, organization_id);
CREATE INDEX idx_exercise_addon_subs_player ON public.exercise_addon_subscriptions(player_id);

-- RLS on exercise_library
ALTER TABLE public.exercise_library ENABLE ROW LEVEL SECURITY;

-- Authenticated users (coaches/admins) can manage exercises in their org
CREATE POLICY "org_members_manage_exercises" ON public.exercise_library
  FOR ALL TO authenticated
  USING (organization_id = public.get_current_org_id())
  WITH CHECK (organization_id = public.get_current_org_id());

-- Anon can read exercises (portal access)
CREATE POLICY "anon_read_exercises" ON public.exercise_library
  FOR SELECT TO anon
  USING (is_active = true);

-- RLS on exercise_addon_subscriptions
ALTER TABLE public.exercise_addon_subscriptions ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage subscriptions in their org
CREATE POLICY "org_members_manage_subs" ON public.exercise_addon_subscriptions
  FOR ALL TO authenticated
  USING (organization_id = public.get_current_org_id())
  WITH CHECK (organization_id = public.get_current_org_id());

-- Anon can read subscriptions (portal checks)
CREATE POLICY "anon_read_subs" ON public.exercise_addon_subscriptions
  FOR SELECT TO anon
  USING (true);

-- Storage bucket for exercise videos (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('exercise-videos', 'exercise-videos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS for exercise-videos bucket
CREATE POLICY "auth_upload_exercise_videos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'exercise-videos');

CREATE POLICY "auth_manage_exercise_videos" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'exercise-videos');

CREATE POLICY "anon_read_exercise_videos" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'exercise-videos');
