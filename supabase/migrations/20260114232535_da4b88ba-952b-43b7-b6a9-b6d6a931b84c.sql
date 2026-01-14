-- =============================================================
-- STRYK Receipt Folio System - Complete Migration
-- =============================================================

-- 1. Add new columns to payments table (if not already exist)
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS receipt_folio text NULL,
ADD COLUMN IF NOT EXISTS receipt_sequence_number integer NULL,
ADD COLUMN IF NOT EXISTS receipt_template_version text NOT NULL DEFAULT 'v1';

-- 2. Create organization receipt counters table
CREATE TABLE IF NOT EXISTS public.org_receipt_counters (
  org_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  last_number integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on org_receipt_counters
ALTER TABLE public.org_receipt_counters ENABLE ROW LEVEL SECURITY;

-- RLS policies for org_receipt_counters (only allow via function/service role)
CREATE POLICY "Service role only for receipt counters"
ON public.org_receipt_counters
FOR ALL
USING (false)
WITH CHECK (false);

-- 3. Add receipt_logo_url to organizations for white-label branding
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS receipt_logo_url text NULL;

-- 4. Create atomic function to generate next receipt folio (prevents race conditions)
CREATE OR REPLACE FUNCTION public.next_receipt_folio(p_org_id uuid)
RETURNS TABLE(sequence_number integer, folio text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
  v_next integer;
BEGIN
  -- Insert counter if not exists
  INSERT INTO org_receipt_counters (org_id, last_number)
  VALUES (p_org_id, 0)
  ON CONFLICT (org_id) DO NOTHING;

  -- Lock row and get current value
  SELECT last_number INTO v_next
  FROM org_receipt_counters
  WHERE org_id = p_org_id
  FOR UPDATE;

  -- Increment
  v_next := v_next + 1;

  -- Update counter
  UPDATE org_receipt_counters
  SET last_number = v_next, updated_at = now()
  WHERE org_id = p_org_id;

  -- Return sequence number and formatted folio
  sequence_number := v_next;
  folio := 'WL-STRYK-' || lpad(v_next::text, 3, '0');
  RETURN NEXT;
END;
$$;

-- 5. Create trigger function to auto-assign folio on payment insert
CREATE OR REPLACE FUNCTION public.assign_receipt_folio()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result record;
BEGIN
  -- Only assign if not already set
  IF NEW.receipt_folio IS NULL THEN
    SELECT * INTO v_result FROM next_receipt_folio(NEW.organization_id);
    NEW.receipt_folio := v_result.folio;
    NEW.receipt_sequence_number := v_result.sequence_number;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 6. Create trigger (drop if exists first for idempotency)
DROP TRIGGER IF EXISTS trg_assign_receipt_folio ON public.payments;

CREATE TRIGGER trg_assign_receipt_folio
BEFORE INSERT ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.assign_receipt_folio();

-- 7. Add unique constraint on org + folio
ALTER TABLE public.payments
DROP CONSTRAINT IF EXISTS payments_org_folio_unique;

ALTER TABLE public.payments
ADD CONSTRAINT payments_org_folio_unique UNIQUE (organization_id, receipt_folio);

-- 8. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_receipt_folio 
ON public.payments(organization_id, receipt_folio);

-- 9. Create branding bucket storage policy (if bucket doesn't exist, it will be created via Supabase Dashboard)
-- Note: Storage bucket 'branding' should be created with public access

-- 10. Grant execute on function to authenticated users
GRANT EXECUTE ON FUNCTION public.next_receipt_folio TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_receipt_folio TO service_role;