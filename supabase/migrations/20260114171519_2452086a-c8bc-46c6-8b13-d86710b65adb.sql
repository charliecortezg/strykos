-- Add billing configuration columns to organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS billing_admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS billing_receipts_email TEXT;

ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS billing_due_day SMALLINT DEFAULT 5;

ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS billing_period_type TEXT NOT NULL DEFAULT 'monthly_calendar';

ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS billing_grace_days SMALLINT NOT NULL DEFAULT 0;

ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS billing_auto_overdue BOOLEAN NOT NULL DEFAULT true;

-- Add constraint for billing_due_day (1-28)
ALTER TABLE public.organizations 
DROP CONSTRAINT IF EXISTS organizations_billing_due_day_check;

ALTER TABLE public.organizations 
ADD CONSTRAINT organizations_billing_due_day_check 
CHECK (billing_due_day IS NULL OR (billing_due_day >= 1 AND billing_due_day <= 28));

-- Add constraint for billing_grace_days (0-15)
ALTER TABLE public.organizations 
DROP CONSTRAINT IF EXISTS organizations_billing_grace_days_check;

ALTER TABLE public.organizations 
ADD CONSTRAINT organizations_billing_grace_days_check 
CHECK (billing_grace_days >= 0 AND billing_grace_days <= 15);

-- Add receipt_sent_to JSONB column to payments for tracking recipients
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS receipt_sent_to JSONB;

-- Update RLS policy on organizations to allow administrativo to update billing settings
DROP POLICY IF EXISTS "Org owners or platform admin can update organization" ON public.organizations;

CREATE POLICY "Org owners, admin or platform admin can update organization"
ON public.organizations
FOR UPDATE
USING (
  is_platform_admin() 
  OR (
    id = get_current_org_id() 
    AND (has_org_role('org_owner'::org_role) OR has_org_role('administrativo'::org_role))
  )
)
WITH CHECK (
  is_platform_admin() 
  OR (
    id = get_current_org_id() 
    AND (has_org_role('org_owner'::org_role) OR has_org_role('administrativo'::org_role))
  )
);