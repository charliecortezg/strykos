import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AttendanceStatus } from '@/types/categories';
import { toast } from 'sonner';

export type PerformanceStatus = 'outstanding' | 'excellent' | 'focus' | 'challenge';

export interface PlayerAttendanceRecord {
  player_id: string;
  full_name: string;
  position: string | null;
  payment_status: string;
  status: AttendanceStatus;
  notes: string;
  performance_status: PerformanceStatus | null;
}

export interface TrainingSession {
  date: string;
  category_id: string;
  players: PlayerAttendanceRecord[];
}

export interface PerformanceStats {
  excellent: number;
  focus: number;
  challenge: number;
}

export function useTrainingAttendance(categoryId: string | null, date: string) {
  const { organization, user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch players for this category with their attendance for the date
  const { data: playersWithAttendance = [], isLoading } = useQuery({
    queryKey: ['training-attendance', categoryId, date, organization?.id],
    queryFn: async () => {
      if (!categoryId || !organization?.id || !date) return [];

      // Get players in category
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id, full_name, position, payment_status')
        .eq('organization_id', organization.id)
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .order('full_name');

      if (playersError) throw playersError;
      if (!players || players.length === 0) return [];

      // Get existing attendance for this date
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select('player_id, status, notes, performance_status, recorded_by, updated_at')
        .eq('organization_id', organization.id)
        .eq('category_id', categoryId)
        .eq('date', date);

      if (attendanceError) throw attendanceError;

      // Merge players with their attendance
      const attendanceMap = new Map(
        (attendance || []).map(a => [a.player_id, { 
          status: a.status, 
          notes: a.notes,
          performance_status: a.performance_status as PerformanceStatus | null,
          recorded_by: a.recorded_by,
          updated_at: a.updated_at,
        }])
      );

      return players.map(p => ({
        player_id: p.id,
        full_name: p.full_name,
        position: p.position,
        payment_status: p.payment_status,
        status: (attendanceMap.get(p.id)?.status as AttendanceStatus) || 'ausente',
        notes: attendanceMap.get(p.id)?.notes || '',
        performance_status: attendanceMap.get(p.id)?.performance_status || null,
      })) as PlayerAttendanceRecord[];
    },
    enabled: !!categoryId && !!organization?.id && !!date,
  });

  // Query for traceability info (who recorded the attendance)
  const { data: traceabilityInfo } = useQuery({
    queryKey: ['attendance-traceability', categoryId, date, organization?.id],
    queryFn: async () => {
      if (!categoryId || !organization?.id || !date) return null;

      // Get any attendance record for this category/date to find who recorded it
      const { data, error } = await supabase
        .from('attendance')
        .select('recorded_by, updated_at, recorded_by_profile:profiles!attendance_recorded_by_fkey(full_name)')
        .eq('organization_id', organization.id)
        .eq('category_id', categoryId)
        .eq('date', date)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      return {
        recordedBy: (data.recorded_by_profile as { full_name: string } | null)?.full_name || 'Sistema',
        updatedAt: data.updated_at,
      };
    },
    enabled: !!categoryId && !!organization?.id && !!date,
  });

  // Save attendance for all players
  const saveAttendance = useMutation({
    mutationFn: async (players: PlayerAttendanceRecord[]) => {
      if (!categoryId || !organization?.id || !user?.id || !date) {
        throw new Error('Missing required data');
      }

      // Upsert all attendance records
      const records = players.map(p => ({
        organization_id: organization.id,
        player_id: p.player_id,
        category_id: categoryId,
        date: date,
        status: p.status,
        notes: p.notes || null,
        recorded_by: user.id,
        // If present, default to excellent; if absent, set null
        performance_status: p.status === 'presente' 
          ? (p.performance_status || 'excellent') 
          : null,
      }));

      const { error } = await supabase
        .from('attendance')
        .upsert(records, {
          onConflict: 'player_id,date,category_id',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['trainer-kpis'] });
      toast.success('Asistencia registrada correctamente');
    },
    onError: (error) => {
      console.error('Error saving attendance:', error);
      toast.error('Error al guardar la asistencia');
    },
  });

  // Check if attendance already exists for this date/category
  const { data: hasExistingAttendance = false } = useQuery({
    queryKey: ['has-attendance', categoryId, date, organization?.id],
    queryFn: async () => {
      if (!categoryId || !organization?.id || !date) return false;

      const { count, error } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id)
        .eq('category_id', categoryId)
        .eq('date', date);

      if (error) return false;
      return (count || 0) > 0;
    },
    enabled: !!categoryId && !!organization?.id && !!date,
  });

  // Calculate performance stats
  const performanceStats: PerformanceStats & { outstanding: number } = {
    outstanding: playersWithAttendance.filter(p => p.performance_status === 'outstanding').length,
    excellent: playersWithAttendance.filter(p => p.status === 'presente' && (p.performance_status === 'excellent' || !p.performance_status)).length,
    focus: playersWithAttendance.filter(p => p.performance_status === 'focus').length,
    challenge: playersWithAttendance.filter(p => p.performance_status === 'challenge').length,
  };

  return {
    playersWithAttendance,
    isLoading,
    saveAttendance,
    hasExistingAttendance,
    performanceStats,
    traceabilityInfo,
  };
}
