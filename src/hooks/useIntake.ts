import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ============================================
// TIPOS
// ============================================
export interface IntakeSettings {
  id: string;
  organization_id: string;
  enabled: boolean;
  default_registration_fee: number;
  default_monthly_fee: number;
  soccer_fee: number;
  basketball_fee: number;
  promo_active: boolean;
  promo_fee: number;
  transfer_qr_url: string | null;
  transfer_bank_info: string | null;
  require_evidence: boolean;
  require_guardian_email: boolean;
}

export interface IntakeRequest {
  id: string;
  organization_id: string;
  created_by: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  player_name: string;
  player_name_normalized: string;
  player_birth_date: string;
  player_age: number | null;
  guardian_name: string;
  guardian_phone: string;
  guardian_phone_normalized: string;
  guardian_email: string | null;
  guardian_occupation: string | null;
  sport_id: string | null;
  category_id: string | null;
  venue_id: string | null;
  plan_id: string | null;
  payment_method: string;
  registration_fee: number;
  monthly_fee: number;
  total_amount: number;
  promo_applied: boolean;
  promo_code: string | null;
  receipt_status: string | null;
  receipt_sent_at: string | null;
  receipt_error: string | null;
  processing_error: string | null;
  player_id: string | null;
  guardian_id: string | null;
  payment_id: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  sports?: { id: string; name: string } | null;
  categories?: { id: string; name: string } | null;
  profiles?: { id: string; full_name: string } | null;
}

export interface CreateIntakeData {
  playerName: string;
  playerBirthDate: string;
  playerAge: number;
  guardianName: string;
  guardianPhone: string;
  guardianEmail?: string;
  guardianOccupation?: string;
  sportId: string;
  categoryId?: string;
  venueId?: string;
  planId?: string;
  paymentMethod: 'efectivo' | 'transferencia' | 'tarjeta' | 'otro';
  registrationFee: number;
  monthlyFee: number;
  totalAmount: number;
  promoApplied: boolean;
  evidenceFile?: File;
}

// ============================================
// UTILIDADES
// ============================================
function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  return digits.slice(-10);
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function generateIdempotencyKey(orgId: string, phoneNormalized: string, birthDate: string, nameNormalized: string): string {
  const data = `${orgId}|${phoneNormalized}|${birthDate}|${nameNormalized}`;
  // Simple hash for client-side, server will validate
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

// ============================================
// HOOK: useIntakeSettings
// ============================================
export function useIntakeSettings() {
  const { organization } = useAuth();

  const { data: settings, isLoading, error, refetch } = useQuery({
    queryKey: ['intake-settings', organization?.id],
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
        } as IntakeSettings;
      }

      return data as IntakeSettings;
    },
    enabled: !!organization?.id,
  });

  return { settings, isLoading, error, refetch };
}

// ============================================
// HOOK: useIntakeRequests (Historial)
// ============================================
export function useIntakeRequests(filters?: {
  status?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
  paymentMethod?: string;
}) {
  const { organization, user } = useAuth();

  const { data: requests = [], isLoading, error, refetch } = useQuery({
    queryKey: ['intake-requests', organization?.id, filters],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from('intake_requests')
        .select(`
          *,
          sports(id, name),
          categories(id, name)
        `)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        query = query.or(`player_name.ilike.${searchTerm},guardian_name.ilike.${searchTerm},guardian_phone.ilike.${searchTerm}`);
      }

      if (filters?.fromDate) {
        query = query.gte('created_at', filters.fromDate);
      }

      if (filters?.toDate) {
        query = query.lte('created_at', filters.toDate + 'T23:59:59');
      }

      if (filters?.paymentMethod && filters.paymentMethod !== 'all') {
        query = query.eq('payment_method', filters.paymentMethod);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as unknown as IntakeRequest[];
    },
    enabled: !!organization?.id,
  });

  return { requests, isLoading, error, refetch };
}

