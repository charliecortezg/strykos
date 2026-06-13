
DO $$
DECLARE
  v_org uuid := '9ad70018-5b81-4f28-932e-26e2718929d9';
  v_user uuid := '75be2426-55af-4537-8a7c-0fbd70febe6d';
  v_sport uuid := '69d680e4-f183-42e7-a82b-501dd26e8a59';
  v_cat uuid;
  v_p1 uuid; v_p2 uuid; v_p3 uuid;
BEGIN
  INSERT INTO public.categories (organization_id, name, sport_id, age_group, days_of_week)
  VALUES (v_org, 'Sub-10 Demo', v_sport, '8-9', ARRAY['mon','wed'])
  RETURNING id INTO v_cat;

  INSERT INTO public.players (organization_id, category_id, full_name, monthly_fee, sport_id)
  VALUES (v_org, v_cat, 'Jugador Demo Uno', 1000, v_sport) RETURNING id INTO v_p1;
  INSERT INTO public.players (organization_id, category_id, full_name, monthly_fee, sport_id)
  VALUES (v_org, v_cat, 'Jugador Demo Dos', 1200, v_sport) RETURNING id INTO v_p2;
  INSERT INTO public.players (organization_id, category_id, full_name, monthly_fee, sport_id)
  VALUES (v_org, v_cat, 'Jugador Demo Tres', 1500, v_sport) RETURNING id INTO v_p3;

  INSERT INTO public.payments (organization_id, player_id, amount, payment_month, concept, recorded_by)
  VALUES (v_org, v_p1, 1000, date_trunc('month', current_date)::date, 'Mensualidad', v_user);
  INSERT INTO public.payments (organization_id, player_id, amount, payment_month, concept, recorded_by)
  VALUES (v_org, v_p2, 1200, date_trunc('month', current_date)::date, 'Mensualidad', v_user);

  INSERT INTO public.expenses (organization_id, amount, category, description, expense_date, recorded_by)
  VALUES (v_org, 300, 'Material', 'Conos y balones', current_date, v_user);
  INSERT INTO public.expenses (organization_id, amount, category, description, expense_date, recorded_by)
  VALUES (v_org, 500, 'Cancha', 'Renta de cancha', current_date, v_user);
END $$;
