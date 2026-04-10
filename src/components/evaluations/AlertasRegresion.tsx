import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

const DIMENSIONS = ['tecnico', 'tactico', 'coordinativo', 'psicologico'] as const;
const DIM_SHORT: Record<string, string> = {
  tecnico: 'TÉC',
  tactico: 'TÁC',
  coordinativo: 'COO',
  psicologico: 'PSI',
};

function scoreToLevel(score: number): 1 | 2 | 3 {
  if (score <= 7) return 1;
  if (score <= 13) return 2;
  return 3;
}

interface Props {
  categoryId: string;
  organizationId: string;
}

export function AlertasRegresion({ categoryId, organizationId }: Props) {
  // Get last 2 closed evaluation events that have players in this category
  const { data: events = [] } = useQuery({
    queryKey: ['regression-events', categoryId, organizationId],
    queryFn: async () => {
      // Get evaluations for this category, grouped by event
      const { data, error } = await supabase
        .from('evaluations')
        .select('event_id, id, player_id, status')
        .eq('organization_id', organizationId)
        .eq('category_id', categoryId)
        .eq('status', 'closed')
        .not('event_id', 'is', null)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Get unique event_ids preserving order
      const seen = new Set<string>();
      const eventIds: string[] = [];
      for (const row of data || []) {
        if (row.event_id && !seen.has(row.event_id)) {
          seen.add(row.event_id);
          eventIds.push(row.event_id);
        }
        if (eventIds.length >= 2) break;
      }
      return eventIds;
    },
    enabled: !!categoryId && !!organizationId,
  });

  // Get scores for the 2 events
  const { data: scoresData } = useQuery({
    queryKey: ['regression-scores', events],
    queryFn: async () => {
      if (events.length < 2) return null;
      const [currentEventId, prevEventId] = events;

      // Get evaluations for both events in this category
      const { data: evals, error: evErr } = await supabase
        .from('evaluations')
        .select('id, player_id, event_id')
        .eq('category_id', categoryId)
        .eq('status', 'closed')
        .in('event_id', [currentEventId, prevEventId]);
      if (evErr) throw evErr;

      const evalIds = (evals || []).map(e => e.id);
      if (evalIds.length === 0) return null;

      const { data: scores, error: scErr } = await supabase
        .from('evaluation_scores')
        .select('evaluation_id, stat_key, score')
        .in('evaluation_id', evalIds);
      if (scErr) throw scErr;

      return { evals: evals || [], scores: scores || [], currentEventId, prevEventId };
    },
    enabled: events.length >= 2,
  });

  const regressions = useMemo(() => {
    if (!scoresData) return { critical: [], simple: [] };

    const { evals, scores, currentEventId, prevEventId } = scoresData;

    // Build maps: playerId -> { dim -> score } per event
    const currentMap = new Map<string, Record<string, number>>();
    const prevMap = new Map<string, Record<string, number>>();
    const playerNames = new Map<string, string>();

    for (const ev of evals) {
      const map = ev.event_id === currentEventId ? currentMap : prevMap;
      if (!map.has(ev.player_id)) map.set(ev.player_id, {});
      const evalScores = scores.filter(s => s.evaluation_id === ev.id);
      for (const s of evalScores) {
        map.get(ev.player_id)![s.stat_key] = s.score;
      }
    }

    type Regression = {
      playerId: string;
      dims: { dim: string; fromLevel: number; toLevel: number }[];
    };

    const critical: Regression[] = [];
    const simple: Regression[] = [];

    // Compare players present in both events
    for (const playerId of currentMap.keys()) {
      if (!prevMap.has(playerId)) continue;

      const curr = currentMap.get(playerId)!;
      const prev = prevMap.get(playerId)!;
      const regDims: Regression['dims'] = [];

      for (const dim of DIMENSIONS) {
        const cScore = curr[dim];
        const pScore = prev[dim];
        if (cScore === undefined || pScore === undefined) continue;
        const cLevel = scoreToLevel(cScore);
        const pLevel = scoreToLevel(pScore);
        if (cLevel < pLevel) {
          regDims.push({ dim, fromLevel: pLevel, toLevel: cLevel });
        }
      }

      if (regDims.length >= 2) {
        critical.push({ playerId, dims: regDims });
      } else if (regDims.length === 1) {
        simple.push({ playerId, dims: regDims });
      }
    }

    return { critical, simple };
  }, [scoresData]);

  // Fetch player names for regression players
  const playerIds = useMemo(() => {
    return [...regressions.critical, ...regressions.simple].map(r => r.playerId);
  }, [regressions]);

  const { data: playerNamesMap = {} } = useQuery({
    queryKey: ['regression-player-names', playerIds],
    queryFn: async () => {
      if (playerIds.length === 0) return {};
      const { data, error } = await supabase
        .from('players')
        .select('id, full_name')
        .in('id', playerIds);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const p of data || []) map[p.id] = p.full_name;
      return map;
    },
    enabled: playerIds.length > 0,
  });

  const hasRegressions = regressions.critical.length > 0 || regressions.simple.length > 0;

  if (!hasRegressions) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
        <CheckCircle2 className="w-4 h-4 text-success" />
        <Badge className="bg-success/10 text-success border-success/20">Sin regresiones este mes ✓</Badge>
        <span className="text-sm text-muted-foreground ml-1">
          Todos los jugadores mantienen o mejoran su nivel.
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {regressions.critical.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="font-semibold text-destructive text-sm">⚠ Atención inmediata</span>
          </div>
          {regressions.critical.map(r => (
            <div key={r.playerId} className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{playerNamesMap[r.playerId] || '...'}</span>
                {r.dims.map(d => (
                  <Badge key={d.dim} variant="destructive" className="text-xs">
                    {DIM_SHORT[d.dim]}: N{d.fromLevel}→N{d.toLevel}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Diseñar atención individual al final del rondo (Doc 07 Sec. 8.3)
              </p>
            </div>
          ))}
        </div>
      )}

      {regressions.simple.length > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-warning text-sm">Jugadores con bajada de nivel</span>
          </div>
          {regressions.simple.map(r => (
            <div key={r.playerId} className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{playerNamesMap[r.playerId] || '...'}</span>
                {r.dims.map(d => (
                  <Badge key={d.dim} className="bg-warning/10 text-warning border-warning/20 text-xs">
                    {DIM_SHORT[d.dim]}: N{d.fromLevel}→N{d.toLevel}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Se mantiene activo el indicador el siguiente mes
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
