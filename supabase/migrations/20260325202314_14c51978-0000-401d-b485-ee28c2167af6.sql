CREATE POLICY "Trainers can delete own scheduled matches"
ON public.matches
FOR DELETE
TO authenticated
USING (
  organization_id = get_current_org_id()
  AND has_org_role('entrenador'::org_role)
  AND is_category_trainer(category_id)
  AND status = 'programado'
);