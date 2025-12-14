import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Venue } from '@/types/categories';

export function useVenues() {
  const { organization } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchVenues = useCallback(async () => {
    if (!organization) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching venues:', error);
        return;
      }

      setVenues((data || []) as Venue[]);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [organization]);

  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

  const createVenue = async (name: string, address?: string): Promise<Venue | null> => {
    if (!organization) return null;

    try {
      const { data, error } = await supabase
        .from('venues')
        .insert({
          organization_id: organization.id,
          name,
          address: address || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating venue:', error);
        return null;
      }

      await fetchVenues();
      return data as Venue;
    } catch (err) {
      console.error('Error:', err);
      return null;
    }
  };

  return {
    venues,
    isLoading,
    refetch: fetchVenues,
    createVenue,
  };
}
