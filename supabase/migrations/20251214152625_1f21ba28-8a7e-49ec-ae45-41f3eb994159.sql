-- Phase 1: Create platform_roles table
CREATE TABLE IF NOT EXISTS public.platform_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.platform_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on platform_roles
ALTER TABLE public.platform_roles ENABLE ROW LEVEL SECURITY;

-- Only the user themselves can view their platform role
CREATE POLICY "Users can view their own platform role"
ON public.platform_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Phase 2: Create is_platform_admin function
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_roles
    WHERE user_id = auth.uid()
      AND role = 'platform_super_admin'
  );
$$;

-- Phase 3: Fix organizations RLS policies

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;

-- Create new SELECT policy that includes platform admin
CREATE POLICY "Organizations visible to members or platform admin"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  public.is_platform_admin()
  OR id = public.get_current_org_id()
);

-- Create UPDATE policy (org_owner or platform admin)
CREATE POLICY "Org owners or platform admin can update organization"
ON public.organizations
FOR UPDATE
TO authenticated
USING (
  public.is_platform_admin()
  OR (
    id = public.get_current_org_id()
    AND public.has_org_role('org_owner')
  )
)
WITH CHECK (
  public.is_platform_admin()
  OR (
    id = public.get_current_org_id()
    AND public.has_org_role('org_owner')
  )
);

-- Create DELETE policy (platform admin only)
CREATE POLICY "Only platform admin can delete organization"
ON public.organizations
FOR DELETE
TO authenticated
USING (
  public.is_platform_admin()
);