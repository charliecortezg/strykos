-- =============================================
-- STRYK: ESQUEMA MULTI-TENANT COMPLETO
-- =============================================

-- 1. ENUMS
-- Roles por organización
CREATE TYPE public.org_role AS ENUM (
  'org_owner',
  'director_deportivo',
  'entrenador',
  'administrativo'
);

-- Rol de plataforma (reservado para futuro)
CREATE TYPE public.platform_role AS ENUM (
  'platform_super_admin'
);

-- Tipos de organización
CREATE TYPE public.organization_type AS ENUM (
  'profesional',
  'recreativa',
  'escolar',
  'gubernamental',
  'universitaria',
  'comunitaria',
  'privada',
  'federativa',
  'club_social',
  'otro'
);

-- Planes de suscripción
CREATE TYPE public.subscription_plan AS ENUM (
  'freemium',
  'starter',
  'professional',
  'enterprise'
);

-- =============================================
-- 2. TABLA ORGANIZATIONS
-- =============================================
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  org_code TEXT UNIQUE NOT NULL,
  org_access_key TEXT NOT NULL,
  organization_type public.organization_type NOT NULL,
  approximate_students INTEGER NOT NULL,
  primary_sport TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  phone TEXT NOT NULL,
  plan public.subscription_plan DEFAULT 'freemium',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- 3. TABLA SPORTS (MULTI-TENANT)
-- =============================================
CREATE TABLE public.sports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(organization_id, name)
);

-- Insertar deportes del sistema
INSERT INTO public.sports (name, is_system, organization_id) VALUES
  ('Fútbol', true, NULL),
  ('Basketball', true, NULL),
  ('Baseball', true, NULL),
  ('Volleyball', true, NULL),
  ('Flag Football', true, NULL),
  ('Fútbol Americano', true, NULL),
  ('Artes Marciales', true, NULL);

-- =============================================
-- 4. TABLA PROFILES
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  must_change_password BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- 5. TABLA USER_ORG_ROLES
-- =============================================
CREATE TABLE public.user_org_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  role public.org_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, organization_id, role)
);

-- =============================================
-- 6. FUNCIONES DE SEGURIDAD (SECURITY DEFINER)
-- =============================================

-- Obtener organization_id del usuario actual
CREATE OR REPLACE FUNCTION public.get_current_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Verificar si el usuario tiene un rol específico en su organización
CREATE OR REPLACE FUNCTION public.has_org_role(_role public.org_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_org_roles
    WHERE user_id = auth.uid()
      AND organization_id = public.get_current_org_id()
      AND role = _role
  )
$$;

-- Verificar si el usuario tiene algún rol en una organización
CREATE OR REPLACE FUNCTION public.user_belongs_to_org(_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND organization_id = _org_id
  )
$$;

-- Generar org_code desde el nombre
CREATE OR REPLACE FUNCTION public.generate_org_code(org_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  base_code TEXT;
  final_code TEXT;
  counter INTEGER := 0;
BEGIN
  -- Limpiar y formatear el nombre
  base_code := lower(regexp_replace(org_name, '[^a-zA-Z0-9]', '-', 'g'));
  base_code := regexp_replace(base_code, '-+', '-', 'g');
  base_code := trim(both '-' from base_code);
  base_code := substring(base_code, 1, 30);
  
  final_code := base_code;
  
  -- Verificar unicidad y agregar sufijo si es necesario
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE org_code = final_code) LOOP
    counter := counter + 1;
    final_code := base_code || '-' || counter;
  END LOOP;
  
  RETURN final_code;
END;
$$;

-- Generar access key aleatorio
CREATE OR REPLACE FUNCTION public.generate_access_key()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  -- Formato: XXX-XXX
  FOR i IN 1..3 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  result := result || '-';
  FOR i IN 1..3 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Función para validar acceso a organización (usada en login)
CREATE OR REPLACE FUNCTION public.validate_org_access(
  _org_code TEXT,
  _org_access_key TEXT,
  _user_email TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_record RECORD;
  profile_record RECORD;
  role_record RECORD;
BEGIN
  -- Buscar organización
  SELECT * INTO org_record 
  FROM public.organizations 
  WHERE org_code = _org_code 
    AND org_access_key = _org_access_key 
    AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'error', 'organization_not_found');
  END IF;
  
  -- Buscar perfil del usuario en esa organización
  SELECT p.*, u.id as auth_id INTO profile_record
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.organization_id = org_record.id
    AND lower(u.email) = lower(_user_email)
    AND p.is_active = true;
  
  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'error', 'user_not_in_org');
  END IF;
  
  -- Obtener rol
  SELECT role INTO role_record
  FROM public.user_org_roles
  WHERE user_id = profile_record.id
    AND organization_id = org_record.id
  LIMIT 1;
  
  RETURN json_build_object(
    'valid', true,
    'organization_id', org_record.id,
    'organization_name', org_record.name,
    'user_id', profile_record.id,
    'role', role_record.role,
    'must_change_password', profile_record.must_change_password
  );
END;
$$;

-- =============================================
-- 7. TRIGGER PARA UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 8. HABILITAR RLS
-- =============================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_org_roles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 9. POLÍTICAS RLS
-- =============================================

-- ORGANIZATIONS: Solo miembros pueden ver su organización
CREATE POLICY "Users can view their own organization"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (id = public.get_current_org_id());

-- PROFILES: Solo ver perfiles de la misma organización
CREATE POLICY "Users can view profiles in their organization"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (organization_id = public.get_current_org_id());

-- PROFILES: Solo org_owner puede insertar perfiles
CREATE POLICY "Org owners can insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.get_current_org_id() 
    AND public.has_org_role('org_owner')
  );

-- PROFILES: Usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- SPORTS: Ver deportes del sistema o de la organización
CREATE POLICY "Users can view system and org sports"
  ON public.sports FOR SELECT
  TO authenticated
  USING (
    is_system = true 
    OR organization_id = public.get_current_org_id()
    OR organization_id IS NULL
  );

-- SPORTS: Org owner puede crear deportes personalizados
CREATE POLICY "Org owners can insert custom sports"
  ON public.sports FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.get_current_org_id()
    AND public.has_org_role('org_owner')
  );

-- USER_ORG_ROLES: Ver roles de la organización
CREATE POLICY "Users can view roles in their organization"
  ON public.user_org_roles FOR SELECT
  TO authenticated
  USING (organization_id = public.get_current_org_id());

-- USER_ORG_ROLES: Solo org_owner puede asignar roles
CREATE POLICY "Org owners can insert roles"
  ON public.user_org_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.get_current_org_id()
    AND public.has_org_role('org_owner')
  );

-- =============================================
-- 10. POLÍTICAS PARA REGISTRO INICIAL (ANON)
-- =============================================

-- Permitir lectura de deportes del sistema sin autenticación
CREATE POLICY "Anyone can view system sports"
  ON public.sports FOR SELECT
  TO anon
  USING (is_system = true OR organization_id IS NULL);