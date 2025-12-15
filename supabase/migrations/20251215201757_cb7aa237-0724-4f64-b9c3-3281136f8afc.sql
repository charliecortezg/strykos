-- Create plans table for subscription/payment plans
CREATE TABLE public.plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  periodicity text NOT NULL DEFAULT 'monthly',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(organization_id, name)
);

-- Add plan_id to players table (foreign key to plans)
ALTER TABLE public.players 
ADD COLUMN plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL;

-- Add sport_id to players table for direct sport association
ALTER TABLE public.players 
ADD COLUMN sport_id uuid REFERENCES public.sports(id) ON DELETE SET NULL;

-- Enable RLS on plans
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- RLS policies for plans
CREATE POLICY "Users can view plans in their organization"
ON public.plans FOR SELECT
USING (organization_id = get_current_org_id());

CREATE POLICY "Director and admin can insert plans"
ON public.plans FOR INSERT
WITH CHECK (
  organization_id = get_current_org_id() AND 
  (has_org_role('org_owner'::org_role) OR has_org_role('director_deportivo'::org_role) OR has_org_role('administrativo'::org_role))
);

CREATE POLICY "Director and admin can update plans"
ON public.plans FOR UPDATE
USING (
  organization_id = get_current_org_id() AND 
  (has_org_role('org_owner'::org_role) OR has_org_role('director_deportivo'::org_role) OR has_org_role('administrativo'::org_role))
)
WITH CHECK (
  organization_id = get_current_org_id() AND 
  (has_org_role('org_owner'::org_role) OR has_org_role('director_deportivo'::org_role) OR has_org_role('administrativo'::org_role))
);

CREATE POLICY "Director and admin can delete plans"
ON public.plans FOR DELETE
USING (
  organization_id = get_current_org_id() AND 
  (has_org_role('org_owner'::org_role) OR has_org_role('director_deportivo'::org_role) OR has_org_role('administrativo'::org_role))
);

-- Create trigger for updated_at on plans
CREATE TRIGGER update_plans_updated_at
BEFORE UPDATE ON public.plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to reset payment status monthly (to be called by cron)
CREATE OR REPLACE FUNCTION public.reset_monthly_payment_status()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_rows integer;
BEGIN
  UPDATE public.players
  SET payment_status = 'pendiente'::payment_status,
      updated_at = now()
  WHERE is_active = true 
    AND is_scholarship = false;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$;