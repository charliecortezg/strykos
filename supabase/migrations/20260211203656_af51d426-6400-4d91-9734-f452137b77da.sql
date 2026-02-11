
-- 1. RPC: get_or_create_monthly_event
CREATE OR REPLACE FUNCTION public.get_or_create_monthly_event(p_org_id uuid)
RETURNS SETOF public.evaluation_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_month_key text;
  v_title text;
  v_event evaluation_events%ROWTYPE;
  v_month_names text[] := ARRAY['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
BEGIN
  v_month_key := to_char(now(), 'YYYY-MM');
  v_title := 'Evaluación Externa - ' || v_month_names[EXTRACT(MONTH FROM now())::int] || ' ' || EXTRACT(YEAR FROM now())::text;

  -- Try to find existing active event for this month
  SELECT * INTO v_event
  FROM evaluation_events
  WHERE organization_id = p_org_id
    AND title LIKE 'Evaluación Externa%'
    AND status != 'closed'
    AND to_char(created_at, 'YYYY-MM') = v_month_key
  LIMIT 1;

  IF v_event.id IS NOT NULL THEN
    RETURN NEXT v_event;
    RETURN;
  END IF;

  -- Create new event
  INSERT INTO evaluation_events (organization_id, title, status, event_date, created_by)
  VALUES (p_org_id, v_title, 'active', now(), auth.uid())
  RETURNING * INTO v_event;

  RETURN NEXT v_event;
  RETURN;
END;
$$;

-- 2. Table: coach_notifications
CREATE TABLE IF NOT EXISTS public.coach_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  type text NOT NULL DEFAULT 'evaluation_ready',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. RLS for coach_notifications
ALTER TABLE public.coach_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON public.coach_notifications
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
ON public.coach_notifications
FOR UPDATE
USING (user_id = auth.uid());

-- Members of org can insert notifications for coaches in same org
CREATE POLICY "Org members can insert notifications"
ON public.coach_notifications
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_org_roles
    WHERE user_id = auth.uid()
      AND organization_id = coach_notifications.organization_id
  )
);
