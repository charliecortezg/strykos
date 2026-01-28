-- ============================================================
-- FASE 1: MIGRACIÓN INTAKE A STRYK OS
-- Ejecutar en orden. Compatible con re-ejecución (idempotente).
-- ============================================================

-- ------------------------------------------------------------
-- FASE 1A: AGREGAR COLUMNA date_of_birth A PLAYERS
-- ------------------------------------------------------------
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS date_of_birth date NULL;

CREATE INDEX IF NOT EXISTS idx_players_date_of_birth 
ON public.players(date_of_birth);

COMMENT ON COLUMN public.players.date_of_birth IS 'Fecha de nacimiento del jugador, agregada para módulo intake';

-- ------------------------------------------------------------
-- FASE 1B: FUNCIONES HELPER DE NORMALIZACIÓN
-- ------------------------------------------------------------
-- Normalizar teléfono (últimos 10 dígitos, solo números)
CREATE OR REPLACE FUNCTION public.normalize_phone(phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF phone IS NULL THEN RETURN NULL; END IF;
  RETURN RIGHT(regexp_replace(phone, '[^0-9]', '', 'g'), 10);
END;
$$;

-- Normalizar nombre (lowercase, sin acentos, espacios normalizados)
CREATE OR REPLACE FUNCTION public.normalize_name(name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF name IS NULL THEN RETURN NULL; END IF;
  RETURN lower(trim(regexp_replace(
    translate(name, 'áéíóúñÁÉÍÓÚÑäëïöüÄËÏÖÜàèìòùÀÈÌÒÙ', 'aeiounAEIOUNaeiouAEIOUaeiouAEIOU'),
    '\s+', ' ', 'g'
  )));
END;
$$;

-- Generar idempotency key (hash determinístico)
CREATE OR REPLACE FUNCTION public.generate_intake_idempotency_key(
  p_org_id uuid,
  p_phone_normalized text,
  p_birth_date date,
  p_name_normalized text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN encode(
    sha256(
      (p_org_id::text || '|' || COALESCE(p_phone_normalized, '') || '|' || p_birth_date::text || '|' || p_name_normalized)::bytea
    ),
    'hex'
  );
END;
$$;

-- ------------------------------------------------------------
-- FASE 1C: TABLA GUARDIANS (TUTORES)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text NOT NULL,
  phone_normalized text NOT NULL,
  occupation text,
  relationship text DEFAULT 'Padre/Madre',
  is_primary boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT guardians_org_phone_normalized_unique 
    UNIQUE (organization_id, phone_normalized)
);

CREATE INDEX IF NOT EXISTS idx_guardians_org 
ON public.guardians(organization_id);

CREATE INDEX IF NOT EXISTS idx_guardians_phone_normalized 
ON public.guardians(phone_normalized);

COMMENT ON TABLE public.guardians IS 'Tutores/padres de familia vinculados a jugadores';

-- ------------------------------------------------------------
-- FASE 1D: TABLA PLAYER_GUARDIANS (RELACIÓN M:N)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.player_guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  guardian_id uuid NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT player_guardians_unique UNIQUE (player_id, guardian_id)
);

CREATE INDEX IF NOT EXISTS idx_player_guardians_player 
ON public.player_guardians(player_id);

CREATE INDEX IF NOT EXISTS idx_player_guardians_guardian 
ON public.player_guardians(guardian_id);

-- ------------------------------------------------------------
-- FASE 1E: TABLA INTAKE_REQUESTS (LOG DE FICHAJES)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.intake_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Idempotencia
  idempotency_key text NOT NULL UNIQUE,
  
  -- Datos capturados (snapshot)
  player_name text NOT NULL,
  player_name_normalized text NOT NULL,
  player_birth_date date NOT NULL,
  player_age integer,
  
  guardian_name text NOT NULL,
  guardian_email text,
  guardian_phone text NOT NULL,
  guardian_phone_normalized text NOT NULL,
  guardian_occupation text,
  
  -- Asignación deportiva
  sport_id uuid REFERENCES public.sports(id),
  category_id uuid REFERENCES public.categories(id),
  venue_id uuid REFERENCES public.venues(id),
  plan_id uuid REFERENCES public.plans(id),
  
  -- Datos de pago
  registration_fee numeric NOT NULL DEFAULT 0,
  monthly_fee numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL,
  promo_applied boolean DEFAULT false,
  promo_code text,
  
  -- Referencias a entidades creadas (llenadas por processor)
  player_id uuid REFERENCES public.players(id),
  guardian_id uuid REFERENCES public.guardians(id),
  payment_id uuid REFERENCES public.payments(id),
  
  -- Estado del proceso
  status text NOT NULL DEFAULT 'pending',
  processing_error text,
  
  -- Email/Receipt
  receipt_status text DEFAULT 'pending',
  receipt_sent_at timestamptz,
  receipt_error text,
  
  -- Tracking
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  processed_by uuid REFERENCES public.profiles(id),
  processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT intake_requests_status_check 
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  CONSTRAINT intake_requests_receipt_status_check 
    CHECK (receipt_status IN ('pending', 'sent', 'failed', 'no_email'))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_intake_requests_org 
ON public.intake_requests(organization_id);

CREATE INDEX IF NOT EXISTS idx_intake_requests_status 
ON public.intake_requests(status);

CREATE INDEX IF NOT EXISTS idx_intake_requests_created_by 
ON public.intake_requests(created_by);

CREATE INDEX IF NOT EXISTS idx_intake_requests_created_at 
ON public.intake_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_intake_requests_duplicate_check 
ON public.intake_requests(organization_id, guardian_phone_normalized, player_birth_date, player_name_normalized);

-- ------------------------------------------------------------
-- FASE 1F: TABLA INTAKE_DOCUMENTS (EVIDENCIAS)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.intake_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_request_id uuid NOT NULL REFERENCES public.intake_requests(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Storage reference
  bucket_id text NOT NULL DEFAULT 'intake-documents',
  object_path text NOT NULL,
  
  -- Metadata
  document_type text NOT NULL DEFAULT 'payment_evidence',
  file_name text,
  file_size integer,
  mime_type text,
  
  uploaded_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intake_documents_request 
ON public.intake_documents(intake_request_id);

CREATE INDEX IF NOT EXISTS idx_intake_documents_org 
ON public.intake_documents(organization_id);

-- ------------------------------------------------------------
-- FASE 1G: TABLA ORG_INTAKE_SETTINGS (CONFIG POR ACADEMIA)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.org_intake_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid UNIQUE NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Feature flags
  enabled boolean DEFAULT true,
  require_evidence boolean DEFAULT true,
  require_guardian_email boolean DEFAULT false,
  allow_promo_codes boolean DEFAULT true,
  
  -- Fees por defecto
  default_registration_fee numeric DEFAULT 400,
  default_monthly_fee numeric DEFAULT 450,
  promo_fee numeric DEFAULT 300,
  promo_active boolean DEFAULT true,
  
  -- Contenido personalizado
  welcome_message text,
  receipt_footer_text text,
  whatsapp_group_url text,
  parents_guide_url text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_intake_settings_org 
ON public.org_intake_settings(organization_id);

-- ============================================================
-- FASE 1H: ENABLE RLS EN NUEVAS TABLAS
-- ============================================================
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_intake_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- FASE 1I: RLS POLICIES (USANDO ROLES EXISTENTES)
-- ============================================================

-- ---------- GUARDIANS ----------
DROP POLICY IF EXISTS "Users can view guardians in their org" ON public.guardians;
CREATE POLICY "Users can view guardians in their org"
ON public.guardians FOR SELECT
TO authenticated
USING (organization_id = get_current_org_id());

DROP POLICY IF EXISTS "Admins can insert guardians" ON public.guardians;
CREATE POLICY "Admins can insert guardians"
ON public.guardians FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = get_current_org_id()
  AND (
    has_org_role('org_owner'::org_role) OR 
    has_org_role('director_deportivo'::org_role) OR 
    has_org_role('administrativo'::org_role)
  )
);

DROP POLICY IF EXISTS "Admins can update guardians" ON public.guardians;
CREATE POLICY "Admins can update guardians"
ON public.guardians FOR UPDATE
TO authenticated
USING (organization_id = get_current_org_id())
WITH CHECK (
  has_org_role('org_owner'::org_role) OR 
  has_org_role('director_deportivo'::org_role) OR 
  has_org_role('administrativo'::org_role)
);

-- ---------- PLAYER_GUARDIANS ----------
DROP POLICY IF EXISTS "Users can view player_guardians in their org" ON public.player_guardians;
CREATE POLICY "Users can view player_guardians in their org"
ON public.player_guardians FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.players p 
    WHERE p.id = player_id 
    AND p.organization_id = get_current_org_id()
  )
);

