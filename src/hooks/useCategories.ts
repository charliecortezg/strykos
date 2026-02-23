import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Category, CreateCategoryData } from '@/types/categories';

export function useCategories() {
  const { organization } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    if (!organization) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('categories')
        .select(`
          *,
          sport:sports(id, name),
          venue:venues(id, name),
          trainer:profiles(id, full_name)
        `)
        .eq('organization_id', organization.id)
        .order('name');

      if (fetchError) {
        console.error('Error fetching categories:', fetchError);
        setError(fetchError.message);
        return;
      }

      setCategories((data || []) as Category[]);
    } catch (err) {
      console.error('Error:', err);
      setError('Error al cargar categorías');
    } finally {
      setIsLoading(false);
    }
  }, [organization]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const createCategory = async (data: CreateCategoryData): Promise<boolean> => {
    if (!organization) return false;

    try {
      const { error: insertError } = await supabase
        .from('categories')
        .insert({
          organization_id: organization.id,
          name: data.name,
          sport_id: data.sport_id || null,
          venue_id: data.venue_id || null,
          trainer_id: data.trainer_id || null,
          start_time: data.start_time || null,
          end_time: data.end_time || null,
          days_of_week: data.days_of_week || [],
          age_group: data.age_group || '8-9',
        });

      if (insertError) {
        console.error('Error creating category:', insertError);
        setError(insertError.message);
        return false;
      }

      await fetchCategories();
      return true;
    } catch (err) {
      console.error('Error:', err);
      setError('Error al crear categoría');
      return false;
    }
  };

  const updateCategory = async (id: string, data: Partial<CreateCategoryData>): Promise<boolean> => {
    try {
      const updateData: Record<string, unknown> = {
          name: data.name,
          sport_id: data.sport_id || null,
          venue_id: data.venue_id || null,
          trainer_id: data.trainer_id || null,
          start_time: data.start_time || null,
          end_time: data.end_time || null,
          days_of_week: data.days_of_week || [],
        };
      if (data.age_group) updateData.age_group = data.age_group;
      const { error: updateError } = await supabase
        .from('categories')
        .update(updateData)
        .eq('id', id);

      if (updateError) {
        console.error('Error updating category:', updateError);
        setError(updateError.message);
        return false;
      }

      await fetchCategories();
      return true;
    } catch (err) {
      console.error('Error:', err);
      setError('Error al actualizar categoría');
      return false;
    }
  };

  const toggleCategoryActive = async (id: string, isActive: boolean): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('categories')
        .update({ is_active: isActive })
        .eq('id', id);

      if (updateError) {
        console.error('Error toggling category:', updateError);
        setError(updateError.message);
        return false;
      }

      await fetchCategories();
      return true;
    } catch (err) {
      console.error('Error:', err);
      setError('Error al cambiar estado');
      return false;
    }
  };

  return {
    categories,
    isLoading,
    error,
    refetch: fetchCategories,
    createCategory,
    updateCategory,
    toggleCategoryActive,
  };
}
