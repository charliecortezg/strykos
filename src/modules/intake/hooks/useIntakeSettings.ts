// STRYK Intake Settings Hook
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { OrgIntakeSettings } from '../types/intake.types';

const DEFAULT_SETTINGS: Omit<OrgIntakeSettings, 'id' | 'organization_id'> = {
  enabled: true,
  require_evidence: true,
  require_guardian_email: false,
  allow_promo_codes: true,
  default_registration_fee: 400,
  default_monthly_fee: 450,
  promo_fee: 300,
  promo_active: true,
  welcome_message: null,
  receipt_footer_text: null,
  whatsapp_group_url: null,
  parents_guide_url: null,
};

export function useIntakeSettings(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['org_intake_settings', organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error('No organization ID');
      
      const { data, error } = await supabase
        .from('org_intake_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (error) throw error;
      
      // Return defaults if no settings configured
      if (!data) {
        return {
          ...DEFAULT_SETTINGS,
          id: '',
          organization_id: organizationId,
        } as OrgIntakeSettings;
      }

      return {
        id: data.id,
        organization_id: data.organization_id,
        enabled: data.enabled ?? DEFAULT_SETTINGS.enabled,
        require_evidence: data.require_evidence ?? DEFAULT_SETTINGS.require_evidence,
        require_guardian_email: data.require_guardian_email ?? DEFAULT_SETTINGS.require_guardian_email,
        allow_promo_codes: data.allow_promo_codes ?? DEFAULT_SETTINGS.allow_promo_codes,
        default_registration_fee: data.default_registration_fee ?? DEFAULT_SETTINGS.default_registration_fee,
        default_monthly_fee: data.default_monthly_fee ?? DEFAULT_SETTINGS.default_monthly_fee,
        promo_fee: data.promo_fee ?? DEFAULT_SETTINGS.promo_fee,
        promo_active: data.promo_active ?? DEFAULT_SETTINGS.promo_active,
        welcome_message: data.welcome_message,
        receipt_footer_text: data.receipt_footer_text,
        whatsapp_group_url: data.whatsapp_group_url,
        parents_guide_url: data.parents_guide_url,
      } as OrgIntakeSettings;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