DROP POLICY IF EXISTS "Admins can insert player_guardians" ON public.player_guardians;
CREATE POLICY "Admins can insert player_guardians"
ON public.player_guardians FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.players p 
    WHERE p.id = player_id 
    AND p.organization_id = get_current_org_id()
  )
  AND (
    has_org_role('org_owner'::org_role) OR 
    has_org_role('director_deportivo'::org_role) OR 
    has_org_role('administrativo'::org_role)
  )
);

DROP POLICY IF EXISTS "Admins can update player_guardians" ON public.player_guardians;
CREATE POLICY "Admins can update player_guardians"
ON public.player_guardians FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.players p 
    WHERE p.id = player_id 
    AND p.organization_id = get_current_org_id()
  )
)
WITH CHECK (
  has_org_role('org_owner'::org_role) OR 
  has_org_role('director_deportivo'::org_role) OR 
  has_org_role('administrativo'::org_role)
);

DROP POLICY IF EXISTS "Admins can delete player_guardians" ON public.player_guardians;
CREATE POLICY "Admins can delete player_guardians"
ON public.player_guardians FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.players p 
    WHERE p.id = player_id 
    AND p.organization_id = get_current_org_id()
  )
  AND (
    has_org_role('org_owner'::org_role) OR 
    has_org_role('director_deportivo'::org_role) OR 
    has_org_role('administrativo'::org_role)
  )
);

