ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS feature_profile text NOT NULL DEFAULT 'basic',
  ADD COLUMN IF NOT EXISTS features jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.organizations SET feature_profile = 'full';

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_feature_profile_check
  CHECK (feature_profile IN ('basic','full'));