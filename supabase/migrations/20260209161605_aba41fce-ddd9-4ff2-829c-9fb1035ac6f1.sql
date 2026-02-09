
-- Fix process_intake_and_create_entities: payment_month type mismatch
CREATE OR REPLACE FUNCTION public.process_intake_and_create_entities(p_intake_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_req intake_requests%ROWTYPE;
  v_user_org_id uuid;
  v_guardian_id uuid;
  v_player_id uuid;
  v_payment_id uuid;
  v_payment_month date;
BEGIN
  -- SECURITY: Get org of current user
  v_user_org_id := get_current_org_id();
  
  -- Lock and fetch request
  SELECT * INTO v_req FROM intake_requests WHERE id = p_intake_id FOR UPDATE;
  
  IF v_req.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Intake request not found');
  END IF;
  
  -- SECURITY: Validate cross-org access
  IF v_req.organization_id != v_user_org_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied: cross-organization');
  END IF;
  
  IF v_req.status NOT IN ('pending', 'processing') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already processed', 'status', v_req.status);
  END IF;
  
  -- Mark as processing
  UPDATE intake_requests SET status = 'processing', updated_at = now() WHERE id = p_intake_id;
  
  -- Calculate payment month (first day of current month as DATE)
  v_payment_month := date_trunc('month', now())::date;
  
  BEGIN
    -- 1. Upsert guardian
    INSERT INTO guardians (organization_id, full_name, phone, phone_normalized, email, occupation)
    VALUES (
      v_req.organization_id, 
      v_req.guardian_name, 
      v_req.guardian_phone, 
      v_req.guardian_phone_normalized, 
      v_req.guardian_email, 
      v_req.guardian_occupation
    )
    ON CONFLICT (organization_id, phone_normalized) 
    DO UPDATE SET 
      full_name = EXCLUDED.full_name, 
      email = COALESCE(EXCLUDED.email, guardians.email),
      occupation = COALESCE(EXCLUDED.occupation, guardians.occupation),
      updated_at = now()
    RETURNING id INTO v_guardian_id;
    
    -- 2. Create player
    INSERT INTO players (
      organization_id, 
      full_name, 
      date_of_birth,
      category_id, 
      sport_id, 
      plan_id, 
      monthly_fee, 
      tutor_name, 
      phone, 
      email, 
      is_trial, 
      is_scholarship,
      payment_status,
      is_active
    )
    VALUES (
      v_req.organization_id, 
      v_req.player_name, 
      v_req.player_birth_date,
      v_req.category_id, 
      v_req.sport_id, 
      v_req.plan_id, 
      v_req.monthly_fee,
      v_req.guardian_name, 
      v_req.guardian_phone, 
      v_req.guardian_email, 
      false,
      false,
      'al_dia'::payment_status,
      true
    )
    RETURNING id INTO v_player_id;
    
    -- 3. Create payment (inscription fee)
    INSERT INTO payments (
      organization_id, 
      player_id, 
      amount, 
      payment_method, 
      payment_month, 
      concept, 
      recorded_by
    )
    VALUES (
      v_req.organization_id, 
      v_player_id, 
      v_req.total_amount, 
      v_req.payment_method::payment_method, 
      v_payment_month, 
      'Inscripción', 
      v_req.created_by
    )
    RETURNING id INTO v_payment_id;
    
    -- 4. Link player to guardian
    INSERT INTO player_guardians (player_id, guardian_id, is_primary)
    VALUES (v_player_id, v_guardian_id, true);
    
    -- 5. Update intake request with created IDs
    UPDATE intake_requests SET
      status = 'completed',
      player_id = v_player_id,
      guardian_id = v_guardian_id,
      payment_id = v_payment_id,
      processed_at = now(),
      processed_by = auth.uid(),
      processing_error = NULL,
      updated_at = now()
    WHERE id = p_intake_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'player_id', v_player_id,
      'guardian_id', v_guardian_id,
      'payment_id', v_payment_id
    );
    
  EXCEPTION WHEN OTHERS THEN
    UPDATE intake_requests 
    SET status = 'failed', processing_error = SQLERRM, updated_at = now() 
    WHERE id = p_intake_id;
    
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
  END;
END;
$function$;

-- Clean up failed test records
DELETE FROM intake_requests WHERE status = 'failed' AND processing_error LIKE '%payment_month%';

-- Create intake settings for White Lions (both orgs) if not exists
INSERT INTO org_intake_settings (organization_id, enabled, default_registration_fee, soccer_fee, basketball_fee, promo_fee, promo_active, default_monthly_fee, require_evidence)
SELECT id, true, 400, 450, 400, 300, true, 450, true
FROM organizations
WHERE NOT EXISTS (
  SELECT 1 FROM org_intake_settings WHERE org_intake_settings.organization_id = organizations.id
);
