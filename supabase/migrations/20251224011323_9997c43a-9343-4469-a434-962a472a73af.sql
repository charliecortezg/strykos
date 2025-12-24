-- Create plan_limits table to define limits per subscription plan
CREATE TABLE public.plan_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_name text NOT NULL UNIQUE,
  max_categories integer NOT NULL DEFAULT 1,
  max_players integer NOT NULL DEFAULT 15,
  max_users integer NOT NULL DEFAULT 1,
  excel_import boolean NOT NULL DEFAULT false,
  data_export boolean NOT NULL DEFAULT false,
  custom_branding boolean NOT NULL DEFAULT false,
  priority_support boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert default plan limits
INSERT INTO public.plan_limits (plan_name, max_categories, max_players, max_users, excel_import, data_export, custom_branding, priority_support) VALUES
  ('freemium', 1, 15, 1, false, false, false, false),
  ('starter', 5, 75, 3, true, false, false, false),
  ('professional', 15, 250, 10, true, true, false, true),
  ('enterprise', -1, -1, -1, true, true, true, true);

-- Enable RLS
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read plan limits (public info)
CREATE POLICY "Anyone can view plan limits"
ON public.plan_limits
FOR SELECT
USING (true);

-- Only platform admin can modify plan limits
CREATE POLICY "Only platform admin can insert plan limits"
ON public.plan_limits
FOR INSERT
WITH CHECK (is_platform_admin());

CREATE POLICY "Only platform admin can update plan limits"
ON public.plan_limits
FOR UPDATE
USING (is_platform_admin())
WITH CHECK (is_platform_admin());

CREATE POLICY "Only platform admin can delete plan limits"
ON public.plan_limits
FOR DELETE
USING (is_platform_admin());