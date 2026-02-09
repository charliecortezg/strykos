import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface LifecycleKPIs {
  onboardedThisMonth: number;
  churnedThisMonth: number;
  activeCount: number;
  inactiveCount: number;
  overdue1Count: number;
  overdue2Count: number;
}

export interface PlayerAtRisk {
  id: string;
  full_name: string;
  category_name: string | null;
  last_paid_month: string | null;
  billing_status: string;
  lifecycle_status: string;
}

export function useLifecycleKPIs() {
  const { organization } = useAuth();

  const currentMonthStart = new Date();
  currentMonthStart.setDate(1);
  currentMonthStart.setHours(0, 0, 0, 0);
  const monthStartISO = currentMonthStart.toISOString();

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['lifecycle-kpis', organization?.id],
    queryFn: async (): Promise<LifecycleKPIs> => {
      if (!organization?.id) return { onboardedThisMonth: 0, churnedThisMonth: 0, activeCount: 0, inactiveCount: 0, overdue1Count: 0, overdue2Count: 0 };

      const [onboarded, churned, active, inactive, overdue1, overdue2] = await Promise.all([
        supabase.from('players').select('id', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
          .gte('onboarded_at', monthStartISO),
        supabase.from('players').select('id', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
          .gte('offboarded_at', monthStartISO),
        supabase.from('players').select('id', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
          .eq('lifecycle_status', 'active'),
        supabase.from('players').select('id', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
          .eq('lifecycle_status', 'inactive'),
        supabase.from('players').select('id', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
          .eq('billing_status', 'overdue_1'),
        supabase.from('players').select('id', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
          .eq('billing_status', 'overdue_2'),
      ]);

      return {
        onboardedThisMonth: onboarded.count ?? 0,
        churnedThisMonth: churned.count ?? 0,
        activeCount: active.count ?? 0,
        inactiveCount: inactive.count ?? 0,
        overdue1Count: overdue1.count ?? 0,
        overdue2Count: overdue2.count ?? 0,
      };
    },
    enabled: !!organization?.id,
  });

  const { data: playersAtRisk = [], isLoading: riskLoading } = useQuery({
    queryKey: ['players-at-risk', organization?.id],
    queryFn: async (): Promise<PlayerAtRisk[]> => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('players')
        .select('id, full_name, last_paid_month, billing_status, lifecycle_status, category:categories(name)')
        .eq('organization_id', organization.id)
        .in('billing_status', ['overdue_1', 'overdue_2'])
        .order('billing_status', { ascending: false });

      if (error) throw error;

      return (data || []).map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        category_name: p.category?.name ?? null,
        last_paid_month: p.last_paid_month,
        billing_status: p.billing_status,
        lifecycle_status: p.lifecycle_status,
      }));
    },
    enabled: !!organization?.id,
  });

  return {
    kpis: kpis ?? { onboardedThisMonth: 0, churnedThisMonth: 0, activeCount: 0, inactiveCount: 0, overdue1Count: 0, overdue2Count: 0 },
    playersAtRisk,
    isLoading: kpisLoading || riskLoading,
  };
}
