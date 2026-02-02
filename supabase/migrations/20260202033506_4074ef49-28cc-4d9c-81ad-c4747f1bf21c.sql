-- =====================================================
-- RLS Policies for Family Portal (Portal Familiar)
-- Allows limited anonymous access for guardian login
-- =====================================================

-- 1. Organizations - Allow verifying org_code publicly
-- Only shows active organizations with portal enabled
CREATE POLICY "Portal can verify org_code"
ON organizations FOR SELECT
TO anon
USING (
  is_active = true 
  AND feature_portal_familiar_enabled = true
);

-- 2. Guardians - Allow phone-based login verification
-- Only for organizations with portal enabled
CREATE POLICY "Portal can authenticate guardians"
ON guardians FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM organizations o
    WHERE o.id = guardians.organization_id
    AND o.is_active = true
    AND o.feature_portal_familiar_enabled = true
  )
);

-- 3. Player_Guardians - Allow loading guardian-player links
CREATE POLICY "Portal can view guardian links"
ON player_guardians FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM guardians g
    JOIN organizations o ON o.id = g.organization_id
    WHERE g.id = player_guardians.guardian_id
    AND o.feature_portal_familiar_enabled = true
  )
);

-- 4. Players - Allow viewing linked players' basic data
CREATE POLICY "Portal can view linked players"
ON players FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM player_guardians pg
    JOIN guardians g ON g.id = pg.guardian_id
    JOIN organizations o ON o.id = g.organization_id
    WHERE pg.player_id = players.id
    AND o.feature_portal_familiar_enabled = true
  )
);

-- 5. Categories - Allow viewing category names (for player cards)
CREATE POLICY "Portal can view categories"
ON categories FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM organizations o
    WHERE o.id = categories.organization_id
    AND o.feature_portal_familiar_enabled = true
  )
);

-- 6. Sports - Allow viewing sport names (for player cards)
CREATE POLICY "Portal can view sports"
ON sports FOR SELECT
TO anon
USING (
  is_system = true
  OR EXISTS (
    SELECT 1 FROM organizations o
    WHERE o.id = sports.organization_id
    AND o.feature_portal_familiar_enabled = true
  )
);

-- =====================================================
-- STRYK Way Tables - Portal Progress & Gamification
-- =====================================================

-- 7. Player Progress - View XP and level
CREATE POLICY "Portal can view player progress"
ON player_progress FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM player_guardians pg
    JOIN guardians g ON g.id = pg.guardian_id
    JOIN organizations o ON o.id = g.organization_id
    WHERE pg.player_id = player_progress.player_id
    AND o.feature_portal_familiar_enabled = true
  )
);

-- 8. Player Badges - View earned badges
CREATE POLICY "Portal can view player badges"
ON player_badges FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM player_guardians pg
    JOIN guardians g ON g.id = pg.guardian_id
    JOIN organizations o ON o.id = g.organization_id
    WHERE pg.player_id = player_badges.player_id
    AND o.feature_portal_familiar_enabled = true
  )
);

-- 9. STRYK Events - View activity feed
CREATE POLICY "Portal can view player events"
ON stryk_events FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM player_guardians pg
    JOIN guardians g ON g.id = pg.guardian_id
    JOIN organizations o ON o.id = g.organization_id
    WHERE pg.player_id = stryk_events.player_id
    AND o.feature_portal_familiar_enabled = true
  )
);

-- 10. Player Challenges - View active challenges progress
CREATE POLICY "Portal can view player challenges"
ON player_challenges FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM player_guardians pg
    JOIN guardians g ON g.id = pg.guardian_id
    JOIN organizations o ON o.id = g.organization_id
    WHERE pg.player_id = player_challenges.player_id
    AND o.feature_portal_familiar_enabled = true
  )
);

-- 11. STRYK Badges definitions - View badge catalog
CREATE POLICY "Portal can view badge definitions"
ON stryk_badges FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM organizations o
    WHERE o.id = stryk_badges.organization_id
    AND o.feature_portal_familiar_enabled = true
  )
);

-- 12. STRYK Challenges definitions - View challenge catalog
CREATE POLICY "Portal can view challenge definitions"
ON stryk_challenges FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM organizations o
    WHERE o.id = stryk_challenges.organization_id
    AND o.feature_portal_familiar_enabled = true
  )
);