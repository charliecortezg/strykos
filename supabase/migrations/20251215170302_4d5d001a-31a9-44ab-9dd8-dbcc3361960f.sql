-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Director and admin can view expenses"
ON public.expenses FOR SELECT
USING (
  organization_id = get_current_org_id() AND (
    has_org_role('org_owner'::org_role) OR
    has_org_role('director_deportivo'::org_role) OR
    has_org_role('administrativo'::org_role)
  )
);

CREATE POLICY "Director and admin can insert expenses"
ON public.expenses FOR INSERT
WITH CHECK (
  organization_id = get_current_org_id() AND (
    has_org_role('org_owner'::org_role) OR
    has_org_role('director_deportivo'::org_role) OR
    has_org_role('administrativo'::org_role)
  )
);

CREATE POLICY "Director and admin can update expenses"
ON public.expenses FOR UPDATE
USING (
  organization_id = get_current_org_id() AND (
    has_org_role('org_owner'::org_role) OR
    has_org_role('director_deportivo'::org_role) OR
    has_org_role('administrativo'::org_role)
  )
)
WITH CHECK (
  organization_id = get_current_org_id() AND (
    has_org_role('org_owner'::org_role) OR
    has_org_role('director_deportivo'::org_role) OR
    has_org_role('administrativo'::org_role)
  )
);

CREATE POLICY "Director and admin can delete expenses"
ON public.expenses FOR DELETE
USING (
  organization_id = get_current_org_id() AND (
    has_org_role('org_owner'::org_role) OR
    has_org_role('director_deportivo'::org_role) OR
    has_org_role('administrativo'::org_role)
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();