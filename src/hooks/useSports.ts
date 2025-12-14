import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Sport {
  id: string;
  name: string;
  is_system: boolean;
}

export function useSports() {
  const [sports, setSports] = useState<Sport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSports = async () => {
      const { data, error } = await supabase
        .from('sports')
        .select('*')
        .or('is_system.eq.true,organization_id.is.null')
        .order('name');

      if (error) {
        console.error('Error fetching sports:', error);
      } else {
        setSports(data as Sport[]);
      }
      setIsLoading(false);
    };

    fetchSports();
  }, []);

  return { sports, isLoading };
}
