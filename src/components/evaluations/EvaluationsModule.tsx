import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEvaluations } from '@/hooks/useEvaluations';
import { usePlayers } from '@/hooks/usePlayers';
import { PlayerEvaluationSheet } from './PlayerEvaluationSheet';
import { WLA_STATS, type StatKey, type PlayerEvaluationStatus } from '@/types/evaluations';
import { getCurrentPeriod, formatPeriod } from '@/lib/evaluation-utils';
import { ClipboardCheck, CheckCircle2, Clock } from 'lucide-react';

interface EvaluationsModuleProps {
  categories: { id: string; name: string; age_group?: string }[];
}

export function EvaluationsModule({ categories }: EvaluationsModuleProps) {
  const [selectedCategory, setSelectedCategory] = useState(categories[0]?.id || '');
  const selectedCategoryObj = categories.find(c => c.id === selectedCategory);
  const categoryAgeGroup = selectedCategoryObj?.age_group || '8-9';
  const [period, setPeriod] = useState(getCurrentPeriod());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedPlayerIdx, setSelectedPlayerIdx] = useState(0);

  const { evaluations, allScores, isLoading, saveEvaluation } = useEvaluations(selectedCategory, period);
  const { players } = usePlayers();

  // Players in selected category
  const categoryPlayers = useMemo(() =>
    players.filter(p => p.category_id === selectedCategory && p.is_active),
    [players, selectedCategory]
  );

  // Build status list
  const playerStatuses: PlayerEvaluationStatus[] = useMemo(() =>
    categoryPlayers.map(p => {
      const evalRecord = evaluations.find(e => e.player_id === p.id);
      const evalScores = evalRecord ? allScores.filter(s => s.evaluation_id === evalRecord.id) : [];
      const scoresMap = {} as Record<StatKey, number>;
      evalScores.forEach(s => { scoresMap[s.stat_key as StatKey] = s.score; });

      return {
        player_id: p.id,
        player_name: p.full_name,
        date_of_birth: p.date_of_birth,
        age_group: categoryAgeGroup,
        evaluation_id: evalRecord?.id || null,
        scores_count: evalScores.length,
        status: evalScores.length >= 4 ? 'completado' : 'pendiente',
        scores: scoresMap,
      };
    }),
    [categoryPlayers, evaluations, allScores]
  );

  const completedCount = playerStatuses.filter(p => p.status === 'completado').length;
  const pendingPlayers = playerStatuses.filter(p => p.status === 'pendiente');

  const handleOpenPlayer = (idx: number) => {
    setSelectedPlayerIdx(idx);
    setSheetOpen(true);
  };

  const handleSave = async (playerId: string, scores: Record<StatKey, number>) => {
    const player = categoryPlayers.find(p => p.id === playerId);
    await saveEvaluation.mutateAsync({
      playerId,
      scores,
      dateOfBirth: player?.date_of_birth || null,
      categoryAgeGroup,
    });
  };

  const handleNext = () => {
    // Find next pending player
    const currentPlayer = playerStatuses[selectedPlayerIdx];
    const nextPendingIdx = playerStatuses.findIndex(
      (p, i) => i > selectedPlayerIdx && p.status === 'pendiente'
    );
    if (nextPendingIdx >= 0) {
      setSelectedPlayerIdx(nextPendingIdx);
    } else {
      // Wrap around
      const firstPending = playerStatuses.findIndex(p => p.status === 'pendiente' && p.player_id !== currentPlayer?.player_id);
      if (firstPending >= 0) setSelectedPlayerIdx(firstPending);
      else setSheetOpen(false);
    }
  };

  // Period options (last 6 months)
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
      <div className="flex flex-wrap gap-2">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(c => (
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

        <Badge variant="outline" className="self-center">
          {completedCount}/{playerStatuses.length} evaluados
        </Badge>
      </div>

      {/* Player list */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : categoryPlayers.length === 0 ? (
        <div className="stryk-card p-8 text-center">
          <p className="text-muted-foreground">No hay jugadores en esta categoría.</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {playerStatuses.map((ps, idx) => (
            <button
              key={ps.player_id}
              onClick={() => handleOpenPlayer(idx)}
              className="flex items-center justify-between p-3 bg-card border border-border rounded-lg hover:bg-accent/50 transition-colors text-left w-full"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{ps.player_name}</p>
                <p className="text-xs text-muted-foreground">
                  Grupo: {ps.age_group}
                  {ps.scores_count > 0 && ` • ${ps.scores_count}/6 stats`}
                </p>
              </div>
              <Badge
                variant="outline"
                className={`ml-2 text-xs shrink-0 gap-1 ${
                  ps.status === 'completado'
                    ? 'bg-success/10 text-success border-success/20'
                    : 'bg-warning/10 text-warning border-warning/20'
                }`}
              >
                {ps.status === 'completado' ? (
                  <><CheckCircle2 className="w-3 h-3" /> Listo</>
                ) : (
                  <><Clock className="w-3 h-3" /> Pendiente</>
                )}
              </Badge>
            </button>
          ))}
        </div>
      )}

      {/* Evaluation Sheet */}
      <PlayerEvaluationSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        player={playerStatuses[selectedPlayerIdx] || null}
        onSave={handleSave}
        onNext={handleNext}
        hasNext={pendingPlayers.length > 1 || (pendingPlayers.length === 1 && playerStatuses[selectedPlayerIdx]?.status === 'completado')}
        isSaving={saveEvaluation.isPending}
      />
    </div>
  );
}
