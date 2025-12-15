import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useMatchFields() {
  const { organization } = useAuth();
  const [fields, setFields] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFields = useCallback(async () => {
    if (!organization?.id) return;

    try {
      // Get unique field names from existing matches
      const { data, error } = await supabase
        .from('matches')
        .select('notes')
        .eq('organization_id', organization.id)
        .not('notes', 'is', null);

      if (error) throw error;

      // Extract field names from notes that start with "Campo: "
      // Also get venue names as fallback options
      const { data: venues } = await supabase
        .from('venues')
        .select('name')
        .eq('organization_id', organization.id)
        .eq('is_active', true);

      const venueNames = venues?.map(v => v.name) || [];
      
      // Get fields stored in localStorage for this org
      const storedFields = localStorage.getItem(`match-fields-${organization.id}`);
      const customFields = storedFields ? JSON.parse(storedFields) : [];

      // Combine all unique field names
      const allFields = [...new Set([...venueNames, ...customFields])];
      setFields(allFields.sort());
    } catch (error) {
      console.error('Error fetching match fields:', error);
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  const addField = useCallback((fieldName: string) => {
    if (!organization?.id || !fieldName.trim()) return;

    // Store custom fields in localStorage for persistence
    const storedFields = localStorage.getItem(`match-fields-${organization.id}`);
    const customFields = storedFields ? JSON.parse(storedFields) : [];
    
    if (!customFields.includes(fieldName.trim())) {
      const updatedFields = [...customFields, fieldName.trim()];
      localStorage.setItem(`match-fields-${organization.id}`, JSON.stringify(updatedFields));
      setFields(prev => [...new Set([...prev, fieldName.trim()])].sort());
    }
  }, [organization?.id]);

  return {
    fields,
    isLoading,
    addField,
    refetch: fetchFields,
  };
}
