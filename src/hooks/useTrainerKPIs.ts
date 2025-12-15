import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TrainerKPIs {
  // Training sessions (from attendance)
  totalSessions: number;
  attendanceRate: number;
  totalPresent: number;
  totalAbsent: number;
  totalJustified: number;
  
  // Match stats (from matches table)
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

      const categoryIds = categories?.map(c => c.id) || [];

      // Build date filter for attendance
      let attendanceQuery = supabase
        .from('attendance')
        .select('id, status, date')
        .eq('organization_id', organization.id);
      
      if (categoryIds.length > 0) {
        attendanceQuery = attendanceQuery.in('category_id', categoryIds);
      }

      if (month && year) {
        const startDate = `${year}-${month.padStart(2, '0')}-01`;
        const endDate = new Date(year, parseInt(month), 0).toISOString().split('T')[0];
        attendanceQuery = attendanceQuery.gte('date', startDate).lte('date', endDate);
      } else if (year) {
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;
        attendanceQuery = attendanceQuery.gte('date', startDate).lte('date', endDate);
      }

      const { data: attendance, error: attendanceError } = await attendanceQuery;

      // Fetch matches for this trainer
      let matchesQuery = supabase
        .from('matches')
        .select('id, goals_for, goals_against, status, match_date')
        .eq('organization_id', organization.id)
        .eq('trainer_id', trainerId)
        .eq('status', 'terminado');

      if (month && year) {
        const startDate = `${year}-${month.padStart(2, '0')}-01`;
        const endDate = new Date(year, parseInt(month), 0).toISOString().split('T')[0];
        matchesQuery = matchesQuery.gte('match_date', startDate).lte('match_date', `${endDate}T23:59:59`);
      } else if (year) {
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;
        matchesQuery = matchesQuery.gte('match_date', startDate).lte('match_date', `${endDate}T23:59:59`);
      }

      const { data: matches, error: matchesError } = await matchesQuery;

      if (attendanceError) {
        console.error('Error fetching attendance:', attendanceError);
      }

      if (matchesError) {
        console.error('Error fetching matches:', matchesError);
      }

      // Calculate attendance stats
      const uniqueDates = new Set((attendance || []).map(a => a.date));
      const totalSessions = uniqueDates.size;
      const totalPresent = (attendance || []).filter(a => a.status === 'presente').length;
      const totalAbsent = (attendance || []).filter(a => a.status === 'ausente').length;
      const totalJustified = (attendance || []).filter(a => a.status === 'justificado').length;
      const totalRecords = (attendance || []).length;
      const attendanceRate = totalRecords > 0 
        ? Math.round((totalPresent / totalRecords) * 100) 
        : 0;

      // Calculate match stats from real data
      const matchList = matches || [];
      const matchesPlayed = matchList.length;
      
      let wins = 0;
      let draws = 0;
      let losses = 0;
      let goalsFor = 0;
      let goalsAgainst = 0;

      matchList.forEach(match => {
        goalsFor += match.goals_for || 0;
        goalsAgainst += match.goals_against || 0;
        
        if (match.goals_for > match.goals_against) {
          wins++;
        } else if (match.goals_for === match.goals_against) {
          draws++;
        } else {
          losses++;
        }
      });

      const goalDifference = goalsFor - goalsAgainst;
      
      // Effectiveness: (wins * 3 + draws) / (matchesPlayed * 3) * 100
      const effectiveness = matchesPlayed > 0 
        ? Math.round(((wins * 3 + draws) / (matchesPlayed * 3)) * 100) 
        : 0;

      // Calculate streak from last 5 matches
      const sortedMatches = [...matchList].sort((a, b) => 
        new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
      ).slice(0, 5);

      const streakLetters = sortedMatches.map(match => {
        if (match.goals_for > match.goals_against) return 'G';
        if (match.goals_for === match.goals_against) return 'E';
        return 'P';
      });

      const streak = streakLetters.length > 0 ? streakLetters.join('') : '—';

      setKPIs({
        totalSessions,
        attendanceRate,
        totalPresent,
        totalAbsent,
        totalJustified,
        matchesPlayed,
        wins,
        draws,
        losses,
        goalsFor,
        goalsAgainst,
        goalDifference,
        effectiveness,
        streak,
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