-- ---------- INTAKE_REQUESTS ----------
DROP POLICY IF EXISTS "Users can view intake_requests" ON public.intake_requests;
CREATE POLICY "Users can view intake_requests"
ON public.intake_requests FOR SELECT
TO authenticated
USING (
  organization_id = get_current_org_id()
  AND (
    has_org_role('org_owner'::org_role) OR 
    has_org_role('director_deportivo'::org_role) OR 
    has_org_role('administrativo'::org_role) OR
    (has_org_role('entrenador'::org_role) AND created_by = auth.uid())
  )
);

DROP POLICY IF EXISTS "Staff can create intake_requests" ON public.intake_requests;
CREATE POLICY "Staff can create intake_requests"
ON public.intake_requests FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = get_current_org_id()
  AND created_by = auth.uid()
  AND (
    has_org_role('org_owner'::org_role) OR 
    has_org_role('director_deportivo'::org_role) OR 
    has_org_role('administrativo'::org_role) OR
    has_org_role('entrenador'::org_role)
  )
);

DROP POLICY IF EXISTS "Staff can update intake_requests" ON public.intake_requests;
CREATE POLICY "Staff can update intake_requests"
ON public.intake_requests FOR UPDATE
TO authenticated
USING (
  organization_id = get_current_org_id()
  AND (
    has_org_role('org_owner'::org_role) OR 
    has_org_role('director_deportivo'::org_role) OR 
    has_org_role('administrativo'::org_role) OR
    (
      has_org_role('entrenador'::org_role) 
      AND created_by = auth.uid()
      AND status = 'pending'
    )
  )
);

-- ---------- INTAKE_DOCUMENTS ----------
DROP POLICY IF EXISTS "Users can view intake_documents" ON public.intake_documents;
CREATE POLICY "Users can view intake_documents"
ON public.intake_documents FOR SELECT
TO authenticated
USING (
  organization_id = get_current_org_id()
  AND (
    has_org_role('org_owner'::org_role) OR 
    has_org_role('director_deportivo'::org_role) OR 
    has_org_role('administrativo'::org_role) OR
    (
      has_org_role('entrenador'::org_role) 
      AND EXISTS (
        SELECT 1 FROM public.intake_requests ir 
        WHERE ir.id = intake_request_id 
        AND ir.created_by = auth.uid()
      )
    )
  )
);

