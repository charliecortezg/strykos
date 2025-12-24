import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface PlanLimits {
  plan_name: string;
  max_categories: number;
  max_players: number;
  max_users: number;
  excel_import: boolean;
  data_export: boolean;
  custom_branding: boolean;
  priority_support: boolean;
}

export interface UsageData {
  categories: number;
  players: number;
  users: number;
}

export interface PlanLimitStatus {
  limits: PlanLimits | null;
  usage: UsageData;
  isLoading: boolean;
  categoriesRemaining: number;
  playersRemaining: number;
  usersRemaining: number;
  isAtCategoryLimit: boolean;
  isAtPlayerLimit: boolean;
  isAtUserLimit: boolean;
  isNearCategoryLimit: boolean;
  isNearPlayerLimit: boolean;
  canImportExcel: boolean;
  canExportData: boolean;
  refetch: () => Promise<void>;
}

export function usePlanLimits(): PlanLimitStatus {
  const { organization } = useAuth();
  const [limits, setLimits] = useState<PlanLimits | null>(null);
  const [usage, setUsage] = useState<UsageData>({ categories: 0, players: 0, users: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const fetchLimitsAndUsage = async () => {
    if (!organization) {
      setIsLoading(false);
      return;
    }

    try {
      // Fetch plan limits
      const { data: planLimits, error: limitsError } = await supabase
        .from('plan_limits')
        .select('*')
        .eq('plan_name', organization.plan || 'freemium')
        .maybeSingle();

      if (limitsError) {
        console.error('Error fetching plan limits:', limitsError);
      }

      // Fetch current usage
      const [categoriesResult, playersResult, usersResult] = await Promise.all([
        supabase
          .from('categories')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
          .eq('is_active', true),
        supabase
          .from('players')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
          .eq('is_active', true),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
          .eq('is_active', true),
      ]);

      setLimits(planLimits as PlanLimits | null);
      setUsage({
        categories: categoriesResult.count || 0,
        players: playersResult.count || 0,
        users: usersResult.count || 0,
      });
    } catch (error) {
      console.error('Error fetching plan limits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLimitsAndUsage();
  }, [organization?.id, organization?.plan]);

  const computed = useMemo(() => {
    if (!limits) {
      return {
        categoriesRemaining: Infinity,
        playersRemaining: Infinity,
        usersRemaining: Infinity,
        isAtCategoryLimit: false,
        isAtPlayerLimit: false,
        isAtUserLimit: false,
        isNearCategoryLimit: false,
        isNearPlayerLimit: false,
        canImportExcel: true,
        canExportData: true,
      };
    }

    // -1 means unlimited
    const maxCategories = limits.max_categories === -1 ? Infinity : limits.max_categories;
    const maxPlayers = limits.max_players === -1 ? Infinity : limits.max_players;
    const maxUsers = limits.max_users === -1 ? Infinity : limits.max_users;

    const categoriesRemaining = Math.max(0, maxCategories - usage.categories);
    const playersRemaining = Math.max(0, maxPlayers - usage.players);
    const usersRemaining = Math.max(0, maxUsers - usage.users);

    return {
      categoriesRemaining,
      playersRemaining,
      usersRemaining,
      isAtCategoryLimit: categoriesRemaining === 0,
      isAtPlayerLimit: playersRemaining === 0,
      isAtUserLimit: usersRemaining === 0,
      isNearCategoryLimit: maxCategories !== Infinity && categoriesRemaining <= 1 && categoriesRemaining > 0,
      isNearPlayerLimit: maxPlayers !== Infinity && playersRemaining <= 5 && playersRemaining > 0,
      canImportExcel: limits.excel_import,
      canExportData: limits.data_export,
    };
  }, [limits, usage]);

  return {
    limits,
    usage,
    isLoading,
    ...computed,
    refetch: fetchLimitsAndUsage,
  };
}
