import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format, startOfWeek, endOfWeek } from 'date-fns';

export interface MonthlyRevenue {
  month: string;
  revenue: number;
}

export interface FounderKPIs {
  // Financial
  monthlyRevenue: number;
  pendingPayments: number;
  collectionRate: number;
  revenueByMonth: MonthlyRevenue[];
  
  // Operational
  globalAttendanceRate: number;
  trainingsThisWeek: number;
  activeCategories: number;
  activePlayers: number;
  
  // Alerts
  overduePlayersCount: number;
  inactiveCategoriesCount: number;
  
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function useFounderKPIs(): FounderKPIs {
  const { organization } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [kpis, setKpis] = useState<Omit<FounderKPIs, 'isLoading' | 'refetch'>>({
    monthlyRevenue: 0,
    pendingPayments: 0,
    collectionRate: 0,
    revenueByMonth: [],
    globalAttendanceRate: 0,
    trainingsThisWeek: 0,
    activeCategories: 0,
    activePlayers: 0,
    overduePlayersCount: 0,
    inactiveCategoriesCount: 0,
  });

  const fetchKPIs = async () => {
    if (!organization) {
      setIsLoading(false);
      return;
    }

    try {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

      // Fetch all data in parallel
      const [
        paymentsThisMonth,
        allPayments6Months,
        playersData,
        categoriesData,
        attendanceThisMonth,
        attendanceThisWeek,
      ] = await Promise.all([
        // Payments this month
        supabase
          .from('payments')
          .select('amount')
          .eq('organization_id', organization.id)
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString()),
        
        // Payments last 6 months for chart
        supabase
          .from('payments')
          .select('amount, created_at')
          .eq('organization_id', organization.id)
          .gte('created_at', subMonths(now, 6).toISOString()),
        
        // Players data
        supabase
          .from('players')
          .select('id, payment_status, is_scholarship, monthly_fee')
          .eq('organization_id', organization.id)
          .eq('is_active', true),
        
        // Categories data
        supabase
          .from('categories')
          .select('id, is_active, days_of_week')
          .eq('organization_id', organization.id),
        
        // Attendance this month
        supabase
          .from('attendance')
          .select('status')
          .eq('organization_id', organization.id)
          .gte('date', monthStart.toISOString().split('T')[0])
          .lte('date', monthEnd.toISOString().split('T')[0]),
        
        // Attendance this week for trainings count
        supabase
          .from('attendance')
          .select('date, category_id')
          .eq('organization_id', organization.id)
          .gte('date', weekStart.toISOString().split('T')[0])
          .lte('date', weekEnd.toISOString().split('T')[0]),
      ]);

      // Calculate monthly revenue
      const monthlyRevenue = (paymentsThisMonth.data || []).reduce(
        (sum, p) => sum + Number(p.amount), 
        0
      );

      // Calculate revenue by month for chart
      const revenueMap = new Map<string, number>();
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const monthKey = format(monthDate, 'yyyy-MM');
        revenueMap.set(monthKey, 0);
      }
      
      (allPayments6Months.data || []).forEach(p => {
        const monthKey = format(new Date(p.created_at), 'yyyy-MM');
        if (revenueMap.has(monthKey)) {
          revenueMap.set(monthKey, (revenueMap.get(monthKey) || 0) + Number(p.amount));
        }
      });

      const revenueByMonth: MonthlyRevenue[] = Array.from(revenueMap.entries()).map(
        ([month, revenue]) => ({
          month: format(new Date(month + '-01'), 'MMM'),
          revenue,
        })
      );

      // Calculate player metrics
      const players = playersData.data || [];
      const activePlayers = players.length;
      const nonScholarshipPlayers = players.filter(p => !p.is_scholarship);
      const upToDatePlayers = nonScholarshipPlayers.filter(p => p.payment_status === 'al_dia');
      const overduePlayersCount = players.filter(p => p.payment_status === 'atrasado').length;
      
      // Expected revenue (sum of monthly fees for non-scholarship players)
      const expectedRevenue = nonScholarshipPlayers.reduce(
        (sum, p) => sum + (Number(p.monthly_fee) || 0), 
        0
      );
      const pendingPayments = Math.max(0, expectedRevenue - monthlyRevenue);
      const collectionRate = expectedRevenue > 0 
        ? Math.round((monthlyRevenue / expectedRevenue) * 100) 
        : 0;

      // Categories metrics
      const categories = categoriesData.data || [];
      const activeCategories = categories.filter(c => c.is_active).length;
      const inactiveCategoriesCount = categories.filter(c => !c.is_active).length;

      // Attendance metrics
      const attendanceRecords = attendanceThisMonth.data || [];
      const presentCount = attendanceRecords.filter(a => a.status === 'presente').length;
      const globalAttendanceRate = attendanceRecords.length > 0 
        ? Math.round((presentCount / attendanceRecords.length) * 100) 
        : 0;

      // Trainings this week (unique date-category combinations)
      const weekAttendance = attendanceThisWeek.data || [];
      const uniqueTrainings = new Set(
        weekAttendance.map(a => `${a.date}-${a.category_id}`)
      );
      const trainingsThisWeek = uniqueTrainings.size;

      setKpis({
        monthlyRevenue,
        pendingPayments,
        collectionRate,
        revenueByMonth,
        globalAttendanceRate,
        trainingsThisWeek,
        activeCategories,
        activePlayers,
        overduePlayersCount,
        inactiveCategoriesCount,
      });
    } catch (error) {
      console.error('Error fetching founder KPIs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKPIs();
  }, [organization?.id]);

  return {
    ...kpis,
    isLoading,
    refetch: fetchKPIs,
  };
}
