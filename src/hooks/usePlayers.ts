import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Player, CreatePlayerData, PaymentStatus } from '@/types/categories';
import { normalizeSearch } from '@/lib/utils';

interface PlayersFilters {
  categoryId?: string;
  paymentStatus?: PaymentStatus;
  isActive?: boolean;
  search?: string;
}

export function usePlayers(filters?: PlayersFilters) {
  const { organization } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlayers = useCallback(async () => {
    if (!organization) return;

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('players')
        .select(`
          *,
          category:categories(id, name),
          sport:sports(id, name),
          plan_data:plans(id, name, price)
        `)
        .eq('organization_id', organization.id)
        .order('full_name');

      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }

      if (filters?.paymentStatus) {
        query = query.eq('payment_status', filters.paymentStatus);
      }

      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('Error fetching players:', fetchError);
        setError(fetchError.message);
        return;
      }

      let result = (data || []) as Player[];

      // Client-side search filter (accent-tolerant)
      if (filters?.search) {
        const normalizedSearch = normalizeSearch(filters.search);
        result = result.filter(p => 
          normalizeSearch(p.full_name).includes(normalizedSearch) ||
          (p.tutor_name && normalizeSearch(p.tutor_name).includes(normalizedSearch))
        );
      }

      setPlayers(result);
    } catch (err) {
      console.error('Error:', err);
      setError('Error al cargar jugadores');
    } finally {
      setIsLoading(false);
    }
  }, [organization, filters?.categoryId, filters?.paymentStatus, filters?.isActive, filters?.search]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const createPlayer = async (data: CreatePlayerData): Promise<boolean> => {
    if (!organization) return false;

    try {
      const { error: insertError } = await supabase
        .from('players')
        .insert({
          organization_id: organization.id,
          full_name: data.full_name,
          email: data.email || null,
          category_id: data.category_id || null,
          sport_id: data.sport_id || null,
          plan_id: data.plan_id || null,
          phone: data.phone || null,
          tutor_name: data.tutor_name || null,
          position: data.position || null,
          plan: data.plan || null,
          monthly_fee: data.monthly_fee || null,
          is_scholarship: data.is_scholarship || false,
        });

      if (insertError) {
        console.error('Error creating player:', insertError);
        setError(insertError.message);
        return false;
      }

      await fetchPlayers();
      return true;
    } catch (err) {
      console.error('Error:', err);
      setError('Error al crear jugador');
      return false;
    }
  };

  const updatePlayer = async (id: string, data: Partial<CreatePlayerData & { payment_status?: PaymentStatus; sport_id?: string; plan_id?: string; is_active?: boolean }>): Promise<boolean> => {
    // Optimistic update - update local state immediately
    const previousPlayers = [...players];
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));

    try {
      const updateData: Record<string, unknown> = {};
      
      if (data.full_name !== undefined) updateData.full_name = data.full_name;
      if (data.email !== undefined) updateData.email = data.email || null;
      if (data.category_id !== undefined) updateData.category_id = data.category_id || null;
      if (data.sport_id !== undefined) updateData.sport_id = data.sport_id || null;
      if (data.plan_id !== undefined) updateData.plan_id = data.plan_id || null;
      if (data.phone !== undefined) updateData.phone = data.phone || null;
      if (data.tutor_name !== undefined) updateData.tutor_name = data.tutor_name || null;
      if (data.position !== undefined) updateData.position = data.position || null;
      if (data.plan !== undefined) updateData.plan = data.plan || null;
      if (data.monthly_fee !== undefined) updateData.monthly_fee = data.monthly_fee || null;
      if (data.is_scholarship !== undefined) updateData.is_scholarship = data.is_scholarship;
      if (data.date_of_birth !== undefined) updateData.date_of_birth = data.date_of_birth || null;
      if (data.payment_status !== undefined) updateData.payment_status = data.payment_status;
      if (data.is_active !== undefined) updateData.is_active = data.is_active;

      const { error: updateError } = await supabase
        .from('players')
        .update(updateData)
        .eq('id', id);

      if (updateError) {
        console.error('Error updating player:', updateError);
        setError(updateError.message);
        // Rollback on error
        setPlayers(previousPlayers);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error:', err);
      setError('Error al actualizar jugador');
      // Rollback on error
      setPlayers(previousPlayers);
      return false;
    }
  };

  const togglePlayerActive = async (id: string, isActive: boolean): Promise<boolean> => {
    // Optimistic update
    const previousPlayers = [...players];
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, is_active: isActive } : p));

    try {
      const { error: updateError } = await supabase
        .from('players')
        .update({ is_active: isActive })
        .eq('id', id);

      if (updateError) {
        console.error('Error toggling player:', updateError);
        setError(updateError.message);
        setPlayers(previousPlayers);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error:', err);
      setError('Error al cambiar estado');
      setPlayers(previousPlayers);
      return false;
    }
  };

  return {
    players,
    isLoading,
    error,
    refetch: fetchPlayers,
    createPlayer,
    updatePlayer,
    togglePlayerActive,
  };
}
