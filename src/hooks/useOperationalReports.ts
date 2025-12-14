import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

interface AttendanceByCategory {
  categoryName: string;
  categoryId: string;
  presente: number;
  ausente: number;
  justificado: number;
  total: number;
  rate: number;
}

interface PaymentsByMonth {
  month: string;
  total: number;
  count: number;
}

interface DailyAttendance {
  date: string;
  presente: number;
  ausente: number;
  justificado: number;
}

interface ReportsData {
  attendanceByCategory: AttendanceByCategory[];
  paymentsByMonth: PaymentsByMonth[];
  dailyAttendance: DailyAttendance[];
  totalPlayers: number;
  totalActiveCategories: number;
  overallAttendanceRate: number;
  monthlyRevenue: number;
  pendingPayments: number;
}

export function useOperationalReports() {
  const { organization } = useAuth();
  const [data, setData] = useState<ReportsData>({
    attendanceByCategory: [],
    paymentsByMonth: [],
    dailyAttendance: [],
    totalPlayers: 0,
    totalActiveCategories: 0,
    overallAttendanceRate: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    if (!organization) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Fetch categories
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name, is_active')
        .eq('organization_id', organization.id);

      // Fetch players
      const { data: players } = await supabase
        .from('players')
        .select('id, is_active, payment_status')
        .eq('organization_id', organization.id);

      // Fetch attendance (last 30 days)
      const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const { data: attendance } = await supabase
        .from('attendance')
        .select('id, category_id, date, status')
        .eq('organization_id', organization.id)
        .gte('date', thirtyDaysAgo);

      // Fetch payments (last 6 months)
      const sixMonthsAgo = format(subDays(new Date(), 180), 'yyyy-MM-dd');
      const { data: payments } = await supabase
        .from('payments')
        .select('id, amount, payment_month')
        .eq('organization_id', organization.id)
        .gte('payment_month', sixMonthsAgo);

      // Process attendance by category
      const categoryMap = new Map<string, { name: string; presente: number; ausente: number; justificado: number }>();
      categories?.filter(c => c.is_active).forEach(cat => {
        categoryMap.set(cat.id, { name: cat.name, presente: 0, ausente: 0, justificado: 0 });
      });

      attendance?.forEach(record => {
        const cat = categoryMap.get(record.category_id);
        if (cat) {
          if (record.status === 'presente') cat.presente++;
          else if (record.status === 'ausente') cat.ausente++;
          else if (record.status === 'justificado') cat.justificado++;
        }
      });

      const attendanceByCategory: AttendanceByCategory[] = Array.from(categoryMap.entries()).map(([id, data]) => {
        const total = data.presente + data.ausente + data.justificado;
        return {
          categoryId: id,
          categoryName: data.name,
          presente: data.presente,
          ausente: data.ausente,
          justificado: data.justificado,
          total,
          rate: total > 0 ? Math.round((data.presente / total) * 100) : 0,
        };
      });

      // Process payments by month
      const monthMap = new Map<string, { total: number; count: number }>();
      payments?.forEach(payment => {
        const monthKey = format(new Date(payment.payment_month), 'MMM yyyy', { locale: es });
        const existing = monthMap.get(monthKey) || { total: 0, count: 0 };
        existing.total += Number(payment.amount);
        existing.count++;
        monthMap.set(monthKey, existing);
      });

      const paymentsByMonth: PaymentsByMonth[] = Array.from(monthMap.entries())
        .map(([month, data]) => ({ month, total: data.total, count: data.count }))
        .slice(-6);

      // Process daily attendance (last 14 days)
      const last14Days = eachDayOfInterval({
        start: subDays(new Date(), 13),
        end: new Date(),
      });

      const dailyMap = new Map<string, { presente: number; ausente: number; justificado: number }>();
      last14Days.forEach(day => {
        dailyMap.set(format(day, 'yyyy-MM-dd'), { presente: 0, ausente: 0, justificado: 0 });
      });

      attendance?.forEach(record => {
        const day = dailyMap.get(record.date);
        if (day) {
          if (record.status === 'presente') day.presente++;
          else if (record.status === 'ausente') day.ausente++;
          else if (record.status === 'justificado') day.justificado++;
        }
      });

      const dailyAttendance: DailyAttendance[] = Array.from(dailyMap.entries()).map(([date, data]) => ({
        date: format(new Date(date), 'dd MMM', { locale: es }),
        ...data,
      }));

      // Calculate totals
      const totalPlayers = players?.filter(p => p.is_active).length || 0;
      const totalActiveCategories = categories?.filter(c => c.is_active).length || 0;
      
      const totalPresent = attendance?.filter(a => a.status === 'presente').length || 0;
      const totalAttendance = attendance?.length || 0;
      const overallAttendanceRate = totalAttendance > 0 ? Math.round((totalPresent / totalAttendance) * 100) : 0;

      // Current month revenue
      const currentMonthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const currentMonthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');
      const monthlyRevenue = payments
        ?.filter(p => p.payment_month >= currentMonthStart && p.payment_month <= currentMonthEnd)
        .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      const pendingPayments = players?.filter(p => p.is_active && p.payment_status !== 'al_dia').length || 0;

      setData({
        attendanceByCategory,
        paymentsByMonth,
        dailyAttendance,
        totalPlayers,
        totalActiveCategories,
        overallAttendanceRate,
        monthlyRevenue,
        pendingPayments,
      });
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setIsLoading(false);
    }
  }, [organization]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return { data, isLoading, refetch: fetchReports };
}
