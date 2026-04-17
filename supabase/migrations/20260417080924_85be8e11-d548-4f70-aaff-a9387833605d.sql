-- 1. Crear bucket público para documentos institucionales
INSERT INTO storage.buckets (id, name, public)
VALUES ('institutional-docs', 'institutional-docs', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Política de lectura para usuarios autenticados
DROP POLICY IF EXISTS "authenticated users can read institutional docs" ON storage.objects;
CREATE POLICY "authenticated users can read institutional docs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'institutional-docs'
  AND auth.role() = 'authenticated'
);

-- 3. Política de subida para usuarios autenticados (necesaria para el uploader del DD)
DROP POLICY IF EXISTS "authenticated users can upload institutional docs" ON storage.objects;
CREATE POLICY "authenticated users can upload institutional docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'institutional-docs');

DROP POLICY IF EXISTS "authenticated users can update institutional docs" ON storage.objects;
CREATE POLICY "authenticated users can update institutional docs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'institutional-docs');

-- 4. Agregar columnas a training_components
ALTER TABLE public.training_components
ADD COLUMN IF NOT EXISTS document_url text,
ADD COLUMN IF NOT EXISTS document_sections text,
ADD COLUMN IF NOT EXISTS reading_guide text;