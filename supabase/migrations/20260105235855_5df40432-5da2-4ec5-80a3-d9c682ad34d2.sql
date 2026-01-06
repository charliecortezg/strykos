-- Tabla de auditoría para acciones de Platform Admin
CREATE TABLE public.platform_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  action text NOT NULL,
  target_organization_id uuid REFERENCES public.organizations(id),
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Índices para búsquedas eficientes
CREATE INDEX idx_platform_audit_log_admin ON public.platform_audit_log(admin_user_id);
CREATE INDEX idx_platform_audit_log_org ON public.platform_audit_log(target_organization_id);
CREATE INDEX idx_platform_audit_log_created ON public.platform_audit_log(created_at DESC);

-- RLS
ALTER TABLE public.platform_audit_log ENABLE ROW LEVEL SECURITY;

-- Solo platform admins pueden ver el audit log
CREATE POLICY "Platform admins can view audit log"
ON public.platform_audit_log
FOR SELECT
USING (is_platform_admin());

-- Solo platform admins pueden insertar (vía Edge Function con service role)
CREATE POLICY "Platform admins can insert audit log"
ON public.platform_audit_log
FOR INSERT
WITH CHECK (is_platform_admin());