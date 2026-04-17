CREATE POLICY "authenticated users can update training components"
ON training_components FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');