DROP POLICY IF EXISTS "Staff can upload intake_documents" ON public.intake_documents;
CREATE POLICY "Staff can upload intake_documents"
ON public.intake_documents FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = get_current_org_id()
  AND uploaded_by = auth.uid()
  AND (
    has_org_role('org_owner'::org_role) OR 
    has_org_role('director_deportivo'::org_role) OR 
    has_org_role('administrativo'::org_role) OR
    has_org_role('entrenador'::org_role)
  )
);

-- ---------- ORG_INTAKE_SETTINGS ----------
DROP POLICY IF EXISTS "Users can view their org intake settings" ON public.org_intake_settings;
CREATE POLICY "Users can view their org intake settings"
ON public.org_intake_settings FOR SELECT
TO authenticated
USING (organization_id = get_current_org_id());

DROP POLICY IF EXISTS "Admins can insert intake settings" ON public.org_intake_settings;
CREATE POLICY "Admins can insert intake settings"
ON public.org_intake_settings FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = get_current_org_id()
  AND (
    has_org_role('org_owner'::org_role) OR 
    has_org_role('director_deportivo'::org_role)
  )
);

DROP POLICY IF EXISTS "Admins can update intake settings" ON public.org_intake_settings;
CREATE POLICY "Admins can update intake settings"
ON public.org_intake_settings FOR UPDATE
TO authenticated
USING (organization_id = get_current_org_id())
WITH CHECK (
  has_org_role('org_owner'::org_role) OR 
  has_org_role('director_deportivo'::org_role)
);

DROP POLICY IF EXISTS "Admins can delete intake settings" ON public.org_intake_settings;
CREATE POLICY "Admins can delete intake settings"
ON public.org_intake_settings FOR DELETE
TO authenticated
USING (
  organization_id = get_current_org_id()
  AND (
    has_org_role('org_owner'::org_role) OR 
    has_org_role('director_deportivo'::org_role)
  )
);

-- ============================================================
-- FASE 1J: STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('intake-documents', 'intake-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS para storage
DROP POLICY IF EXISTS "Staff can upload to intake-documents" ON storage.objects;
CREATE POLICY "Staff can upload to intake-documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'intake-documents'
  AND (storage.foldername(name))[1] = (get_current_org_id())::text
);

DROP POLICY IF EXISTS "Users can view their org intake documents" ON storage.objects;
CREATE POLICY "Users can view their org intake documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'intake-documents'
  AND (storage.foldername(name))[1] = (get_current_org_id())::text
);

-- ============================================================
-- FASE 1K: STUB DEL PROCESSOR RPC (PARA FASE 3)
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_intake_request(p_intake_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request intake_requests%ROWTYPE;
  v_guardian_id uuid;
  v_player_id uuid;
  v_payment_id uuid;
BEGIN
  -- Obtener el request
  SELECT * INTO v_request FROM intake_requests WHERE id = p_intake_request_id;
  
  IF v_request.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;
  
  IF v_request.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request already processed', 'status', v_request.status);
  END IF;
  
  -- Marcar como processing
  UPDATE intake_requests SET status = 'processing', updated_at = now() WHERE id = p_intake_request_id;
  
  BEGIN
    -- TODO FASE 3: Implementar lógica completa
    -- 1. Upsert guardian
    -- 2. Create player
    -- 3. Create payment (concept='Inscripción')
    -- 4. Link player_guardians
    -- 5. Update intake_request con IDs
    
    -- Por ahora solo placeholder
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Processor not implemented yet - pending Phase 3'
    );
    
  EXCEPTION WHEN OTHERS THEN
    UPDATE intake_requests 
    SET status = 'failed', processing_error = SQLERRM, updated_at = now() 
    WHERE id = p_intake_request_id;
    
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
  END;
END;
$$;

-- Permisos para invocar el RPC
GRANT EXECUTE ON FUNCTION public.process_intake_request(uuid) TO authenticated;