UPDATE public.players
SET payment_status = 'al_dia'::payment_status,
    billing_status = 'paid_current',
    updated_at = now()
WHERE organization_id = '982f355c-0196-46d3-8da9-3e5e83813dad'
  AND is_active = true
  AND COALESCE(is_scholarship, false) = false;