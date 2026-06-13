
DO $$
DECLARE
  v_org_id uuid := 'aaaaaaaa-2222-4222-8222-222222222222';
  v_user_id uuid := '816220e1-391c-4262-beee-b15bf7522a0a';
  v_cat_id uuid;
  v_p1 uuid := gen_random_uuid();
  v_p2 uuid := gen_random_uuid();
BEGIN
  INSERT INTO organizations (id, name, org_code, org_access_key, organization_type, approximate_students, primary_sport, city, country, phone, plan, is_active, feature_profile)
  VALUES (v_org_id, 'Academia Test 2', 'academia-test-2', 'T2A-T2B', 'privada', 10, 'futbol', 'CDMX', 'MX', '+520000000000', 'freemium', true, 'basic')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, organization_id, active_organization_id, full_name, email, is_active, must_change_password)
  VALUES (v_user_id, v_org_id, v_org_id, 'Test2 Owner', 'test2b-owner@stryk-test.com', true, false)
  ON CONFLICT (id) DO UPDATE SET organization_id=v_org_id, active_organization_id=v_org_id, is_active=true;

  INSERT INTO user_org_roles (user_id, organization_id, role)
  VALUES (v_user_id, v_org_id, 'org_owner') ON CONFLICT DO NOTHING;

  SELECT id INTO v_cat_id FROM categories WHERE organization_id=v_org_id LIMIT 1;
  IF v_cat_id IS NULL THEN
    v_cat_id := gen_random_uuid();
    INSERT INTO categories (id, organization_id, name, sport_id, age_group)
    VALUES (v_cat_id, v_org_id, 'Categoría Test 2', (SELECT id FROM sports LIMIT 1), 'Sub-12');
  END IF;

  INSERT INTO players (id, organization_id, full_name, date_of_birth, category_id, monthly_fee, is_active, payment_status)
  VALUES
    (v_p1, v_org_id, 'Test2 Player A', '2015-01-01', v_cat_id, 500, true, 'al_dia'),
    (v_p2, v_org_id, 'Test2 Player B', '2015-02-02', v_cat_id, 500, true, 'al_dia');

  INSERT INTO payments (organization_id, player_id, amount, payment_method, payment_month, concept)
  VALUES (v_org_id, v_p1, 500, 'efectivo', date_trunc('month', now())::date, 'Mensualidad');
END $$;
