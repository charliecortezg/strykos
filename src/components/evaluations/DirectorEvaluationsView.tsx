import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEvaluations } from '@/hooks/useEvaluations';
import { useEvaluationWeights } from '@/hooks/useEvaluationWeights';
import { useCategories } from '@/hooks/useCategories';
import { usePlayers } from '@/hooks/usePlayers';
import { PlayerEvaluationReport } from './PlayerEvaluationReport';
import { WLA_STATS, type StatKey } from '@/types/evaluations';
import { calculateOverall, getCurrentPeriod, formatPeriod, getPreviousPeriod } from '@/lib/evaluation-utils';
import { ClipboardCheck, Lock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
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
      const overall = evalScores.length >= 6
        ? calculateOverall(scoresMap, ageGroup, { weights: weightsMap[ageGroup] } as any)
        : null;

      // Previous month
      const prevEval = prevEvals.find(e => e.player_id === player.id);
      const prevScoresArr = prevEval ? prevAllScores.filter(s => s.evaluation_id === prevEval.id) : [];
      const prevScoresMap = {} as Record<StatKey, number>;
      prevScoresArr.forEach(s => { prevScoresMap[s.stat_key as StatKey] = s.score; });
      const prevOverall = prevScoresArr.length >= 6
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
        isComplete: evalScores.length >= 6,
        isClosed: evalRecord?.status === 'closed',
        achievements,
      };
    });
  }, [categoryPlayers, evaluations, allScores, prevEvals, prevAllScores, allAchievements, getAllWeightsMap]);

  const completedCount = summaryRows.filter(r => r.isComplete).length;
  const closedCount = summaryRows.filter(r => r.isClosed).length;
  const allComplete = completedCount === summaryRows.length && summaryRows.length > 0;
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

  return (
    <div className="space-y-4">
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
                <th className="p-2 text-center">Grupo</th>
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

                return (
                  <tr
                    key={row.player.id}
                    onClick={() => setReportPlayerId(row.player.id)}
                    className="border-b hover:bg-accent/50 cursor-pointer transition-colors"
                  >
                    <td className="p-2 font-medium">{row.player.full_name}</td>
                    <td className="p-2 text-center">
                      <Badge variant="outline" className="text-xs">{row.ageGroup}</Badge>
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