// ============================================
// HOOK: useCreateIntake
// ============================================
export function useCreateIntake() {
  const { organization, user } = useAuth();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (data: CreateIntakeData) => {
      if (!organization?.id || !user?.id) {
        throw new Error('No hay sesión activa');
      }

      const phoneNormalized = normalizePhone(data.guardianPhone);
      const nameNormalized = normalizeName(data.playerName);
      const idempotencyKey = generateIdempotencyKey(
        organization.id,
        phoneNormalized,
        data.playerBirthDate,
        nameNormalized
      );

      // 1. Create intake request
      const { data: intakeRequest, error: insertError } = await supabase
        .from('intake_requests')
        .insert({
          organization_id: organization.id,
          created_by: user.id,
          status: 'pending',
          player_name: data.playerName.trim(),
          player_name_normalized: nameNormalized,
          player_birth_date: data.playerBirthDate,
          player_age: data.playerAge,
          guardian_name: data.guardianName.trim(),
          guardian_phone: data.guardianPhone,
          guardian_phone_normalized: phoneNormalized,
          guardian_email: data.guardianEmail?.trim() || null,
          guardian_occupation: data.guardianOccupation?.trim() || null,
          sport_id: data.sportId || null,
          category_id: data.categoryId || null,
          venue_id: data.venueId || null,
          plan_id: data.planId || null,
          payment_method: data.paymentMethod,
          registration_fee: data.registrationFee,
          monthly_fee: data.monthlyFee,
          total_amount: data.totalAmount,
          promo_applied: data.promoApplied,
          idempotency_key: idempotencyKey,
        })
        .select()
        .single();

      if (insertError) {
        // Check for duplicate
        if (insertError.code === '23505') {
          throw new Error('Este jugador ya fue registrado previamente con los mismos datos.');
        }
        throw insertError;
      }

      // 2. Upload evidence if provided
      if (data.evidenceFile) {
        setIsUploading(true);
        try {
          const fileExt = data.evidenceFile.name.split('.').pop();
          const fileName = `${Date.now()}.${fileExt}`;
          const storagePath = `${organization.id}/intake/${intakeRequest.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('intake-documents')
            .upload(storagePath, data.evidenceFile, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            console.error('Error uploading evidence:', uploadError);
            // Don't fail the whole process, just log
          } else {
            // Create intake_documents record
            await supabase.from('intake_documents').insert({
              intake_request_id: intakeRequest.id,
              organization_id: organization.id,
              object_path: storagePath,
              file_name: data.evidenceFile.name,
              file_size: data.evidenceFile.size,
              mime_type: data.evidenceFile.type,
              document_type: 'payment_evidence',
              uploaded_by: user.id,
            });
          }
        } finally {
          setIsUploading(false);
        }
      }

      // 3. Process intake (create player + payment)
      const { data: processResult, error: processError } = await supabase
        .rpc('process_intake_and_create_entities', { p_intake_id: intakeRequest.id });

      if (processError) {
        throw new Error(`Error al procesar: ${processError.message}`);
      }

      const result = processResult as { success: boolean; error?: string; player_id?: string };
      
      if (!result.success) {
        throw new Error(result.error || 'Error desconocido al procesar fichaje');
      }

      // 4. Send receipt (non-blocking)
      try {
        supabase.functions.invoke('send-intake-receipt', {
          body: { intakeId: intakeRequest.id },
        }).catch(err => {
          console.warn('Receipt send failed (non-blocking):', err);
        });
      } catch {
        // Ignore receipt errors
      }

      return {
        intakeId: intakeRequest.id,
        playerId: result.player_id,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intake-requests'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });

  return {
    createIntake: createMutation.mutateAsync,
    isCreating: createMutation.isPending || isUploading,
    error: createMutation.error,
  };
}

// ============================================
// HOOK: useRetryReceipt
// ============================================
export function useRetryReceipt() {
  const queryClient = useQueryClient();

  const retryMutation = useMutation({
    mutationFn: async (intakeId: string) => {
      const { data, error } = await supabase.functions.invoke('send-intake-receipt', {
        body: { intakeId },
      });

      if (error) throw error;
      
      const result = data as { ok: boolean; status: string; message: string };
      if (!result.ok) {
        throw new Error(result.message || 'Error al enviar recibo');
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intake-requests'] });
      toast.success('Recibo enviado correctamente');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  return {
    retryReceipt: retryMutation.mutateAsync,
    isRetrying: retryMutation.isPending,
  };
}

// ============================================
// HOOK: useIntakeEvidence
// ============================================
export function useIntakeEvidence(intakeId: string) {
  const { organization } = useAuth();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['intake-documents', intakeId],
    queryFn: async () => {
      if (!intakeId) return [];

      const { data, error } = await supabase
        .from('intake_documents')
        .select('*')
        .eq('intake_request_id', intakeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!intakeId,
  });

  const getSignedUrl = async (objectPath: string) => {
    const { data, error } = await supabase.storage
      .from('intake-documents')
      .createSignedUrl(objectPath, 3600); // 1 hour

    if (error) throw error;
    return data.signedUrl;
  };

  return { documents, isLoading, getSignedUrl };
}

// ============================================
// UTILIDADES EXPORTADAS
// ============================================
export function calculateIntakeFees(
  sportName: string,
  isPitchSigning: boolean,
  settings: IntakeSettings
): { registrationFee: number; monthlyFee: number; promoApplied: boolean } {
  const registrationFee = settings.default_registration_fee || 500;

  // Basketball: fixed fee, no promo
  if (sportName.toLowerCase().includes('basket') || sportName.toLowerCase().includes('básquet')) {
    return {
      registrationFee,
      monthlyFee: settings.basketball_fee || 400,
      promoApplied: false,
    };
  }

  // Soccer: check promo
  if (isPitchSigning && settings.promo_active) {
    return {
      registrationFee,
      monthlyFee: settings.promo_fee || 400,
      promoApplied: true,
    };
  }

  return {
    registrationFee,
    monthlyFee: settings.soccer_fee || 450,
    promoApplied: false,
  };
}
