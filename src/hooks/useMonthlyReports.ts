import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface MonthlyReport {
  id: string;
  organization_id: string;
  report_month: string;
  new_players_count: number;
  churned_count: number;
  snapshot: any;
  generated_by: string | null;
  created_at: string;
}

export function useMonthlyReports() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['monthly-reports', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('monthly_reports')
        .select('*')
        .eq('organization_id', organization.id)
        .order('report_month', { ascending: false })
        .limit(12);

      if (error) {
        console.error('Error fetching reports:', error);
        return [];
      }

      return data as MonthlyReport[];
    },
    enabled: !!organization?.id,
  });

  const generateReport = useMutation({
    mutationFn: async (month: string) => {
      const { data, error } = await supabase.functions.invoke('monthly-report', {
        body: { month },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.report as MonthlyReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-reports'] });
      toast.success('Reporte generado correctamente');
    },
    onError: (error) => {
      console.error('Error generating report:', error);
      toast.error('Error al generar el reporte');
    },
  });

  return {
    reports,
    isLoading,
    generateReport,
  };
}
