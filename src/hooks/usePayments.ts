import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Payment, CreatePaymentData, PaymentMethod } from '@/types/categories';

interface PaymentsFilters {
  playerId?: string;
  month?: string; // YYYY-MM format
  search?: string;
}

interface PaymentStats {
  totalMonth: number;
  paymentCount: number;
  pendingCount: number;
}

export function usePayments(filters?: PaymentsFilters) {
  const { organization, user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats>({ totalMonth: 0, paymentCount: 0, pendingCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    if (!organization) return;

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('payments')
        .select(`
          *,
          player:players(id, full_name, category:categories(name))
        `)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (filters?.playerId) {
        query = query.eq('player_id', filters.playerId);
      }

      if (filters?.month) {
        const startDate = `${filters.month}-01`;
        const endDate = new Date(parseInt(filters.month.split('-')[0]), parseInt(filters.month.split('-')[1]), 0)
          .toISOString().split('T')[0];
        query = query.gte('payment_month', startDate).lte('payment_month', endDate);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('Error fetching payments:', fetchError);
        setError('Error al cargar pagos');
        return;
      }

      setPayments((data || []) as Payment[]);
    } catch (err) {
      console.error('Error:', err);
      setError('Error inesperado');
    } finally {
      setIsLoading(false);
    }
  }, [organization, filters?.playerId, filters?.month]);

  const fetchStats = useCallback(async () => {
    if (!organization) return;

    try {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

      // Get payments for current month
      const { data: monthPayments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount')
        .eq('organization_id', organization.id)
        .gte('payment_month', currentMonth);

      if (paymentsError) throw paymentsError;

      const totalMonth = (monthPayments || []).reduce((sum, p) => sum + Number(p.amount), 0);
      const paymentCount = monthPayments?.length || 0;

      // Get pending players count
      const { count: pendingCount, error: pendingError } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .neq('payment_status', 'al_dia');

      if (pendingError) throw pendingError;

      setStats({
        totalMonth,
        paymentCount,
        pendingCount: pendingCount || 0,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, [organization]);

  useEffect(() => {
    fetchPayments();
    fetchStats();
  }, [fetchPayments, fetchStats]);

  const sendPaymentReceipt = async (paymentId: string): Promise<{ sent: boolean; reason?: string }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { sent: false, reason: 'no_session' };
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-payment-receipt`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ paymentId }),
        }
      );

      const result = await response.json();
      
      if (result.sent) {
        console.log('Recibo enviado exitosamente:', result.folio);
        return { sent: true };
      } else {
        console.log('Recibo no enviado:', result.reason || result.message);
        return { sent: false, reason: result.reason || result.message };
      }
    } catch (error) {
      console.error('Error al enviar recibo:', error);
      return { sent: false, reason: 'network_error' };
    }
  };

  const createPayment = async (data: CreatePaymentData, evidenceFile?: File): Promise<boolean> => {
    if (!organization || !user) return false;

    try {
      let evidenceUrl: string | null = null;

      // Upload evidence if provided
      if (evidenceFile) {
        const fileExt = evidenceFile.name.split('.').pop();
        const fileName = `${organization.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('payment-evidence')
          .upload(fileName, evidenceFile);

        if (uploadError) {
          console.error('Error uploading evidence:', uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from('payment-evidence')
            .getPublicUrl(fileName);
          evidenceUrl = urlData.publicUrl;
        }
      }

      const { data: newPayment, error } = await supabase.from('payments').insert({
        organization_id: organization.id,
        player_id: data.player_id,
        amount: data.amount,
        payment_method: data.payment_method,
        payment_month: data.payment_month,
        concept: data.concept || 'Mensualidad',
        notes: data.notes || null,
        evidence_url: evidenceUrl,
        recorded_by: user.id,
      }).select('id').single();

      if (error) {
        console.error('Error creating payment:', error);
        return false;
      }

      // Update player payment status to 'al_dia'
      await supabase
        .from('players')
        .update({ payment_status: 'al_dia' as const })
        .eq('id', data.player_id);

      // Send receipt automatically (best-effort, non-blocking)
      // Only for Enterprise orgs with players that have email
      sendPaymentReceipt(newPayment.id);

      await fetchPayments();
      await fetchStats();
      return true;
    } catch (err) {
      console.error('Error:', err);
      return false;
    }
  };

  const getPlayerPayments = async (playerId: string): Promise<Payment[]> => {
    if (!organization) return [];

    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('player_id', playerId)
        .order('payment_month', { ascending: false });

      if (error) {
        console.error('Error fetching player payments:', error);
        return [];
      }

      return (data || []) as Payment[];
    } catch (err) {
      console.error('Error:', err);
      return [];
    }
  };

  const getPlayerAccountStatement = async (playerId: string) => {
    if (!organization) return null;

    try {
      // Get player info
      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('*, category:categories(name)')
        .eq('id', playerId)
        .eq('organization_id', organization.id)
        .maybeSingle();

      if (playerError || !player) return null;

      // Get all payments for player
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('player_id', playerId)
        .eq('organization_id', organization.id)
        .order('payment_month', { ascending: false });

      if (paymentsError) return null;

      const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
      const paymentCount = payments?.length || 0;

      return {
        player: player as Payment['player'] & { monthly_fee: number | null; payment_status: string },
        payments: (payments || []) as Payment[],
        totalPaid,
        paymentCount,
      };
    } catch (err) {
      console.error('Error:', err);
      return null;
    }
  };

  return {
    payments,
    stats,
    isLoading,
    error,
    refetch: fetchPayments,
    createPayment,
    getPlayerPayments,
    getPlayerAccountStatement,
  };
}
