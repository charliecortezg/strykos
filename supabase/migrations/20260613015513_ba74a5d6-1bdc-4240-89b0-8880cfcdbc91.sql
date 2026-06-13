DELETE FROM public.user_org_roles
WHERE user_id = '75be2426-55af-4537-8a7c-0fbd70febe6d'
  AND organization_id = '982f355c-0196-46d3-8da9-3e5e83813dad';

UPDATE public.profiles
SET is_active = false, updated_at = now()
WHERE id = '75be2426-55af-4537-8a7c-0fbd70febe6d';