
-- Add jersey_number to players
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS jersey_number int;

-- TABLA 1: Campañas de uniformes
CREATE TABLE public.uniform_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  name text NOT NULL,
  public_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  deadline date,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.uniform_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_campaigns_select" ON public.uniform_campaigns
  FOR SELECT USING (
    org_id = public.get_current_org_id()
    OR public_token IS NOT NULL
  );

CREATE POLICY "org_isolation_campaigns_insert" ON public.uniform_campaigns
  FOR INSERT WITH CHECK (org_id = public.get_current_org_id());

CREATE POLICY "org_isolation_campaigns_update" ON public.uniform_campaigns
  FOR UPDATE USING (org_id = public.get_current_org_id());

CREATE POLICY "org_isolation_campaigns_delete" ON public.uniform_campaigns
  FOR DELETE USING (org_id = public.get_current_org_id());

-- TABLA 2: Órdenes de uniformes
CREATE TABLE public.uniform_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  campaign_id uuid NOT NULL REFERENCES public.uniform_campaigns(id),
  player_name text NOT NULL,
  category_id uuid NOT NULL REFERENCES public.categories(id),
  category_name text NOT NULL,
  uniform_type text CHECK (uniform_type IN ('manga_corta', 'manga_larga')),
  jersey_size text,
  name_on_jersey text,
  requested_number int,
  assigned_number int,
  number_status text NOT NULL DEFAULT 'submitted' CHECK (number_status IN ('submitted', 'confirmed')),
  price numeric(10,2) NOT NULL DEFAULT 0,
  paid boolean NOT NULL DEFAULT false,
  payment_notes text,
  delivered boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (org_id, category_id, assigned_number)
);

ALTER TABLE public.uniform_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_access_orders_select" ON public.uniform_orders
  FOR SELECT USING (org_id = public.get_current_org_id());

CREATE POLICY "admin_access_orders_insert" ON public.uniform_orders
  FOR INSERT WITH CHECK (org_id = public.get_current_org_id());

CREATE POLICY "admin_access_orders_update" ON public.uniform_orders
  FOR UPDATE USING (org_id = public.get_current_org_id());

CREATE POLICY "admin_access_orders_delete" ON public.uniform_orders
  FOR DELETE USING (org_id = public.get_current_org_id());

-- Trigger for updated_at
CREATE TRIGGER update_uniform_orders_updated_at
  BEFORE UPDATE ON public.uniform_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- TABLA 3: Números bloqueados
CREATE TABLE public.uniform_blocked_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  category_id uuid REFERENCES public.categories(id),
  category_name text NOT NULL,
  player_name text NOT NULL,
  player_id uuid REFERENCES public.players(id),
  number int NOT NULL,
  UNIQUE (org_id, category_id, number)
);

ALTER TABLE public.uniform_blocked_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_blocked_select" ON public.uniform_blocked_numbers
  FOR SELECT USING (org_id = public.get_current_org_id());

CREATE POLICY "org_isolation_blocked_insert" ON public.uniform_blocked_numbers
  FOR INSERT WITH CHECK (org_id = public.get_current_org_id());

CREATE POLICY "org_isolation_blocked_update" ON public.uniform_blocked_numbers
  FOR UPDATE USING (org_id = public.get_current_org_id());

CREATE POLICY "org_isolation_blocked_delete" ON public.uniform_blocked_numbers
  FOR DELETE USING (org_id = public.get_current_org_id());
