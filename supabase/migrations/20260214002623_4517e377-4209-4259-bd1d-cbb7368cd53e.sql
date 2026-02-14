
-- =============================================
-- RLS Portal Policies for Evaluation + IDP tables
-- =============================================

-- 1. evaluations: Portal can view closed evaluations for linked players
CREATE POLICY "Portal can view closed evaluations"
ON public.evaluations FOR SELECT
USING (
  status = 'closed'
  AND EXISTS (
    SELECT 1
    FROM player_guardians pg
    JOIN guardians g ON g.id = pg.guardian_id
    JOIN organizations o ON o.id = g.organization_id
    WHERE pg.player_id = evaluations.player_id
    AND o.feature_portal_familiar_enabled = true
  )
);

-- 2. evaluation_scores: Portal can view scores of closed evaluations
CREATE POLICY "Portal can view evaluation scores"
ON public.evaluation_scores FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM evaluations e
    JOIN player_guardians pg ON pg.player_id = e.player_id
    JOIN guardians g ON g.id = pg.guardian_id
    JOIN organizations o ON o.id = g.organization_id
    WHERE e.id = evaluation_scores.evaluation_id
    AND e.status = 'closed'
    AND o.feature_portal_familiar_enabled = true
  )
);

-- 3. evaluation_comments: Portal can view comments
CREATE POLICY "Portal can view evaluation comments"
ON public.evaluation_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM evaluations e
    JOIN player_guardians pg ON pg.player_id = e.player_id
    JOIN guardians g ON g.id = pg.guardian_id
    JOIN organizations o ON o.id = g.organization_id
    WHERE e.id = evaluation_comments.evaluation_id
    AND o.feature_portal_familiar_enabled = true
  )
);

-- 4. idp_cycles: Portal can view
CREATE POLICY "Portal can view idp cycles"
ON public.idp_cycles FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM player_guardians pg
    JOIN guardians g ON g.id = pg.guardian_id
    JOIN organizations o ON o.id = g.organization_id
    WHERE pg.player_id = idp_cycles.player_id
    AND o.feature_portal_familiar_enabled = true
  )
);

-- 5. idp_cycles: Portal can update (accept plan)
CREATE POLICY "Portal can accept idp cycle"
ON public.idp_cycles FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM player_guardians pg
    JOIN guardians g ON g.id = pg.guardian_id
    JOIN organizations o ON o.id = g.organization_id
    WHERE pg.player_id = idp_cycles.player_id
    AND o.feature_portal_familiar_enabled = true
  )
);

-- 6. idp_focus_areas: Portal can view
CREATE POLICY "Portal can view idp focus areas"
ON public.idp_focus_areas FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM idp_cycles ic
    JOIN player_guardians pg ON pg.player_id = ic.player_id
    JOIN guardians g ON g.id = pg.guardian_id
    JOIN organizations o ON o.id = g.organization_id
    WHERE ic.id = idp_focus_areas.idp_cycle_id
    AND o.feature_portal_familiar_enabled = true
  )
);

-- 7. idp_sessions: Portal can view
CREATE POLICY "Portal can view idp sessions"
ON public.idp_sessions FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM player_guardians pg
    JOIN guardians g ON g.id = pg.guardian_id
    JOIN organizations o ON o.id = g.organization_id
    WHERE pg.player_id = idp_sessions.player_id
    AND o.feature_portal_familiar_enabled = true
  )
);

-- 8. idp_sessions: Portal can insert (register sessions)
CREATE POLICY "Portal can register idp sessions"
ON public.idp_sessions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM player_guardians pg
    JOIN guardians g ON g.id = pg.guardian_id
    JOIN organizations o ON o.id = g.organization_id
    WHERE pg.player_id = idp_sessions.player_id
    AND o.feature_portal_familiar_enabled = true
  )
);

-- 9. evaluation_rubrics: Public read (no org-specific data)
CREATE POLICY "Anyone can view evaluation rubrics"
ON public.evaluation_rubrics FOR SELECT
USING (true);
