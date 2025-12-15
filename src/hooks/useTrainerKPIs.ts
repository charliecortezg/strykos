import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TrainerKPIs {
  // Training sessions
  totalSessions: number;
  attendanceRate: number;
  totalPresent: number;
  totalAbsent: number;
  totalJustified: number;
  
  // Match stats (placeholder for future)
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  effectiveness: number;
  streak: string;
}

const defaultKPIs: TrainerKPIs = {
  totalSessions: 0,
  attendanceRate: 0,
  totalPresent: 0,
  totalAbsent: 0,
  totalJustified: 0,
  matchesPlayed: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDifference: 0,
  effectiveness: 0,
  streak: '—',
};

export function useTrainerKPIs() {
  const { organization } = useAuth();
  const [kpis, setKPIs] = useState<TrainerKPIs>(defaultKPIs);
  const [isLoading, setIsLoading] = useState(false);

  const fetchKPIs = useCallback(async (trainerId: string, month?: string, year?: number) => {
    if (!organization) return;

    setIsLoading(true);

    try {
      // Get categories assigned to this trainer
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('trainer_id', trainerId);

      if (categoriesError) {
        console.error('Error fetching trainer categories:', categoriesError);
        setKPIs(defaultKPIs);
        return;
      }

      if (!categories || categories.length === 0) {
        setKPIs(defaultKPIs);
        setIsLoading(false);
        return;
      }

      const categoryIds = categories.map(c => c.id);

      // Build date filter
      let dateFilter = supabase
        .from('attendance')
        .select('id, status, date')
        .eq('organization_id', organization.id)
        .in('category_id', categoryIds);

      if (month && year) {
        const startDate = `${year}-${month.padStart(2, '0')}-01`;
        const endDate = new Date(year, parseInt(month), 0).toISOString().split('T')[0];
        dateFilter = dateFilter.gte('date', startDate).lte('date', endDate);
      } else if (year) {
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;
        dateFilter = dateFilter.gte('date', startDate).lte('date', endDate);
      }

      const { data: attendance, error: attendanceError } = await dateFilter;

      if (attendanceError) {
        console.error('Error fetching attendance:', attendanceError);
        setKPIs(defaultKPIs);
        return;
      }

      // Calculate unique session dates
      const uniqueDates = new Set((attendance || []).map(a => a.date));
      const totalSessions = uniqueDates.size;

      // Calculate attendance stats
      const totalPresent = (attendance || []).filter(a => a.status === 'presente').length;
      const totalAbsent = (attendance || []).filter(a => a.status === 'ausente').length;
      const totalJustified = (attendance || []).filter(a => a.status === 'justificado').length;
      const totalRecords = (attendance || []).length;
      const attendanceRate = totalRecords > 0 
        ? Math.round((totalPresent / totalRecords) * 100) 
        : 0;

      setKPIs({
        ...defaultKPIs,
        totalSessions,
        attendanceRate,
        totalPresent,
        totalAbsent,
        totalJustified,
      });
    } catch (err) {
      console.error('Error fetching KPIs:', err);
      setKPIs(defaultKPIs);
    } finally {
      setIsLoading(false);
    }
  }, [organization]);

  return {
    kpis,
    isLoading,
    fetchKPIs,
  };
}
