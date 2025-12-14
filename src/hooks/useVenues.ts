import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Venue, CreateVenueData } from '@/types/categories';

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

  const createVenue = async (data: CreateVenueData): Promise<Venue | null> => {
    if (!organization) return null;

    try {
      const { data: newVenue, error } = await supabase
        .from('venues')
        .insert({
          organization_id: organization.id,
          name: data.name,
          address: data.address || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating venue:', error);
        return null;
      }

      await fetchVenues();
      return newVenue as Venue;
    } catch (err) {
      console.error('Error:', err);
      return null;
    }
  };

  const updateVenue = async (id: string, data: Partial<CreateVenueData>): Promise<boolean> => {
    if (!organization) return false;

    try {
      const { error } = await supabase
        .from('venues')
        .update({
          name: data.name,
          address: data.address,
        })
        .eq('id', id)
        .eq('organization_id', organization.id);

      if (error) {
        console.error('Error updating venue:', error);
        return false;
      }

      await fetchVenues();
      return true;
    } catch (err) {
      console.error('Error:', err);
      return false;
    }
  };

  const toggleVenueActive = async (id: string, isActive: boolean): Promise<boolean> => {
    if (!organization) return false;

    try {
      const { error } = await supabase
        .from('venues')
        .update({ is_active: isActive })
        .eq('id', id)
        .eq('organization_id', organization.id);

      if (error) {
        console.error('Error toggling venue:', error);
        return false;
      }

      await fetchVenues();
      return true;
    } catch (err) {
      console.error('Error:', err);
      return false;
    }
  };

  return {
    venues,
    activeVenues: venues.filter(v => v.is_active),
    isLoading,
    refetch: fetchVenues,
    createVenue,
    updateVenue,
    toggleVenueActive,
  };
}
