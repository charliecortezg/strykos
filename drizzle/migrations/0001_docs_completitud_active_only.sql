CREATE OR REPLACE FUNCTION public.docs_completitud_org() RETURNS TABLE(player_id uuid, obligatorios_aprobados int, por_revisar int, datos_completos boolean, completo boolean, constancia text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id,
    (SELECT count(*)::int FROM public.player_documents d WHERE d.player_id = p.id AND d.is_current AND d.status='aprobado' AND d.doc_type IN ('curp','acta','foto')),
    (SELECT count(*)::int FROM public.player_documents d WHERE d.player_id = p.id AND d.is_current AND d.status='en_revision'),
    (nullif(trim(p.full_name),'') IS NOT NULL AND p.date_of_birth IS NOT NULL AND nullif(trim(coalesce(p.curp,'')),'') IS NOT NULL),
    ((SELECT count(*) FROM public.player_documents d WHERE d.player_id = p.id AND d.is_current AND d.status='aprobado' AND d.doc_type IN ('curp','acta','foto')) = 3
      AND nullif(trim(p.full_name),'') IS NOT NULL AND p.date_of_birth IS NOT NULL AND nullif(trim(coalesce(p.curp,'')),'') IS NOT NULL),
    public.docs_constancia_vigencia(p.id)
  FROM public.players p
  WHERE p.organization_id = public.get_current_org_id() AND p.is_active AND auth.uid() IS NOT NULL AND public.user_belongs_to_org(p.organization_id)
$$;