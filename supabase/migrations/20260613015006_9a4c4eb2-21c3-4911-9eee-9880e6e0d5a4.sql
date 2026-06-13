-- Helper: list of org ids the current user belongs to
CREATE OR REPLACE FUNCTION public.get_user_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.user_org_roles
  WHERE user_id = auth.uid();
$$;

-- Additive SELECT policy: user can read their own role rows across all orgs
CREATE POLICY "Users can view their own roles across orgs"
ON public.user_org_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Additive SELECT policy: user can read any organization where they hold a role
CREATE POLICY "Users can view their member organizations"
ON public.organizations
FOR SELECT
TO authenticated
USING (id IN (SELECT public.get_user_org_ids()));