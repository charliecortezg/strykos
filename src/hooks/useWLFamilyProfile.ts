import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WL_MONTHS } from '@/types/wl';

const PORTAL_SESSION_KEY = 'stryk_portal_session';

interface FamilyMonthRow {
  season: string;
  month_key: string;
  month_order: number;
  ind1_name: string | null;
  ind1_frase: string | null;
  ind2_name: string | null;
  ind2_frase: string | null;
}

export interface FamilyProfileMonth {
  season: string;
  month_key: string;
  month_order: number;
  month_label: string;
  indicators: { name: string; frase: string }[];
}

function readGuardianId(): string | null {
  try {
    const raw = localStorage.getItem(PORTAL_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.guardianId || null;
  } catch {
    return null;
  }
}

const MONTH_LABEL_BY_KEY = Object.fromEntries(WL_MONTHS.map(m => [m.key, m.label]));

export function useWLFamilyProfile(playerId: string | null | undefined) {
  const guardianId = readGuardianId();

  const query = useQuery({
    queryKey: ['wl-family-profile', guardianId, playerId],
    enabled: !!guardianId && !!playerId,
    queryFn: async (): Promise<FamilyProfileMonth[]> => {
      const { data, error } = await supabase.rpc('wl_get_family_profile', {
        p_guardian_id: guardianId!,
        p_player_id: playerId!,
      });
      if (error) return [];
      const rows = (data as FamilyMonthRow[]) || [];

      const months: FamilyProfileMonth[] = rows
        .map(r => {
          const indicators: { name: string; frase: string }[] = [];
          if (r.ind1_name && r.ind1_frase) indicators.push({ name: r.ind1_name, frase: r.ind1_frase });
          if (r.ind2_name && r.ind2_frase) indicators.push({ name: r.ind2_name, frase: r.ind2_frase });
          return {
            season: r.season,
            month_key: r.month_key,
            month_order: r.month_order,
            month_label: MONTH_LABEL_BY_KEY[r.month_key] || r.month_key,
            indicators,
          };
        })
        .filter(m => m.indicators.length > 0)
        // Most recent first: higher season, then higher month_order
        .sort((a, b) => {
          if (a.season !== b.season) return a.season < b.season ? 1 : -1;
          return b.month_order - a.month_order;
        });

      return months;
    },
  });

  return {
    months: query.data || [],
    isLoading: query.isLoading,
    hasData: (query.data || []).length > 0,
  };
}
