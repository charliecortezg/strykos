CREATE POLICY "authenticated users can upload docs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'institutional-docs'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "authenticated users can update docs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'institutional-docs'
  AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "authenticated users can read docs" ON storage.objects;
CREATE POLICY "public can read docs"
ON storage.objects FOR SELECT
USING (bucket_id = 'institutional-docs');