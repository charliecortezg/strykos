ALTER TABLE public.evaluation_events
ADD COLUMN evaluation_type text DEFAULT 'formativa';

-- Use a validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_evaluation_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.evaluation_type IS NOT NULL AND NEW.evaluation_type NOT IN (
    'diagnostica', 'formativa', 'cierre_m1', 'retorno', 'final'
  ) THEN
    RAISE EXCEPTION 'Invalid evaluation_type: %', NEW.evaluation_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_evaluation_type
BEFORE INSERT OR UPDATE ON public.evaluation_events
FOR EACH ROW
EXECUTE FUNCTION public.validate_evaluation_type();