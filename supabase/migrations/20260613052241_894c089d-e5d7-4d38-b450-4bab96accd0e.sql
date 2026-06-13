
INSERT INTO profiles (id, organization_id, active_organization_id, full_name, email, is_active, must_change_password) VALUES
  ('caf7c42b-14e3-4df9-9ff4-7dac877a4211','9ad70018-5b81-4f28-932e-26e2718929d9','9ad70018-5b81-4f28-932e-26e2718929d9','Demo Test Owner','demo-test-owner@stryk-test.com',true,false),
  ('b26e1709-6143-4490-97f1-35ffd1388e77','982f355c-0196-46d3-8da9-3e5e83813dad','982f355c-0196-46d3-8da9-3e5e83813dad','WL Test Owner','wl-test-owner@stryk-test.com',true,false)
ON CONFLICT (id) DO UPDATE SET organization_id=EXCLUDED.organization_id, active_organization_id=EXCLUDED.active_organization_id, is_active=true;

INSERT INTO user_org_roles (user_id, organization_id, role) VALUES
  ('caf7c42b-14e3-4df9-9ff4-7dac877a4211','9ad70018-5b81-4f28-932e-26e2718929d9','org_owner'),
  ('b26e1709-6143-4490-97f1-35ffd1388e77','982f355c-0196-46d3-8da9-3e5e83813dad','org_owner')
ON CONFLICT DO NOTHING;
