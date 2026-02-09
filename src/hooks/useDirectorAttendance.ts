import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { subWeeks, format } from 'date-fns';

interface AttendanceRecord {
  id: string;
  player_id: string;
  status: string;
  performance_status: string | null;
  notes: string | null;
  player: {
    id: string;
    full_name: string;
    position: string | null;
  } | null;
}

interface PlayerAlertInfo {
  player_id: string;
  full_name: string;
  rate: number; // 0-100
}

export function useDirectorAttendance(categoryId: string | null, date: string | null) {
  const { organization } = useAuth();

  // Daily attendance for a category on a given date
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['director-attendance', organization?.id, categoryId, date],
    queryFn: async () => {
      if (!organization?.id || !categoryId || !date) return [];

      const { data, error } = await supabase
        .from('attendance')
        .select(`
          id, player_id, status, performance_status, notes,
          player:players(id, full_name, position)
        `)
        .eq('organization_id', organization.id)
        .eq('category_id', categoryId)
        .eq('date', date);

      if (error) {
        console.error('Error fetching attendance:', error);
        return [];
      }

      return (data || []) as AttendanceRecord[];
    },
    enabled: !!organization?.id && !!categoryId && !!date,
  });

  // Players in category (to show who has no record)
  const { data: categoryPlayers = [] } = useQuery({
    queryKey: ['director-category-players', organization?.id, categoryId],
    queryFn: async () => {
      if (!organization?.id || !categoryId) return [];

      const { data, error } = await supabase
        .from('players')
        .select('id, full_name, position')
        .eq('organization_id', organization.id)
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .order('full_name');

      if (error) return [];
      return data || [];
    },
    enabled: !!organization?.id && !!categoryId,
  });

  // 4-week attendance rate per player (for alerts)
  const { data: lowAttendancePlayers = [] } = useQuery({
    queryKey: ['director-attendance-alerts', organization?.id, categoryId],
    queryFn: async (): Promise<PlayerAlertInfo[]> => {
      if (!organization?.id || !categoryId) return [];

      const fourWeeksAgo = format(subWeeks(new Date(), 4), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('attendance')
        .select('player_id, status, player:players(full_name)')
        .eq('organization_id', organization.id)
        .eq('category_id', categoryId)
        .gte('date', fourWeeksAgo);

      if (error || !data) return [];

      // Group by player
      const playerMap = new Map<string, { name: string; total: number; present: number }>();
      for (const r of data) {
        const pid = r.player_id;
        const existing = playerMap.get(pid) || { name: (r.player as any)?.full_name || '', total: 0, present: 0 };
        existing.total++;
        if (r.status === 'presente') existing.present++;
        playerMap.set(pid, existing);
      }

      return Array.from(playerMap.entries())
        .map(([pid, info]) => ({
          player_id: pid,
          full_name: info.name,
          rate: info.total > 0 ? Math.round((info.present / info.total) * 100) : 0,
        }))
        .filter(p => p.rate < 50);
    },
    enabled: !!organization?.id && !!categoryId,
  });

  // Stats
  const present = records.filter(r => r.status === 'presente').length;
  const absent = records.filter(r => r.status === 'ausente').length;
  const justified = records.filter(r => r.status === 'justificado').length;
  const total = categoryPlayers.length;
  const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

  return {
    records,
    categoryPlayers,
    lowAttendancePlayers,
    stats: { present, absent, justified, total, attendanceRate },
    isLoading,
  };
}
