ALTER TABLE public.players ADD COLUMN IF NOT EXISTS curp text;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS temporada_actual text DEFAULT '2026-2027';

CREATE TABLE public.player_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN ('curp','acta','foto','constancia_estudios')),
  season text,
  storage_path text NOT NULL,
  mime_type text,
  status text NOT NULL CHECK (status IN ('en_revision','aprobado','rechazado')),
  source text NOT NULL CHECK (source IN ('familia','admin')),
  uploaded_by uuid,
  uploaded_by_guardian uuid REFERENCES public.guardians(id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamptz,
  rejection_reason text,
  is_current boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX player_documents_current_uniq ON public.player_documents(player_id, doc_type) WHERE is_current AND doc_type <> 'constancia_estudios';
CREATE UNIQUE INDEX player_documents_current_const_uniq ON public.player_documents(player_id, season) WHERE is_current AND doc_type = 'constancia_estudios';
CREATE INDEX player_documents_org_idx ON public.player_documents(org_id, player_id);

CREATE TABLE public.document_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.player_documents(id) ON DELETE SET NULL,
  user_id uuid,
  guardian_id uuid REFERENCES public.guardians(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('subio','vio','descargo','aprobo','rechazo','elimino')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX document_access_log_org_idx ON public.document_access_log(org_id, created_at DESC);

GRANT SELECT ON public.player_documents TO authenticated;
GRANT ALL ON public.player_documents TO service_role;
GRANT SELECT ON public.document_access_log TO authenticated;
GRANT ALL ON public.document_access_log TO service_role;
ALTER TABLE public.player_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_access_log ENABLE ROW LEVEL SECURITY;

-- Helpers
CREATE OR REPLACE FUNCTION public.docs_es_admin(_org uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND _org = public.get_current_org_id()
    AND (public.has_org_role('org_owner'::org_role) OR public.has_org_role('administrativo'::org_role))
$$;

CREATE OR REPLACE FUNCTION public.docs_es_servicio() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT coalesce(current_setting('request.jwt.claims', true)::json->>'role','') = 'service_role'
$$;

CREATE OR REPLACE FUNCTION public.docs_tutor_de(_guardian uuid, _player uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.player_guardians pg JOIN public.guardians g ON g.id = pg.guardian_id
    JOIN public.players p ON p.id = pg.player_id
    WHERE pg.guardian_id = _guardian AND pg.player_id = _player AND g.organization_id = p.organization_id)
$$;

-- storage path: {org}/{player}/{doc_type}/{file}
CREATE OR REPLACE FUNCTION public.puede_ver_documentos(_path text) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid;
BEGIN
  BEGIN v_org := split_part(_path,'/',1)::uuid; EXCEPTION WHEN others THEN RETURN false; END;
  RETURN public.docs_es_admin(v_org);
END $$;

CREATE OR REPLACE FUNCTION public.puede_subir_documentos(_path text) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid; v_player uuid;
BEGIN
  BEGIN v_org := split_part(_path,'/',1)::uuid; v_player := split_part(_path,'/',2)::uuid;
  EXCEPTION WHEN others THEN RETURN false; END;
  IF split_part(_path,'/',3) NOT IN ('curp','acta','foto','constancia_estudios') THEN RETURN false; END IF;
  RETURN public.docs_es_admin(v_org) AND EXISTS (SELECT 1 FROM public.players WHERE id = v_player AND organization_id = v_org);
END $$;

CREATE POLICY "Admins ven documentos de su org" ON public.player_documents FOR SELECT TO authenticated
  USING (public.docs_es_admin(org_id));
CREATE POLICY "Admins ven bitacora de su org" ON public.document_access_log FOR SELECT TO authenticated
  USING (public.docs_es_admin(org_id));

-- Storage policies (bucket created separately). Only admin uploads directly; reads go through signed URLs.
CREATE POLICY "docs admin insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'player-documents' AND public.puede_subir_documentos(name));

-- Vigencia de constancia
CREATE OR REPLACE FUNCTION public.docs_constancia_vigencia(p_player_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN NOT EXISTS (SELECT 1 FROM public.player_documents d WHERE d.player_id = p_player_id AND d.doc_type='constancia_estudios' AND d.is_current AND d.status <> 'rechazado') THEN 'sin_constancia'
    WHEN EXISTS (SELECT 1 FROM public.player_documents d JOIN public.organizations o ON o.id = d.org_id
       WHERE d.player_id = p_player_id AND d.doc_type='constancia_estudios' AND d.is_current AND d.status <> 'rechazado' AND d.season = o.temporada_actual) THEN 'vigente'
    ELSE 'vencida' END
$$;

CREATE OR REPLACE FUNCTION public.docs_estado_jugador(p_player_id uuid, p_guardian_id uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_p record; v_season text; v_docs jsonb; v_req int;
BEGIN
  SELECT id, organization_id, full_name, date_of_birth, curp INTO v_p FROM public.players WHERE id = p_player_id;
  IF v_p.id IS NULL THEN RAISE EXCEPTION 'Jugador no encontrado'; END IF;
  IF p_guardian_id IS NOT NULL THEN
    IF NOT public.docs_es_servicio() OR NOT public.docs_tutor_de(p_guardian_id, p_player_id) THEN RAISE EXCEPTION 'Sin permiso'; END IF;
  ELSIF NOT public.docs_es_admin(v_p.organization_id) THEN RAISE EXCEPTION 'Sin permiso';
  END IF;
  SELECT temporada_actual INTO v_season FROM public.organizations WHERE id = v_p.organization_id;
  SELECT coalesce(jsonb_object_agg(doc_type, row_to_json(x)::jsonb), '{}'::jsonb) INTO v_docs FROM (
    SELECT DISTINCT ON (doc_type) doc_type, id, status, source, season, version, uploaded_at, rejection_reason, mime_type
    FROM public.player_documents WHERE player_id = p_player_id AND is_current
    ORDER BY doc_type, (season = v_season) DESC NULLS LAST, uploaded_at DESC) x;
  SELECT count(*) INTO v_req FROM public.player_documents WHERE player_id = p_player_id AND is_current AND status='aprobado' AND doc_type IN ('curp','acta','foto');
  RETURN jsonb_build_object(
    'player', jsonb_build_object('id', v_p.id, 'full_name', v_p.full_name, 'date_of_birth', v_p.date_of_birth, 'curp', v_p.curp),
    'temporada_actual', v_season, 'docs', v_docs,
    'constancia_vigencia', public.docs_constancia_vigencia(p_player_id),
    'obligatorios_aprobados', v_req,
    'completo', v_req = 3 AND nullif(trim(v_p.full_name),'') IS NOT NULL AND v_p.date_of_birth IS NOT NULL AND nullif(trim(coalesce(v_p.curp,'')),'') IS NOT NULL);
END $$;

CREATE OR REPLACE FUNCTION public.docs_subir(p_player_id uuid, p_doc_type text, p_storage_path text, p_source text, p_mime_type text DEFAULT NULL, p_guardian_id uuid DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid; v_season text; v_prev record; v_id uuid; v_status text;
BEGIN
  SELECT organization_id INTO v_org FROM public.players WHERE id = p_player_id;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Jugador no encontrado'; END IF;
  IF p_doc_type NOT IN ('curp','acta','foto','constancia_estudios') THEN RAISE EXCEPTION 'Tipo inválido'; END IF;
  IF p_storage_path NOT LIKE v_org::text || '/' || p_player_id::text || '/' || p_doc_type || '/%' THEN RAISE EXCEPTION 'Ruta inválida'; END IF;
  IF p_source = 'familia' THEN
    IF p_guardian_id IS NULL OR NOT public.docs_es_servicio() OR NOT public.docs_tutor_de(p_guardian_id, p_player_id) THEN RAISE EXCEPTION 'Sin permiso'; END IF;
    v_status := 'en_revision';
  ELSIF p_source = 'admin' THEN
    IF NOT public.docs_es_admin(v_org) THEN RAISE EXCEPTION 'Sin permiso'; END IF;
    v_status := 'aprobado';
  ELSE RAISE EXCEPTION 'Origen inválido'; END IF;
  IF p_doc_type = 'constancia_estudios' THEN SELECT temporada_actual INTO v_season FROM public.organizations WHERE id = v_org; END IF;

  SELECT * INTO v_prev FROM public.player_documents
   WHERE player_id = p_player_id AND doc_type = p_doc_type AND is_current
     AND (p_doc_type <> 'constancia_estudios' OR season IS NOT DISTINCT FROM v_season) LIMIT 1;
  IF v_prev.id IS NOT NULL AND p_source = 'familia' AND v_prev.status = 'aprobado' THEN
    RAISE EXCEPTION 'Este documento ya está aprobado';
  END IF;
  IF v_prev.id IS NOT NULL THEN UPDATE public.player_documents SET is_current = false WHERE id = v_prev.id; END IF;

  INSERT INTO public.player_documents(org_id, player_id, doc_type, season, storage_path, mime_type, status, source, uploaded_by, uploaded_by_guardian, version, reviewed_by, reviewed_at)
  VALUES (v_org, p_player_id, p_doc_type, v_season, p_storage_path, p_mime_type, v_status, p_source, auth.uid(), p_guardian_id,
    coalesce((SELECT max(version) FROM public.player_documents WHERE player_id = p_player_id AND doc_type = p_doc_type),0)+1,
    CASE WHEN p_source='admin' THEN auth.uid() END, CASE WHEN p_source='admin' THEN now() END)
  RETURNING id INTO v_id;
  INSERT INTO public.document_access_log(org_id, player_id, document_id, user_id, guardian_id, action)
  VALUES (v_org, p_player_id, v_id, auth.uid(), p_guardian_id, 'subio');
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.docs_revisar(p_document_id uuid, p_decision text, p_motivo text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_d record;
BEGIN
  SELECT * INTO v_d FROM public.player_documents WHERE id = p_document_id;
  IF v_d.id IS NULL OR NOT public.docs_es_admin(v_d.org_id) THEN RAISE EXCEPTION 'Sin permiso'; END IF;
  IF p_decision = 'aprobado' THEN
    UPDATE public.player_documents SET status='aprobado', reviewed_by=auth.uid(), reviewed_at=now(), rejection_reason=NULL WHERE id = p_document_id;
    INSERT INTO public.document_access_log(org_id, player_id, document_id, user_id, action) VALUES (v_d.org_id, v_d.player_id, v_d.id, auth.uid(), 'aprobo');
  ELSIF p_decision = 'rechazado' THEN
    IF nullif(trim(coalesce(p_motivo,'')),'') IS NULL THEN RAISE EXCEPTION 'El motivo es obligatorio'; END IF;
    UPDATE public.player_documents SET status='rechazado', reviewed_by=auth.uid(), reviewed_at=now(), rejection_reason=p_motivo WHERE id = p_document_id;
    INSERT INTO public.document_access_log(org_id, player_id, document_id, user_id, action) VALUES (v_d.org_id, v_d.player_id, v_d.id, auth.uid(), 'rechazo');
  ELSE RAISE EXCEPTION 'Decisión inválida'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.docs_eliminar(p_document_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_d record;
BEGIN
  SELECT * INTO v_d FROM public.player_documents WHERE id = p_document_id;
  IF v_d.id IS NULL OR NOT public.docs_es_admin(v_d.org_id) THEN RAISE EXCEPTION 'Sin permiso'; END IF;
  UPDATE public.player_documents SET is_current = false WHERE id = p_document_id;
  INSERT INTO public.document_access_log(org_id, player_id, document_id, user_id, action) VALUES (v_d.org_id, v_d.player_id, v_d.id, auth.uid(), 'elimino');
END $$;

-- Validates access, logs, returns storage path. Signing happens in the backend function.
CREATE OR REPLACE FUNCTION public.docs_url_firmada(p_document_id uuid, p_accion text DEFAULT 'vio', p_guardian_id uuid DEFAULT NULL) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_d record;
BEGIN
  IF p_accion NOT IN ('vio','descargo') THEN RAISE EXCEPTION 'Acción inválida'; END IF;
  SELECT * INTO v_d FROM public.player_documents WHERE id = p_document_id;
  IF v_d.id IS NULL THEN RAISE EXCEPTION 'Sin permiso'; END IF;
  IF p_guardian_id IS NOT NULL THEN
    IF NOT public.docs_es_servicio() OR NOT public.docs_tutor_de(p_guardian_id, v_d.player_id) THEN RAISE EXCEPTION 'Sin permiso'; END IF;
  ELSIF NOT public.docs_es_admin(v_d.org_id) THEN RAISE EXCEPTION 'Sin permiso'; END IF;
  INSERT INTO public.document_access_log(org_id, player_id, document_id, user_id, guardian_id, action)
  VALUES (v_d.org_id, v_d.player_id, v_d.id, auth.uid(), p_guardian_id, p_accion);
  RETURN v_d.storage_path;
END $$;

CREATE OR REPLACE FUNCTION public.docs_guardar_datos_base(p_player_id uuid, p_nombre text, p_fecha_nac date, p_curp text, p_guardian_id uuid DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_p record; v_curp text := upper(nullif(trim(coalesce(p_curp,'')),''));
BEGIN
  SELECT * INTO v_p FROM public.players WHERE id = p_player_id;
  IF v_p.id IS NULL THEN RAISE EXCEPTION 'Jugador no encontrado'; END IF;
  IF v_curp IS NOT NULL AND v_curp !~ '^[A-Z][AEIOUX][A-Z]{2}[0-9]{6}[HM][A-Z]{5}[A-Z0-9][0-9]$' THEN RAISE EXCEPTION 'CURP inválida'; END IF;
  IF p_guardian_id IS NOT NULL THEN
    IF NOT public.docs_es_servicio() OR NOT public.docs_tutor_de(p_guardian_id, p_player_id) THEN RAISE EXCEPTION 'Sin permiso'; END IF;
    UPDATE public.players SET
      full_name = CASE WHEN nullif(trim(coalesce(full_name,'')),'') IS NULL AND nullif(trim(coalesce(p_nombre,'')),'') IS NOT NULL THEN trim(p_nombre) ELSE full_name END,
      date_of_birth = coalesce(date_of_birth, p_fecha_nac),
      curp = CASE WHEN nullif(trim(coalesce(curp,'')),'') IS NULL THEN v_curp ELSE curp END
    WHERE id = p_player_id;
  ELSIF public.docs_es_admin(v_p.organization_id) THEN
    UPDATE public.players SET
      full_name = coalesce(nullif(trim(coalesce(p_nombre,'')),''), full_name),
      date_of_birth = p_fecha_nac, curp = v_curp
    WHERE id = p_player_id;
  ELSE RAISE EXCEPTION 'Sin permiso'; END IF;
END $$;

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
  WHERE p.organization_id = public.get_current_org_id() AND auth.uid() IS NOT NULL AND public.user_belongs_to_org(p.organization_id)
$$;

CREATE OR REPLACE FUNCTION public.docs_set_temporada(p_temporada text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.docs_es_admin(public.get_current_org_id()) THEN RAISE EXCEPTION 'Sin permiso'; END IF;
  IF p_temporada !~ '^[0-9]{4}-[0-9]{4}$' THEN RAISE EXCEPTION 'Formato: 2026-2027'; END IF;
  UPDATE public.organizations SET temporada_actual = p_temporada WHERE id = public.get_current_org_id();
END $$;

REVOKE ALL ON FUNCTION public.docs_estado_jugador(uuid,uuid), public.docs_subir(uuid,text,text,text,text,uuid), public.docs_revisar(uuid,text,text),
  public.docs_eliminar(uuid), public.docs_url_firmada(uuid,text,uuid), public.docs_guardar_datos_base(uuid,text,date,text,uuid),
  public.docs_completitud_org(), public.docs_set_temporada(text), public.docs_constancia_vigencia(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.docs_estado_jugador(uuid,uuid), public.docs_subir(uuid,text,text,text,text,uuid), public.docs_revisar(uuid,text,text),
  public.docs_eliminar(uuid), public.docs_url_firmada(uuid,text,uuid), public.docs_guardar_datos_base(uuid,text,date,text,uuid),
  public.docs_completitud_org(), public.docs_set_temporada(text), public.docs_constancia_vigencia(uuid) TO authenticated, service_role;

UPDATE public.organizations SET features = coalesce(features,'{}'::jsonb) || '{"documentos": true}'::jsonb WHERE id = '982f355c-0196-46d3-8da9-3e5e83813dad';