-- =====================================================
-- STRYK: Add email to players + receipt tracking to payments
-- =====================================================

-- P2: Add email field to players table
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS email TEXT NULL;

-- Create index for email lookup within organization
CREATE INDEX IF NOT EXISTS idx_players_org_email 
ON public.players(organization_id, email) 
WHERE email IS NOT NULL;

-- P3: Add receipt tracking fields to payments table
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS receipt_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS receipt_sent_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS receipt_email TEXT NULL,
ADD COLUMN IF NOT EXISTS receipt_error TEXT NULL;

-- Create index for pending receipts
CREATE INDEX IF NOT EXISTS idx_payments_receipt_pending 
ON public.payments(organization_id, receipt_status) 
WHERE receipt_status = 'pending';

-- P4: Enable unaccent extension for accent-insensitive search
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Create a function for normalized search
CREATE OR REPLACE FUNCTION public.normalize_text(input_text TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT lower(unaccent(coalesce(input_text, '')))
$$;

-- Create a function for player search that supports accent/case-insensitive matching
CREATE OR REPLACE FUNCTION public.search_players(
  p_organization_id UUID,
  p_search_term TEXT DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_payment_status TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
  player_id UUID,
  player_organization_id UUID,
  player_full_name TEXT,
  player_email TEXT,
  player_phone TEXT,
  player_tutor_name TEXT,
  player_category_id UUID,
  player_sport_id UUID,
  player_plan_id UUID,
  player_position TEXT,
  player_plan TEXT,
  player_monthly_fee NUMERIC,
  player_payment_status public.payment_status,
  player_is_scholarship BOOLEAN,
  player_is_trial BOOLEAN,
  player_is_active BOOLEAN,
  player_created_at TIMESTAMPTZ,
  player_updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_search TEXT;
BEGIN
  -- Normalize search term
  normalized_search := normalize_text(p_search_term);
  
  RETURN QUERY
  SELECT 
    p.id,
    p.organization_id,
    p.full_name,
    p.email,
    p.phone,
    p.tutor_name,
    p.category_id,
    p.sport_id,
    p.plan_id,
    p.position,
    p.plan,
    p.monthly_fee,
    p.payment_status,
    p.is_scholarship,
    p.is_trial,
    p.is_active,
    p.created_at,
    p.updated_at
  FROM public.players p
  WHERE p.organization_id = p_organization_id
    AND (p_category_id IS NULL OR p.category_id = p_category_id)
    AND (p_payment_status IS NULL OR p.payment_status::TEXT = p_payment_status)
    AND (p_is_active IS NULL OR p.is_active = p_is_active)
    AND (
      p_search_term IS NULL 
      OR p_search_term = ''
      OR normalize_text(p.full_name) ILIKE '%' || normalized_search || '%'
      OR normalize_text(p.tutor_name) ILIKE '%' || normalized_search || '%'
      OR normalize_text(p.email) ILIKE '%' || normalized_search || '%'
    )
  ORDER BY p.full_name;
END;
$$;