import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const PORTAL_SESSION_KEY = 'stryk_portal_session';

export interface HistoryMatch {
  date: string;
  rival: string | null;
  type: string | null;
  played: boolean;
  score_for?: number | null;
  score_against?: number | null;
  goals?: number;
  assists?: number;
}

export interface PlayerHistory {
  show_stats: boolean;
  training: { presente: number; justificado: number; ausente: number; total: number };
  totals: { matches_played: number; goals: number; assists: number } | null;
  matches: HistoryMatch[];
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

export function useWLPlayerHistory(playerId: string | null | undefined) {
  const guardianId = readGuardianId();

  const query = useQuery({
    queryKey: ['wl-player-history', guardianId, playerId],
    enabled: !!guardianId && !!playerId,
    queryFn: async (): Promise<PlayerHistory | null> => {
      const { data, error } = await supabase.rpc('wl_get_player_history', {
        p_guardian_id: guardianId!,
        p_player_id: playerId!,
      });
      if (error) return null;
      return (data as unknown as PlayerHistory) || null;
    },
  });

  const h = query.data;
  const hasData = !!h && (h.training.total > 0 || h.matches.length > 0);

  return {
    history: h,
    isLoading: query.isLoading,
    hasData,
  };
}
