import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Sport {
  id: string;
  name: string;
  is_system: boolean;
  organization_id: string | null;
}

export function useSports() {
  const { organization } = useAuth();
  const [sports, setSports] = useState<Sport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSports = useCallback(async () => {
    setIsLoading(true);
    
    // Fetch system sports and organization-specific sports
    const { data, error } = await supabase
      .from('sports')
      .select('*')
      .or(`is_system.eq.true,organization_id.is.null${organization?.id ? `,organization_id.eq.${organization.id}` : ''}`)
      .order('name');

    if (error) {
      console.error('Error fetching sports:', error);
    } else {
      setSports(data as Sport[]);
    }
    setIsLoading(false);
  }, [organization?.id]);

  useEffect(() => {
    fetchSports();
  }, [fetchSports]);

  const createSport = async (name: string): Promise<string | null> => {
    if (!organization?.id) return null;

    const { data, error } = await supabase
      .from('sports')
      .insert({
        name: name.trim(),
        organization_id: organization.id,
        is_system: false,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating sport:', error);
      return null;
    }

    await fetchSports();
    return data.id;
  };

  return { sports, isLoading, refetch: fetchSports, createSport };
}
