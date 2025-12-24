-- Create upgrade_requests table for tracking plan upgrade requests
CREATE TABLE public.upgrade_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  current_plan text NOT NULL,
  requested_plan text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  processed_by uuid,
  processed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected', 'contacted'))
);

-- Enable RLS
ALTER TABLE public.upgrade_requests ENABLE ROW LEVEL SECURITY;

-- Org owners can create upgrade requests for their org
CREATE POLICY "Org owners can create upgrade requests"
ON public.upgrade_requests
FOR INSERT
WITH CHECK (
  organization_id = get_current_org_id() 
  AND has_org_role('org_owner'::org_role)
);

-- Org owners can view their own upgrade requests
CREATE POLICY "Org owners can view their upgrade requests"
ON public.upgrade_requests
FOR SELECT
USING (
  organization_id = get_current_org_id()
  OR is_platform_admin()
);

-- Only platform admin can update upgrade requests
CREATE POLICY "Platform admin can update upgrade requests"
ON public.upgrade_requests
FOR UPDATE
USING (is_platform_admin())
WITH CHECK (is_platform_admin());

-- Only platform admin can delete upgrade requests
CREATE POLICY "Platform admin can delete upgrade requests"
ON public.upgrade_requests
FOR DELETE
USING (is_platform_admin());

-- Create index for faster lookups
CREATE INDEX idx_upgrade_requests_org ON public.upgrade_requests(organization_id);
CREATE INDEX idx_upgrade_requests_status ON public.upgrade_requests(status);