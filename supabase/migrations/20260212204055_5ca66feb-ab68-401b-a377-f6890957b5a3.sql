
-- A) Update trigger function to include 'prospect' players
CREATE OR REPLACE FUNCTION public.trg_assign_membership_on_player_create()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF COALESCE(NEW.player_type, 'internal') = 'internal' 
     AND COALESCE(NEW.lifecycle_status, 'active') IN ('active', 'prospect')
     AND NEW.membership_stage = 'none' THEN
    PERFORM assign_default_membership_block(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

-- B) Update lifecycle change trigger to cover prospect -> active
CREATE OR REPLACE FUNCTION public.trg_membership_lifecycle_reset()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- When reactivating from inactive -> restart at FOUNDATION
  IF OLD.lifecycle_status = 'inactive' AND NEW.lifecycle_status = 'active' THEN
    PERFORM assign_default_membership_block(NEW.id);
    
    INSERT INTO membership_progression_log (org_id, player_id, from_block_id, to_block_id, action, metrics_snapshot)
    VALUES (NEW.organization_id, NEW.id, OLD.block_id, NEW.block_id, 'RESTART_AFTER_INACTIVE', '{}'::jsonb);
  END IF;

  -- When prospect -> active and no block assigned yet
  IF OLD.lifecycle_status = 'prospect' AND NEW.lifecycle_status = 'active' AND NEW.membership_stage = 'none' THEN
    PERFORM assign_default_membership_block(NEW.id);
  END IF;

  RETURN NEW;
END;
$function$;

-- C) Retroactive bulk assignment for all internal players without a block
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id FROM players
    WHERE player_type = 'internal'
      AND membership_stage = 'none'
      AND lifecycle_status IN ('active', 'prospect')
  LOOP
    PERFORM assign_default_membership_block(r.id);
  END LOOP;
END;
$$;
