ALTER TABLE public.uniform_orders
  ADD COLUMN player_id uuid NULL REFERENCES public.players(id) ON DELETE SET NULL;

ALTER TABLE public.uniform_orders
  DROP CONSTRAINT uniform_orders_org_id_category_id_assigned_number_key;

ALTER TABLE public.uniform_orders
  ADD CONSTRAINT uniform_orders_campaign_category_number_key
  UNIQUE (campaign_id, category_id, assigned_number);

CREATE INDEX uniform_orders_player_id_idx
  ON public.uniform_orders (player_id);