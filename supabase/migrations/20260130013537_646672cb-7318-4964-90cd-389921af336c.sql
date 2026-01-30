-- =============================================
-- Terminal de Fichajes: Migration
-- =============================================

-- 1. Agregar columnas de pricing a org_intake_settings
ALTER TABLE public.org_intake_settings 
  ADD COLUMN IF NOT EXISTS soccer_fee numeric DEFAULT 450,
  ADD COLUMN IF NOT EXISTS basketball_fee numeric DEFAULT 400,
  ADD COLUMN IF NOT EXISTS transfer_qr_url text,
  ADD COLUMN IF NOT EXISTS transfer_bank_info text;

-- 2. Índice único para upsert de guardians (org + phone_normalized)
CREATE UNIQUE INDEX IF NOT EXISTS guardians_org_phone_unique 
  ON public.guardians (organization_id, phone_normalized);

-- 3. Helper function para verificar roles de intake (org_owner, director, admin, entrenador)
CREATE OR REPLACE FUNCTION public.has_intake_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_org_roles
    WHERE user_id = auth.uid()
      AND organization_id = public.get_current_org_id()
      AND role IN ('org_owner', 'director_deportivo', 'administrativo', 'entrenador')
  );
$$;

-- 4. Función RPC para procesar intake y crear entidades
CREATE OR REPLACE FUNCTION public.process_intake_and_create_entities(p_intake_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req intake_requests%ROWTYPE;
  v_guardian_id uuid;
  v_player_id uuid;
  v_payment_id uuid;
  v_payment_month text;
BEGIN
  -- Lock and fetch request
  SELECT * INTO v_req FROM intake_requests WHERE id = p_intake_id FOR UPDATE;
  
  IF v_req.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Intake request not found');
  END IF;
  
  IF v_req.status NOT IN ('pending', 'processing') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already processed', 'status', v_req.status);
  END IF;
  
  -- Mark as processing
  UPDATE intake_requests SET status = 'processing', updated_at = now() WHERE id = p_intake_id;
  
  -- Calculate payment month (current month in YYYY-MM format)
  v_payment_month := to_char(now(), 'YYYY-MM');
  
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
    -- Update with error but don't lose the data
    UPDATE intake_requests 
    SET status = 'failed', processing_error = SQLERRM, updated_at = now() 
    WHERE id = p_intake_id;
    
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
  END;
END;
$$;

-- 5. RLS policy for intake_documents INSERT (trainers need to upload evidence)
DROP POLICY IF EXISTS "Users can insert intake documents for their org" ON public.intake_documents;
CREATE POLICY "Users can insert intake documents for their org"
ON public.intake_documents
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = public.get_current_org_id()
  AND public.has_intake_access()
);

-- 6. RLS policy for intake_documents SELECT
DROP POLICY IF EXISTS "Users can view intake documents in their org" ON public.intake_documents;
CREATE POLICY "Users can view intake documents in their org"
ON public.intake_documents
FOR SELECT
TO authenticated
USING (organization_id = public.get_current_org_id());

-- 7. Index for faster intake_requests queries
CREATE INDEX IF NOT EXISTS idx_intake_requests_org_status 
  ON public.intake_requests (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_intake_requests_created_by 
  ON public.intake_requests (created_by);

-- 8. Ensure storage policies for intake-documents bucket
-- Note: Storage policies are managed separately, this is just documentation
-- Path pattern: {org_id}/intake/{intake_request_id}/{filename}