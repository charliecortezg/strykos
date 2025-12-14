-- Create payment_method enum
CREATE TYPE public.payment_method AS ENUM ('efectivo', 'transferencia', 'tarjeta', 'otro');

-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  player_id UUID NOT NULL REFERENCES public.players(id),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  payment_method public.payment_method NOT NULL DEFAULT 'efectivo',
  payment_month DATE NOT NULL, -- First day of the month for the payment
  concept TEXT NOT NULL DEFAULT 'Mensualidad',
  notes TEXT,
  evidence_url TEXT,
  recorded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_payments_organization ON public.payments(organization_id);
CREATE INDEX idx_payments_player ON public.payments(player_id);
CREATE INDEX idx_payments_month ON public.payments(payment_month);
CREATE INDEX idx_payments_created ON public.payments(created_at DESC);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payments
-- Only Director Deportivo and Administrativo can manage payments
CREATE POLICY "Director and admin can view payments"
ON public.payments
FOR SELECT
USING (
  organization_id = get_current_org_id()
  AND (
    has_org_role('org_owner')
    OR has_org_role('director_deportivo')
    OR has_org_role('administrativo')
  )
);

CREATE POLICY "Director and admin can insert payments"
ON public.payments
FOR INSERT
WITH CHECK (
  organization_id = get_current_org_id()
  AND (
    has_org_role('org_owner')
    OR has_org_role('director_deportivo')
    OR has_org_role('administrativo')
  )
);

CREATE POLICY "Director and admin can update payments"
ON public.payments
FOR UPDATE
USING (
  organization_id = get_current_org_id()
  AND (
    has_org_role('org_owner')
    OR has_org_role('director_deportivo')
    OR has_org_role('administrativo')
  )
)
WITH CHECK (
  organization_id = get_current_org_id()
  AND (
    has_org_role('org_owner')
    OR has_org_role('director_deportivo')
    OR has_org_role('administrativo')
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for payment evidence
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-evidence', 'payment-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for payment evidence
CREATE POLICY "Org members can view payment evidence"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'payment-evidence'
  AND (storage.foldername(name))[1] = (SELECT id::text FROM public.organizations WHERE id = get_current_org_id())
);

CREATE POLICY "Director and admin can upload payment evidence"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'payment-evidence'
  AND (storage.foldername(name))[1] = (SELECT id::text FROM public.organizations WHERE id = get_current_org_id())
  AND (
    has_org_role('org_owner')
    OR has_org_role('director_deportivo')
    OR has_org_role('administrativo')
  )
);

CREATE POLICY "Director and admin can update payment evidence"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'payment-evidence'
  AND (storage.foldername(name))[1] = (SELECT id::text FROM public.organizations WHERE id = get_current_org_id())
  AND (
    has_org_role('org_owner')
    OR has_org_role('director_deportivo')
    OR has_org_role('administrativo')
  )
);

CREATE POLICY "Director and admin can delete payment evidence"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'payment-evidence'
  AND (storage.foldername(name))[1] = (SELECT id::text FROM public.organizations WHERE id = get_current_org_id())
  AND (
    has_org_role('org_owner')
    OR has_org_role('director_deportivo')
    OR has_org_role('administrativo')
  )
);