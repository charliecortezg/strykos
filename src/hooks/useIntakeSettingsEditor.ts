import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { IntakeSettings } from './useIntake';

export interface IntakeSettingsEditorState {
  settings: IntakeSettings | null;
  isLoading: boolean;
  isSaving: boolean;
  canEdit: boolean;
  saveSettings: (updates: Partial<IntakeSettings>) => Promise<void>;
  error: Error | null;
}

const DEFAULT_SETTINGS: Omit<IntakeSettings, 'id' | 'organization_id'> = {
  enabled: true,
  default_registration_fee: 500,
  default_monthly_fee: 450,
  soccer_fee: 450,
  basketball_fee: 400,
  promo_active: false,
  promo_fee: 400,
  transfer_qr_url: null,
  transfer_bank_info: null,
  require_evidence: true,
  require_guardian_email: false,
};

export function useIntakeSettingsEditor(): IntakeSettingsEditorState {
  const { organization, roles } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<Error | null>(null);

  // Check if user can edit (org_owner or director_deportivo)
  const canEdit = roles.includes('org_owner') || roles.includes('director_deportivo');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['intake-settings-editor', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return null;

      const { data, error } = await supabase
        .from('org_intake_settings')
        .select('*')
        .eq('organization_id', organization.id)
        .maybeSingle();

      if (error) throw error;

      // Return defaults if no settings exist
      if (!data) {
        return {
          id: '',
          organization_id: organization.id,
          ...DEFAULT_SETTINGS,
        } as IntakeSettings;
      }

      return {
        id: data.id,
        organization_id: data.organization_id,
        enabled: data.enabled ?? DEFAULT_SETTINGS.enabled,
        default_registration_fee: data.default_registration_fee ?? DEFAULT_SETTINGS.default_registration_fee,
        default_monthly_fee: data.default_monthly_fee ?? DEFAULT_SETTINGS.default_monthly_fee,
        soccer_fee: data.soccer_fee ?? DEFAULT_SETTINGS.soccer_fee,
        basketball_fee: data.basketball_fee ?? DEFAULT_SETTINGS.basketball_fee,
        promo_active: data.promo_active ?? DEFAULT_SETTINGS.promo_active,
        promo_fee: data.promo_fee ?? DEFAULT_SETTINGS.promo_fee,
        transfer_qr_url: data.transfer_qr_url ?? DEFAULT_SETTINGS.transfer_qr_url,
        transfer_bank_info: data.transfer_bank_info ?? DEFAULT_SETTINGS.transfer_bank_info,
        require_evidence: data.require_evidence ?? DEFAULT_SETTINGS.require_evidence,
        require_guardian_email: data.require_guardian_email ?? DEFAULT_SETTINGS.require_guardian_email,
      } as IntakeSettings;
    },
    enabled: !!organization?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async (updates: Partial<IntakeSettings>) => {
      if (!organization?.id) {
        throw new Error('No hay organización activa');
      }

      if (!canEdit) {
        throw new Error('No tienes permisos para editar la configuración');
      }

      // Prepare data for upsert (excluding id and organization_id from updates)
      const { id, organization_id, ...updateData } = updates as IntakeSettings;

      const { error } = await supabase
        .from('org_intake_settings')
        .upsert(
          {
            organization_id: organization.id,
            ...updateData,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'organization_id',
          }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intake-settings-editor'] });
      queryClient.invalidateQueries({ queryKey: ['intake-settings'] });
      toast.success('Configuración guardada correctamente');
    },
    onError: (err: Error) => {
      setError(err);
      toast.error(`Error: ${err.message}`);
    },
  });

  const saveSettings = async (updates: Partial<IntakeSettings>) => {
    await saveMutation.mutateAsync(updates);
  };

  return {
    settings: settings ?? null,
    isLoading,
    isSaving: saveMutation.isPending,
    canEdit,
    saveSettings,
    error,
  };
}
