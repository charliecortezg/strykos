-- Add onboarding_completed field to organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Update existing organizations to mark them as completed (they already have data)
UPDATE public.organizations 
SET onboarding_completed = true 
WHERE id IN (
  SELECT DISTINCT organization_id FROM public.categories WHERE is_active = true
);