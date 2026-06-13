
DO $$
DECLARE
  v_ids uuid[] := ARRAY[
    'b26e1709-6143-4490-97f1-35ffd1388e77'::uuid,
    'caf7c42b-14e3-4df9-9ff4-7dac877a4211'::uuid,
    '816220e1-391c-4262-beee-b15bf7522a0a'::uuid,
    '75be2426-55af-4537-8a7c-0fbd70febe6d'::uuid,
    '3a2ae5b6-2e11-4928-8b8f-b9ce3dc9883c'::uuid
  ];
  v_org uuid := 'aaaaaaaa-2222-4222-8222-222222222222'::uuid;
  v_bad int;
BEGIN
  SELECT count(*) INTO v_bad FROM auth.users WHERE id = ANY(v_ids) AND email NOT ILIKE '%@stryk-test.com';
  IF v_bad > 0 THEN RAISE EXCEPTION 'SAFETY ABORT: % non-test user(s)', v_bad; END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE email='charliecortezg@gmail.com' AND id = ANY(v_ids)) THEN
    RAISE EXCEPTION 'SAFETY ABORT: charlie'; END IF;
  IF v_org IN ('982f355c-0196-46d3-8da9-3e5e83813dad'::uuid,'9ad70018-5b81-4f28-932e-26e2718929d9'::uuid) THEN
    RAISE EXCEPTION 'SAFETY ABORT: protected org'; END IF;

  -- Null FK refs to the 5 profiles
  UPDATE public.attendance              SET recorded_by    = NULL WHERE recorded_by    = ANY(v_ids);
  UPDATE public.categories              SET trainer_id     = NULL WHERE trainer_id     = ANY(v_ids);
  UPDATE public.coach_notifications     SET user_id        = NULL WHERE user_id        = ANY(v_ids);
  UPDATE public.evaluation_event_players SET evaluated_by  = NULL WHERE evaluated_by   = ANY(v_ids);
  UPDATE public.evaluation_events       SET created_by     = NULL WHERE created_by     = ANY(v_ids);
  UPDATE public.evaluation_events       SET closed_by      = NULL WHERE closed_by      = ANY(v_ids);
  UPDATE public.exercise_library        SET created_by     = NULL WHERE created_by     = ANY(v_ids);
  UPDATE public.expenses                SET recorded_by    = NULL WHERE recorded_by    = ANY(v_ids);
  UPDATE public.intake_documents        SET uploaded_by    = NULL WHERE uploaded_by    = ANY(v_ids);
  UPDATE public.intake_requests         SET processed_by   = NULL WHERE processed_by   = ANY(v_ids);
  UPDATE public.intake_requests         SET created_by     = NULL WHERE created_by     = ANY(v_ids);
  UPDATE public.match_media             SET created_by     = NULL WHERE created_by     = ANY(v_ids);
  UPDATE public.match_video_stats       SET analyzed_by    = NULL WHERE analyzed_by    = ANY(v_ids);
  UPDATE public.matches                 SET last_edited_by = NULL WHERE last_edited_by = ANY(v_ids);
  UPDATE public.matches                 SET created_by     = NULL WHERE created_by     = ANY(v_ids);
  UPDATE public.matches                 SET trainer_id     = NULL WHERE trainer_id     = ANY(v_ids);
  UPDATE public.monthly_reports         SET generated_by   = NULL WHERE generated_by   = ANY(v_ids);
  UPDATE public.payments                SET recorded_by    = NULL WHERE recorded_by    = ANY(v_ids);
  UPDATE public.session_plans           SET trainer_id     = NULL WHERE trainer_id     = ANY(v_ids);
  UPDATE public.trainer_certifications  SET issued_by      = NULL WHERE issued_by      = ANY(v_ids);
  UPDATE public.trainer_certifications  SET revoked_by     = NULL WHERE revoked_by     = ANY(v_ids);

  -- Reset active_organization_id pointer if it points to test org (any profile)
  UPDATE public.profiles SET active_organization_id = NULL WHERE active_organization_id = v_org;

  -- Wipe Academia Test 2 dependent data (child tables first)
  DELETE FROM public.player_guardians      WHERE player_id IN (SELECT id FROM public.players WHERE organization_id=v_org);
  DELETE FROM public.billing_events_log    WHERE organization_id = v_org;
  DELETE FROM public.player_lifecycle_log  WHERE organization_id = v_org;
  DELETE FROM public.player_offboarding    WHERE organization_id = v_org;
  DELETE FROM public.player_progress       WHERE organization_id = v_org;
  DELETE FROM public.player_badges         WHERE organization_id = v_org;
  DELETE FROM public.player_challenges     WHERE organization_id = v_org;
  DELETE FROM public.player_monthly_reports WHERE organization_id = v_org;
  DELETE FROM public.stryk_events          WHERE organization_id = v_org;
  DELETE FROM public.attendance            WHERE organization_id = v_org;
  DELETE FROM public.match_players         WHERE organization_id = v_org;
  DELETE FROM public.match_video_stats     WHERE organization_id = v_org;
  DELETE FROM public.match_media           WHERE organization_id = v_org;
  DELETE FROM public.matches               WHERE organization_id = v_org;
  DELETE FROM public.evaluation_scores     WHERE evaluation_id IN (SELECT id FROM public.evaluations WHERE organization_id=v_org);
  DELETE FROM public.evaluation_comments   WHERE evaluation_id IN (SELECT id FROM public.evaluations WHERE organization_id=v_org);
  DELETE FROM public.evaluation_achievements WHERE evaluation_id IN (SELECT id FROM public.evaluations WHERE organization_id=v_org);
  DELETE FROM public.evaluation_delivery   WHERE organization_id = v_org;
  DELETE FROM public.evaluations           WHERE organization_id = v_org;
  DELETE FROM public.evaluation_event_players WHERE organization_id = v_org;
  DELETE FROM public.evaluation_events     WHERE organization_id = v_org;
  DELETE FROM public.evaluation_weights    WHERE organization_id = v_org;
  DELETE FROM public.idp_sessions          WHERE organization_id = v_org;
  DELETE FROM public.idp_monthly_checkins  WHERE organization_id = v_org;
  DELETE FROM public.idp_focus_areas       WHERE organization_id = v_org;
  DELETE FROM public.idp_cycles            WHERE organization_id = v_org;
  DELETE FROM public.intake_documents      WHERE organization_id = v_org;
  DELETE FROM public.intake_requests       WHERE organization_id = v_org;
  DELETE FROM public.payments              WHERE organization_id = v_org;
  DELETE FROM public.expenses              WHERE organization_id = v_org;
  DELETE FROM public.guardians             WHERE organization_id = v_org;
  DELETE FROM public.uniform_orders        WHERE org_id = v_org;
  DELETE FROM public.uniform_blocked_numbers WHERE org_id = v_org;
  DELETE FROM public.uniform_campaigns     WHERE org_id = v_org;
  DELETE FROM public.cheer_order_items     WHERE org_id = v_org;
  DELETE FROM public.cheer_orders          WHERE org_id = v_org;
  DELETE FROM public.cheer_campaigns       WHERE org_id = v_org;
  DELETE FROM public.session_plans         WHERE organization_id = v_org;
  DELETE FROM public.restriction_bank      WHERE organization_id = v_org;
  DELETE FROM public.exercise_library      WHERE organization_id = v_org;
  DELETE FROM public.exercise_addon_subscriptions WHERE organization_id = v_org;
  DELETE FROM public.coach_notifications   WHERE organization_id = v_org;
  DELETE FROM public.monthly_reports       WHERE organization_id = v_org;
  DELETE FROM public.org_intake_settings   WHERE organization_id = v_org;
  DELETE FROM public.org_receipt_counters  WHERE org_id = v_org;
  DELETE FROM public.upgrade_requests      WHERE organization_id = v_org;
  DELETE FROM public.platform_audit_log    WHERE target_organization_id = v_org;
  DELETE FROM public.stryk_audit_logs      WHERE organization_id = v_org;
  DELETE FROM public.stryk_badges          WHERE organization_id = v_org;
  DELETE FROM public.stryk_challenges      WHERE organization_id = v_org;
  DELETE FROM public.stryk_rulesets        WHERE organization_id = v_org;
  DELETE FROM public.stryk_packs           WHERE organization_id = v_org;
  DELETE FROM public.trainer_module_progress  WHERE organization_id = v_org;
  DELETE FROM public.trainer_component_progress WHERE organization_id = v_org;
  DELETE FROM public.trainer_exam_attempts WHERE organization_id = v_org;
  DELETE FROM public.trainer_certifications WHERE organization_id = v_org;
  DELETE FROM public.tutor_auth_tokens     WHERE organization_id = v_org;
  DELETE FROM public.venues                WHERE organization_id = v_org;
  DELETE FROM public.plans                 WHERE organization_id = v_org;
  DELETE FROM public.sports                WHERE organization_id = v_org;
  DELETE FROM public.membership_progression_log WHERE org_id = v_org;
  DELETE FROM public.membership_blocks     WHERE org_id = v_org;
  DELETE FROM public.players               WHERE organization_id = v_org;
  DELETE FROM public.categories            WHERE organization_id = v_org;

  -- Delete user_org_roles for test users (incl. WL row for wl-test-owner) and for the test org
  DELETE FROM public.user_org_roles WHERE user_id = ANY(v_ids);
  DELETE FROM public.user_org_roles WHERE organization_id = v_org;

  -- Move profiles' organization_id off test org if any (none expected) before deleting org
  UPDATE public.profiles SET organization_id = NULL WHERE organization_id = v_org AND id <> ALL(v_ids);

  -- Delete profiles for the 5 test users
  DELETE FROM public.profiles WHERE id = ANY(v_ids);

  -- Finally delete the org
  DELETE FROM public.organizations WHERE id = v_org;
END $$;
