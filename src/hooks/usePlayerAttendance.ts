import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Attendance, AttendanceStatus } from '@/types/categories';

interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  justified: number;
  attendanceRate: number;
}

export function usePlayerAttendance(playerId: string | null) {
  const { organization } = useAuth();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    total: 0,
    present: 0,
    absent: 0,
    justified: 0,
    attendanceRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchAttendance = useCallback(async () => {
    if (!organization || !playerId) {
      setAttendance([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('player_id', playerId)
        .eq('organization_id', organization.id)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching attendance:', error);
        return;
      }

      const records = (data || []) as Attendance[];
      setAttendance(records);

      // Calculate stats
      const total = records.length;
      const present = records.filter(r => r.status === 'presente').length;
      const absent = records.filter(r => r.status === 'ausente').length;
      const justified = records.filter(r => r.status === 'justificado').length;
      const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

      setStats({ total, present, absent, justified, attendanceRate });
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [organization, playerId]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const recordAttendance = async (
    categoryId: string,
    date: string,
    status: AttendanceStatus,
    notes?: string
  ): Promise<boolean> => {
    if (!organization || !playerId) return false;

    try {
      const { error } = await supabase
        .from('attendance')
        .upsert({
          organization_id: organization.id,
          player_id: playerId,
          category_id: categoryId,
          date,
          status,
          notes: notes || null,
        }, {
          onConflict: 'player_id,date,category_id',
        });

      if (error) {
        console.error('Error recording attendance:', error);
        return false;
      }

      await fetchAttendance();
      return true;
    } catch (err) {
      console.error('Error:', err);
      return false;
    }
  };

  return {
    attendance,
    stats,
    isLoading,
    refetch: fetchAttendance,
    recordAttendance,
  };
}
