
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS logo_url text;

-- Anyone can read org-logos objects (used in public header)
DROP POLICY IF EXISTS "org_logos_public_read" ON storage.objects;
CREATE POLICY "org_logos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'org-logos');

-- Authenticated members of the org can upload (folder convention: <org_id>/...)
DROP POLICY IF EXISTS "org_logos_owner_write" ON storage.objects;
CREATE POLICY "org_logos_owner_write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'org-logos'
    AND public.user_belongs_to_org((storage.foldername(name))[1]::uuid)
  );

DROP POLICY IF EXISTS "org_logos_owner_update" ON storage.objects;
CREATE POLICY "org_logos_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'org-logos'
    AND public.user_belongs_to_org((storage.foldername(name))[1]::uuid)
  );

DROP POLICY IF EXISTS "org_logos_owner_delete" ON storage.objects;
CREATE POLICY "org_logos_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'org-logos'
    AND public.user_belongs_to_org((storage.foldername(name))[1]::uuid)
  );
