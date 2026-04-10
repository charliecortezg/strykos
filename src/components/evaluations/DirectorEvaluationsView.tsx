import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEvaluations } from '@/hooks/useEvaluations';
import { useEvaluationWeights } from '@/hooks/useEvaluationWeights';
import { useCategories } from '@/hooks/useCategories';
import { usePlayers } from '@/hooks/usePlayers';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PlayerEvaluationReport } from './PlayerEvaluationReport';
import { WLA_STATS, type StatKey } from '@/types/evaluations';
import { calculateOverall, getCurrentPeriod, formatPeriod, getPreviousPeriod } from '@/lib/evaluation-utils';
import { getCurrentMacroMonth } from '@/config/wl-macrociclo';
import { ClipboardCheck, Lock, TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

/* ── Sub-component: Consistency per category ── */
function ConsistenciaCategoria() {
  const { organization } = useAuth();
  const { categories } = useCategories();
  const { players } = usePlayers();
  const activeCategories = categories.filter(c => c.is_active);
  const macroMonth = getCurrentMacroMonth();
  const orgId = organization?.id;

  // Get current month's evaluation events
  const { data: consistencyData = [] } = useQuery({
    queryKey: ['consistency-data', orgId, macroMonth?.month],
    queryFn: async () => {
      if (!orgId) return [];

      // Get the current month date range
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

      // Get closed evaluations for this month
      const { data: evals, error } = await supabase
        .from('evaluations')
        .select('id, category_id, player_id, status')
        .eq('organization_id', orgId)
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd + 'T23:59:59');

      if (error) throw error;
      return evals || [];
    },
    enabled: !!orgId,
  });

  // Get regression counts per category
  const { data: regressionCounts = {} } = useQuery({
    queryKey: ['regression-counts', orgId, activeCategories.map(c => c.id).join(',')],
    queryFn: async () => {
      if (!orgId || activeCategories.length === 0) return {};

      const counts: Record<string, number> = {};

      for (const cat of activeCategories) {
        // Get last 2 closed events with evals in this category
        const { data: evals } = await supabase
          .from('evaluations')
          .select('event_id, id, player_id')
          .eq('organization_id', orgId)
          .eq('category_id', cat.id)
          .eq('status', 'closed')
          .not('event_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(50);

        const seen = new Set<string>();
        const eventIds: string[] = [];
        for (const row of evals || []) {
          if (row.event_id && !seen.has(row.event_id)) {
            seen.add(row.event_id);
            eventIds.push(row.event_id);
          }
          if (eventIds.length >= 2) break;
        }

        if (eventIds.length < 2) {
          counts[cat.id] = 0;
          continue;
        }

        // Get scores for both events
        const evalsInScope = (evals || []).filter(e => e.event_id && eventIds.includes(e.event_id));
        const evalIds = evalsInScope.map(e => e.id);

        const { data: scores } = await supabase
          .from('evaluation_scores')
          .select('evaluation_id, stat_key, score')
          .in('evaluation_id', evalIds);

        // Build per-player score maps per event
        const currentMap = new Map<string, Record<string, number>>();
        const prevMap = new Map<string, Record<string, number>>();

        for (const ev of evalsInScope) {
          const map = ev.event_id === eventIds[0] ? currentMap : prevMap;
          if (!map.has(ev.player_id)) map.set(ev.player_id, {});
          const evScores = (scores || []).filter(s => s.evaluation_id === ev.id);
          for (const s of evScores) map.get(ev.player_id)![s.stat_key] = s.score;
        }

        let regCount = 0;
        for (const pid of currentMap.keys()) {
          if (!prevMap.has(pid)) continue;
          const curr = currentMap.get(pid)!;
          const prev = prevMap.get(pid)!;
          for (const dim of ['tecnico', 'tactico', 'coordinativo', 'psicologico']) {
            const cL = curr[dim] !== undefined ? (curr[dim] <= 7 ? 1 : curr[dim] <= 13 ? 2 : 3) : null;
            const pL = prev[dim] !== undefined ? (prev[dim] <= 7 ? 1 : prev[dim] <= 13 ? 2 : 3) : null;
            if (cL !== null && pL !== null && cL < pL) regCount++;
          }
        }
        counts[cat.id] = regCount;
      }

      return counts;
    },
    enabled: !!orgId && activeCategories.length > 0,
  });

  const rows = useMemo(() => {
    return activeCategories.map(cat => {
      const catPlayers = players.filter(p => p.category_id === cat.id && p.is_active);
      const total = catPlayers.length;
      const evaluated = new Set(
        consistencyData.filter(e => e.category_id === cat.id).map(e => e.player_id)
      ).size;
      const pct = total > 0 ? Math.round((evaluated / total) * 100) : 0;
      const regressions = regressionCounts[cat.id] || 0;

      return { cat, total, evaluated, pct, regressions };
    });
  }, [activeCategories, players, consistencyData, regressionCounts]);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Consistencia del sistema</h3>
        {macroMonth && (
          <Badge variant="outline" className="text-xs">{macroMonth.label}</Badge>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map(row => (
          <div key={row.cat.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{row.cat.name}</span>
              <div className="flex items-center gap-1.5">
                {row.regressions > 0 && (
                  <Badge variant="destructive" className="text-xs">{row.regressions} regresiones</Badge>
                )}
                <Badge variant="outline" className={`text-xs ${
                  row.pct >= 80 ? 'bg-success/10 text-success border-success/20' :
                  row.pct >= 50 ? 'bg-warning/10 text-warning border-warning/20' :
                  'bg-destructive/10 text-destructive border-destructive/20'
                }`}>
                  {row.pct >= 80 ? 'Consistente' : row.pct >= 50 ? 'En progreso' : 'Necesita atención'}
                </Badge>
              </div>
            </div>
            <Progress value={row.pct} className="h-2" indicatorClassName={
              row.pct >= 80 ? 'bg-success' : row.pct >= 50 ? 'bg-warning' : 'bg-destructive'
            } />
            <p className="text-xs text-muted-foreground">{row.evaluated}/{row.total} jugadores evaluados este mes</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main component ── */
export function DirectorEvaluationsView() {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [period, setPeriod] = useState(getCurrentPeriod());
  const [reportPlayerId, setReportPlayerId] = useState<string | null>(null);

  const { categories } = useCategories();
  const { players } = usePlayers();
  const { getAllWeightsMap } = useEvaluationWeights();
  const activeCategories = categories.filter(c => c.is_active);

  // Auto-select first category
  if (!selectedCategory && activeCategories.length > 0) {
    setSelectedCategory(activeCategories[0].id);
  }

  const { evaluations, allScores, allAchievements, allComments, isLoading, closeEvaluations, addComment } =
    useEvaluations(selectedCategory, period);

  // Previous period evaluations for delta display
  const prevPeriod = getPreviousPeriod(period);
  const { evaluations: prevEvals, allScores: prevAllScores } = useEvaluations(selectedCategory, prevPeriod);

  const categoryPlayers = useMemo(() =>
    players.filter(p => p.category_id === selectedCategory && p.is_active),
    [players, selectedCategory]
  );

  // Build summary rows
  const summaryRows = useMemo(() => {
    const weightsMap = getAllWeightsMap();
    return categoryPlayers.map(player => {
      const evalRecord = evaluations.find(e => e.player_id === player.id);
      const evalScores = evalRecord ? allScores.filter(s => s.evaluation_id === evalRecord.id) : [];
      const scoresMap = {} as Record<StatKey, number>;
      evalScores.forEach(s => { scoresMap[s.stat_key as StatKey] = s.score; });

      const selectedCat = activeCategories.find(c => c.id === selectedCategory);
      const ageGroup = selectedCat?.age_group || '8-9';
      const overall = evalScores.length >= 4
        ? calculateOverall(scoresMap, ageGroup, { weights: weightsMap[ageGroup] } as any)
        : null;

      // Previous month
      const prevEval = prevEvals.find(e => e.player_id === player.id);
      const prevScoresArr = prevEval ? prevAllScores.filter(s => s.evaluation_id === prevEval.id) : [];
      const prevScoresMap = {} as Record<StatKey, number>;
      prevScoresArr.forEach(s => { prevScoresMap[s.stat_key as StatKey] = s.score; });
      const prevOverall = prevScoresArr.length >= 4
        ? calculateOverall(prevScoresMap, ageGroup, { weights: weightsMap[ageGroup] } as any)
        : null;

      const achievements = evalRecord
        ? allAchievements.filter(a => a.evaluation_id === evalRecord.id)
        : [];

      return {
        player,
        evalRecord,
        scoresMap,
        prevScoresMap: prevScoresArr.length > 0 ? prevScoresMap : null,
        overall,
        prevOverall,
        ageGroup,
        isComplete: evalScores.length >= 4,
        isClosed: evalRecord?.status === 'closed',
        achievements,
      };
    });
  }, [categoryPlayers, evaluations, allScores, prevEvals, prevAllScores, allAchievements, getAllWeightsMap]);

  const completedCount = summaryRows.filter(r => r.isComplete).length;
  const closedCount = summaryRows.filter(r => r.isClosed).length;
  const allClosed = closedCount === summaryRows.length && summaryRows.length > 0;

  const handleClose = async () => {
    await closeEvaluations.mutateAsync(getAllWeightsMap());
  };

  const reportRow = summaryRows.find(r => r.player.id === reportPlayerId);

  // Period options
  const periodOptions = useMemo(() => {
    const opts: string[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      opts.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return opts;
  }, []);

  // Helper to render level badges for a player's scores
  const renderLevelBadges = (scoresMap: Record<StatKey, number>) => {
    const dims = ['tecnico', 'tactico', 'coordinativo', 'psicologico'] as const;
    const shortLabels: Record<string, string> = { tecnico: 'TÉC', tactico: 'TÁC', coordinativo: 'COO', psicologico: 'PSI' };
    return dims.map(dim => {
      const score = scoresMap[dim];
      if (score === undefined) {
        return <Badge key={dim} variant="outline" className="text-[10px] px-1 py-0 bg-muted/30 text-muted-foreground">—</Badge>;
      }
      const level = score <= 7 ? 1 : score <= 13 ? 2 : 3;
      const cls = level === 1 ? 'bg-destructive/10 text-destructive border-destructive/20'
        : level === 2 ? 'bg-warning/10 text-warning border-warning/20'
        : 'bg-success/10 text-success border-success/20';
      return <Badge key={dim} variant="outline" className={`text-[10px] px-1 py-0 ${cls}`}>{shortLabels[dim]} N{level}</Badge>;
    });
  };

  return (
    <div className="space-y-4">
      {/* Consistency Section */}
      <ConsistenciaCategoria />

      <div className="flex items-center gap-2">
        <ClipboardCheck className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-display font-semibold">Evaluaciones WLA</h2>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            {activeCategories.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {periodOptions.map(p => (
              <SelectItem key={p} value={p}>{formatPeriod(p)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Badge variant="outline">{completedCount}/{summaryRows.length} evaluados</Badge>

        {allClosed && <Badge className="bg-success/10 text-success border-success/20">Cerrado</Badge>}
      </div>

      {/* Close button */}
      {completedCount > 0 && !allClosed && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button className="gap-1.5">
              <Lock className="w-4 h-4" />
              Cerrar evaluación del mes ({completedCount} de {summaryRows.length})
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Cerrar evaluaciones de {formatPeriod(period)}? ({completedCount} de {summaryRows.length} jugadores)</AlertDialogTitle>
              <AlertDialogDescription>
                Se cerrarán las {completedCount} evaluaciones completas. Los jugadores pendientes quedarán sin evaluar este mes. Se calcularán overalls ponderados, deltas, badges y XP. Las evaluaciones cerradas no podrán editarse.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleClose} disabled={closeEvaluations.isPending}>
                {closeEvaluations.isPending ? 'Cerrando...' : 'Confirmar cierre'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Summary table */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : summaryRows.length === 0 ? (
        <div className="stryk-card p-8 text-center">
          <p className="text-muted-foreground">Selecciona una categoría.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-2">Jugador</th>
                <th className="p-2 text-center">Niveles</th>
                <th className="p-2 text-center">Overall</th>
                <th className="p-2 text-center">Delta</th>
                <th className="p-2 text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.map(row => {
                const delta = row.overall != null && row.prevOverall != null
                  ? row.overall - row.prevOverall
                  : null;
                const hasAllFour = ['tecnico', 'tactico', 'coordinativo', 'psicologico'].every(d => row.scoresMap[d] !== undefined);

                return (
                  <tr
                    key={row.player.id}
                    onClick={() => setReportPlayerId(row.player.id)}
                    className="border-b hover:bg-accent/50 cursor-pointer transition-colors"
                  >
                    <td className="p-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{row.player.full_name}</span>
                        {hasAllFour && (
                          <Badge className="bg-success/10 text-success border-success/20 text-[10px] px-1 py-0">✓</Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center justify-center gap-0.5">
                        {renderLevelBadges(row.scoresMap)}
                      </div>
                    </td>
                    <td className="p-2 text-center font-bold tabular-nums">
                      {row.overall != null ? row.overall : '—'}
                    </td>
                    <td className="p-2 text-center">
                      {delta != null ? (
                        <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                          delta > 0 ? 'text-success' : delta < 0 ? 'text-destructive' : 'text-muted-foreground'
                        }`}>
                          {delta > 0 ? <TrendingUp className="w-3 h-3" /> : delta < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                          {delta > 0 ? '+' : ''}{delta}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="p-2 text-center">
                      <Badge variant="outline" className={`text-xs ${
                        row.isClosed ? 'bg-success/10 text-success border-success/20' :
                        row.isComplete ? 'bg-blue-500/10 text-blue-700 border-blue-200' :
                        'bg-warning/10 text-warning border-warning/20'
                      }`}>
                        {row.isClosed ? 'Cerrado' : row.isComplete ? 'Completo' : 'Pendiente'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Player Report Sheet */}
      <Sheet open={!!reportPlayerId} onOpenChange={(open) => !open && setReportPlayerId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          {reportRow && (
            <PlayerEvaluationReport
              playerName={reportRow.player.full_name}
              ageGroup={reportRow.ageGroup}
              scores={reportRow.scoresMap}
              previousScores={reportRow.prevScoresMap}
              overall={reportRow.overall}
              previousOverall={reportRow.prevOverall}
              achievements={reportRow.achievements}
              comments={reportRow.evalRecord ? allComments.filter(c => c.evaluation_id === reportRow.evalRecord!.id) : []}
              evaluationId={reportRow.evalRecord?.id || null}
              onAddComment={async (comment) => {
                if (reportRow.evalRecord) {
                  await addComment.mutateAsync({ evaluationId: reportRow.evalRecord.id, comment });
                }
              }}
              period={period}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
