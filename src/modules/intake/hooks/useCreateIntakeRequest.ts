// STRYK Create Intake Request Hook
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { normalizePhone, normalizeName, calculateAge } from '../lib/intake-utils';
import type { OrgIntakeSettings } from '../types/intake.types';
import type { IntakeFormValues } from '../lib/intake-validations';

interface CreateIntakeParams {
  organizationId: string;
  profileId: string;
  formData: IntakeFormValues;
  settings: OrgIntakeSettings;
}

export function useCreateIntakeRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ organizationId, profileId, formData, settings }: CreateIntakeParams) => {
      // Normalizar datos
      const phoneNormalized = normalizePhone(formData.guardian_phone);
      const nameNormalized = normalizeName(formData.player_name);
      
      // Calcular montos
      const registrationFee = settings.default_registration_fee;
      const monthlyFee = formData.promo_applied 
        ? settings.promo_fee 
        : settings.default_monthly_fee;
      const totalAmount = registrationFee + monthlyFee;

      // Calcular edad (snapshot)
      const playerAge = calculateAge(formData.player_birth_date);

      // Generate idempotency key using PostgreSQL function
      const birthDateStr = formData.player_birth_date.toISOString().split('T')[0];
      
      const { data: idempotencyData, error: idempotencyError } = await supabase
        .rpc('generate_intake_idempotency_key', {
          p_org_id: organizationId,
          p_phone_normalized: phoneNormalized,
          p_birth_date: birthDateStr,
          p_name_normalized: nameNormalized,
        });

      if (idempotencyError) {
        console.error('Error generating idempotency key:', idempotencyError);
        throw new Error('Error al generar clave de idempotencia');
      }

      // Insertar intake_request
      const { data, error } = await supabase
        .from('intake_requests')
        .insert({
          organization_id: organizationId,
          idempotency_key: idempotencyData,
          
          // Player data
          player_name: formData.player_name.trim(),
          player_name_normalized: nameNormalized,
          player_birth_date: birthDateStr,
          player_age: playerAge,
          
          // Guardian data
          guardian_name: formData.guardian_name.trim(),
          guardian_email: formData.guardian_email || null,
          guardian_phone: formData.guardian_phone,
          guardian_phone_normalized: phoneNormalized,
          guardian_occupation: formData.guardian_occupation || null,
          
          // Assignment
          sport_id: formData.sport_id || null,
          category_id: formData.category_id || null,
          venue_id: formData.venue_id || null,
          plan_id: formData.plan_id || null,
          
          // Payment
          registration_fee: registrationFee,
          monthly_fee: monthlyFee,
          total_amount: totalAmount,
          payment_method: formData.payment_method,
          promo_applied: formData.promo_applied,
          promo_code: formData.promo_code || null,
          
          // Status
          status: 'pending',
          receipt_status: formData.guardian_email ? 'pending' : 'no_email',
          
          // Tracking
          created_by: profileId,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Este jugador ya fue registrado con estos datos');
        }
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intake_requests'] });
    },
  });
}
