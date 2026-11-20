CREATE OR REPLACE FUNCTION public.trg_release_jersey_on_deactivate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.is_active IS TRUE AND NEW.is_active IS FALSE THEN
    NEW.jersey_number := NULL;
    DELETE FROM public.uniform_blocked_numbers WHERE player_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS release_jersey_on_deactivate ON public.players;
CREATE TRIGGER release_jersey_on_deactivate BEFORE UPDATE OF is_active ON public.players
FOR EACH ROW EXECUTE FUNCTION public.trg_release_jersey_on_deactivate();

CREATE OR REPLACE FUNCTION public.trg_sync_jersey_on_order_confirm()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.number_status = 'confirmed' AND (OLD.number_status IS DISTINCT FROM 'confirmed')
     AND NEW.player_id IS NOT NULL AND NEW.assigned_number IS NOT NULL THEN
    UPDATE public.players SET jersey_number = NEW.assigned_number
     WHERE id = NEW.player_id AND is_active;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS sync_jersey_on_order_confirm ON public.uniform_orders;
CREATE TRIGGER sync_jersey_on_order_confirm AFTER UPDATE OF number_status ON public.uniform_orders
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_jersey_on_order_confirm();