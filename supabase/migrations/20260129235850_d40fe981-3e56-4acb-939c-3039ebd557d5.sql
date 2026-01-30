-- ============================================
-- MATCHES MODULE: RLS Policies Fix
-- Enables: Trainers UPDATE their matches, Directors DELETE matches
-- ============================================

-- 1. Trainers can UPDATE matches for their assigned categories
CREATE POLICY "Trainers can update own matches"
ON public.matches FOR UPDATE TO authenticated
USING (
  organization_id = public.get_current_org_id() 
  AND public.has_org_role('entrenador') 
  AND public.is_category_trainer(category_id)
)
WITH CHECK (
  organization_id = public.get_current_org_id() 
  AND public.has_org_role('entrenador') 
  AND public.is_category_trainer(category_id)
);

-- 2. Trainers can UPDATE match_players for their org
CREATE POLICY "Trainers can update match players"
ON public.match_players FOR UPDATE TO authenticated
USING (
  organization_id = public.get_current_org_id() 
  AND public.has_org_role('entrenador')
)
WITH CHECK (
  organization_id = public.get_current_org_id() 
  AND public.has_org_role('entrenador')
);

-- 3. Directors and Owners can DELETE matches
CREATE POLICY "Directors and owners can delete matches"
ON public.matches FOR DELETE TO authenticated
USING (
  organization_id = public.get_current_org_id() 
  AND (public.has_org_role('org_owner') OR public.has_org_role('director_deportivo'))
);

-- 4. Directors and Owners can DELETE match_players (for consistency)
CREATE POLICY "Directors and owners can delete match players"
ON public.match_players FOR DELETE TO authenticated
USING (
  organization_id = public.get_current_org_id() 
  AND (public.has_org_role('org_owner') OR public.has_org_role('director_deportivo'))
);