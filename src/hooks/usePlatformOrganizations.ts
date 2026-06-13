import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PlatformOrganization {
  id: string;
  name: string;
  org_code: string;
  plan: 'freemium' | 'starter' | 'professional' | 'enterprise';
  is_active: boolean;
  created_at: string;
  city: string;
  country: string;
  phone: string;
  organization_type: string;
  approximate_students: number;
  onboarding_completed: boolean;
  feature_profile?: 'basic' | 'full' | null;
  features?: Record<string, boolean> | null;
  // Counts
  players_count: number;
  categories_count: number;
  users_count: number;
  // Founder info
  founder?: {
    full_name: string;
    email: string;
  };
}

export interface PlanLimits {
  plan_name: string;
  max_categories: number;
  max_players: number;
  max_users: number;
}

export function usePlatformOrganizations() {
  const [organizations, setOrganizations] = useState<PlatformOrganization[]>([]);
  const [planLimits, setPlanLimits] = useState<PlanLimits[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganizations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch organizations
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgsError) throw orgsError;

      // Fetch plan limits
      const { data: limits, error: limitsError } = await supabase
        .from('plan_limits')
        .select('*');

      if (limitsError) throw limitsError;
      setPlanLimits(limits || []);

      // For each org, fetch counts and founder
      const enrichedOrgs = await Promise.all(
        (orgs || []).map(async (org) => {
          // Players count
          const { count: playersCount } = await supabase
            .from('players')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id);

          // Categories count
          const { count: categoriesCount } = await supabase
            .from('categories')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id);

          // Users count
          const { count: usersCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id);

          // Founder (org_owner)
          const { data: ownerRole } = await supabase
            .from('user_org_roles')
            .select('user_id')
            .eq('organization_id', org.id)
            .eq('role', 'org_owner')
            .limit(1)
            .maybeSingle();

          let founder = undefined;
          if (ownerRole?.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', ownerRole.user_id)
              .maybeSingle();
            
            if (profile) {
              founder = profile;
            }
          }

          return {
            ...org,
            players_count: playersCount || 0,
            categories_count: categoriesCount || 0,
            users_count: usersCount || 0,
            founder,
          } as PlatformOrganization;
        })
      );

      setOrganizations(enrichedOrgs);
    } catch (err: any) {
      console.error('Error fetching organizations:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getLimitsForPlan = (planName: string): PlanLimits | undefined => {
    return planLimits.find(l => l.plan_name === planName);
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  return {
    organizations,
    planLimits,
    isLoading,
    error,
    refetch: fetchOrganizations,
    getLimitsForPlan,
  };
}
