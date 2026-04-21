-- ============================================
-- CHEER CAMPAIGNS (Camisetas de Porra)
-- ============================================

CREATE TABLE public.cheer_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  deadline date,
  notes text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  public_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  price_per_item numeric NOT NULL DEFAULT 350,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cheer_campaigns_org ON public.cheer_campaigns(org_id);
CREATE INDEX idx_cheer_campaigns_token ON public.cheer_campaigns(public_token);

-- ============================================
-- CHEER ORDERS
-- ============================================

CREATE TABLE public.cheer_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.cheer_campaigns(id) ON DELETE CASCADE,
  buyer_name text NOT NULL,
  buyer_whatsapp text NOT NULL,
  total_items int NOT NULL,
  total_price numeric NOT NULL,
  paid boolean NOT NULL DEFAULT false,
  delivered boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cheer_orders_org ON public.cheer_orders(org_id);
CREATE INDEX idx_cheer_orders_campaign ON public.cheer_orders(campaign_id);

-- ============================================
-- CHEER ORDER ITEMS
-- ============================================

CREATE TABLE public.cheer_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.cheer_orders(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.cheer_campaigns(id) ON DELETE CASCADE,
  name_on_jersey text NOT NULL CHECK (char_length(name_on_jersey) <= 12),
  number_on_jersey int CHECK (number_on_jersey IS NULL OR (number_on_jersey BETWEEN 1 AND 99)),
  size text NOT NULL CHECK (size IN ('XS','S','M','L','XL','XXL')),
  item_price numeric NOT NULL DEFAULT 350
);

CREATE INDEX idx_cheer_order_items_order ON public.cheer_order_items(order_id);
CREATE INDEX idx_cheer_order_items_campaign ON public.cheer_order_items(campaign_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_cheer_campaigns_updated_at
  BEFORE UPDATE ON public.cheer_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- RLS
-- ============================================

ALTER TABLE public.cheer_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cheer_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cheer_order_items ENABLE ROW LEVEL SECURITY;

-- cheer_campaigns: org members CRUD
CREATE POLICY "Org members can view cheer campaigns"
  ON public.cheer_campaigns FOR SELECT TO authenticated
  USING (org_id = public.get_current_org_id() AND public.has_intake_access());

CREATE POLICY "Org members can create cheer campaigns"
  ON public.cheer_campaigns FOR INSERT TO authenticated
  WITH CHECK (org_id = public.get_current_org_id() AND public.has_intake_access());

CREATE POLICY "Org members can update cheer campaigns"
  ON public.cheer_campaigns FOR UPDATE TO authenticated
  USING (org_id = public.get_current_org_id() AND public.has_intake_access());

CREATE POLICY "Org members can delete cheer campaigns"
  ON public.cheer_campaigns FOR DELETE TO authenticated
  USING (org_id = public.get_current_org_id() AND public.has_intake_access());

-- cheer_orders: org members CRUD
CREATE POLICY "Org members can view cheer orders"
  ON public.cheer_orders FOR SELECT TO authenticated
  USING (org_id = public.get_current_org_id() AND public.has_intake_access());

CREATE POLICY "Org members can update cheer orders"
  ON public.cheer_orders FOR UPDATE TO authenticated
  USING (org_id = public.get_current_org_id() AND public.has_intake_access());

CREATE POLICY "Org members can delete cheer orders"
  ON public.cheer_orders FOR DELETE TO authenticated
  USING (org_id = public.get_current_org_id() AND public.has_intake_access());

-- cheer_order_items: org members can view; cascade handles deletes
CREATE POLICY "Org members can view cheer order items"
  ON public.cheer_order_items FOR SELECT TO authenticated
  USING (org_id = public.get_current_org_id() AND public.has_intake_access());

-- Note: Inserts for orders + items are done by the public edge function using the service role key.