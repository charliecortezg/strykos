-- Agregar campo is_guest a match_players para jugadores prestados
ALTER TABLE public.match_players 
ADD COLUMN IF NOT EXISTS is_guest boolean DEFAULT false;

-- Crear tabla para media/evidencias de partidos
CREATE TABLE IF NOT EXISTS public.match_media (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  mime_type text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Indices para match_media
CREATE INDEX IF NOT EXISTS idx_match_media_match_id ON public.match_media(match_id);
CREATE INDEX IF NOT EXISTS idx_match_media_org_id ON public.match_media(organization_id);

-- Habilitar RLS
ALTER TABLE public.match_media ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para match_media
CREATE POLICY "Users can view match media in their organization"
ON public.match_media FOR SELECT
USING (
  organization_id = get_current_org_id() AND (
    has_org_role('org_owner'::org_role) OR 
    has_org_role('director_deportivo'::org_role) OR 
    has_org_role('administrativo'::org_role) OR 
    has_org_role('entrenador'::org_role)
  )
);

CREATE POLICY "Trainers and directors can insert match media"
ON public.match_media FOR INSERT
WITH CHECK (
  organization_id = get_current_org_id() AND (
    has_org_role('org_owner'::org_role) OR 
    has_org_role('director_deportivo'::org_role) OR 
    has_org_role('entrenador'::org_role)
  )
);

CREATE POLICY "Directors and owners can delete match media"
ON public.match_media FOR DELETE
USING (
  organization_id = get_current_org_id() AND (
    has_org_role('org_owner'::org_role) OR 
    has_org_role('director_deportivo'::org_role)
  )
);

-- Crear bucket para evidencias de partidos (si no existe ya el storage general)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'match-evidence', 
  'match-evidence', 
  false, 
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para el bucket
CREATE POLICY "Users can view match evidence in their org"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'match-evidence' AND 
  auth.uid() IS NOT NULL
);

CREATE POLICY "Trainers can upload match evidence"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'match-evidence' AND 
  auth.uid() IS NOT NULL
);

CREATE POLICY "Directors can delete match evidence"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'match-evidence' AND 
  auth.uid() IS NOT NULL
);