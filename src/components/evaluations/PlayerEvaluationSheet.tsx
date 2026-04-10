import { useState, useCallback, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { WLA_STATS, type StatKey, type PlayerEvaluationStatus } from '@/types/evaluations';
import { useEvaluationRubrics } from '@/hooks/useEvaluationRubrics';
import { ChevronRight, ChevronLeft, Save, MessageSquarePlus } from 'lucide-react';

interface PlayerEvaluationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: PlayerEvaluationStatus | null;
  onSave: (playerId: string, scores: Record<StatKey, number>) => Promise<void>;
  onNext: () => void;
  hasNext: boolean;
  isSaving: boolean;
}

const DIMENSIONS = WLA_STATS; // 4 WL dimensions

const PILLAR_COLORS: Record<string, { badge: string; border: string }> = {
  tecnico: { badge: 'bg-blue-500/10 text-blue-700 border-blue-200', border: 'border-blue-400' },
  tactico: { badge: 'bg-purple-500/10 text-purple-700 border-purple-200', border: 'border-purple-400' },
  coordinativo: { badge: 'bg-teal-500/10 text-teal-700 border-teal-200', border: 'border-teal-400' },
  psicologico: { badge: 'bg-amber-500/10 text-amber-700 border-amber-200', border: 'border-amber-400' },
};

const LEVEL_CONFIG = [
  { nivel: 1 as const, label: 'En Proceso', score: 5, bandMin: 0, bandMax: 7, color: 'border-red-400 bg-red-500/5', selectedColor: 'border-red-500 bg-red-500/15 ring-2 ring-red-400/40', dot: 'bg-red-400' },
  { nivel: 2 as const, label: 'En Desarrollo', score: 10, bandMin: 8, bandMax: 13, color: 'border-yellow-400 bg-yellow-500/5', selectedColor: 'border-yellow-500 bg-yellow-500/15 ring-2 ring-yellow-400/40', dot: 'bg-yellow-400' },
  { nivel: 3 as const, label: 'Consolidado', score: 17, bandMin: 14, bandMax: 20, color: 'border-green-400 bg-green-500/5', selectedColor: 'border-green-500 bg-green-500/15 ring-2 ring-green-400/40', dot: 'bg-green-400' },
];

const CONSOLIDATION_THRESHOLDS: Record<string, number> = {
  'sub-5': 50, 'sub-6': 60, 'sub-8': 65,
  'sub-10': 70, 'sub-12': 72, 'sub-13': 75,
};

function scoreToNivel(score: number): 1 | 2 | 3 | null {
  if (score >= 14) return 3;
  if (score >= 8) return 2;
  if (score >= 0) return 1;
  return null;
}

type Observations = Record<string, { nivel: 1 | 2 | 3 | null; nota?: string }>;

export function PlayerEvaluationSheet({
  open, onOpenChange, player, onSave, onNext, hasNext, isSaving,
}: PlayerEvaluationSheetProps) {
  const { rubrics } = useEvaluationRubrics();
  const [currentDimIndex, setCurrentDimIndex] = useState(0);
  const [observations, setObservations] = useState<Observations>({});
  const [showNote, setShowNote] = useState(false);

  // Sync when player changes
  const currentPlayerId = player?.player_id;
  const [lastPlayerId, setLastPlayerId] = useState<string | null>(null);
  if (currentPlayerId && currentPlayerId !== lastPlayerId) {
    setLastPlayerId(currentPlayerId);
    setCurrentDimIndex(0);
    setShowNote(false);
    // Pre-populate from existing scores
    const initial: Observations = {};
    DIMENSIONS.forEach(d => {
      const existingScore = player?.scores[d.key];
      initial[d.key] = {
        nivel: existingScore != null ? scoreToNivel(existingScore) : null,
        nota: undefined,
      };
    });
    setObservations(initial);
  }

  const ageGroup = player?.age_group || 'sub-10';
  const threshold = CONSOLIDATION_THRESHOLDS[ageGroup] ?? 70;

  // Get rubric bullets for a dimension
  const getDimensionRubrics = useCallback((statKey: string) => {
    return rubrics
      .filter(r => r.age_group === ageGroup && r.stat_key === statKey)
      .sort((a, b) => a.band_min - b.band_min);
  }, [rubrics, ageGroup]);

  const hasRubrics = useMemo(() => {
    return DIMENSIONS.some(d =>
      rubrics.some(r => r.age_group === ageGroup && r.stat_key === d.key)
    );
  }, [rubrics, ageGroup]);

  const currentDim = DIMENSIONS[currentDimIndex];
  const dimRubrics = currentDim ? getDimensionRubrics(currentDim.key) : [];
  const currentObs = currentDim ? observations[currentDim.key] : null;

  const completedCount = DIMENSIONS.filter(d => observations[d.key]?.nivel != null).length;

  const handleSelectLevel = (nivel: 1 | 2 | 3) => {
    if (!currentDim) return;
    setObservations(prev => ({
      ...prev,
      [currentDim.key]: {
        ...prev[currentDim.key],
        nivel: prev[currentDim.key]?.nivel === nivel ? null : nivel,
      },
    }));
  };

  const handleNoteChange = (nota: string) => {
    if (!currentDim) return;
    setObservations(prev => ({
      ...prev,
      [currentDim.key]: { ...prev[currentDim.key], nota: nota.slice(0, 100) },
    }));
  };

  const handleNext = () => {
    if (currentDimIndex < 3) {
      setCurrentDimIndex(currentDimIndex + 1);
      setShowNote(false);
    }
  };

  const handlePrev = () => {
    if (currentDimIndex > 0) {
      setCurrentDimIndex(currentDimIndex - 1);
      setShowNote(false);
    }
  };

  const handleSave = useCallback(async () => {
    if (!player) return;
    const scores: Record<StatKey, number> = {} as Record<StatKey, number>;
    DIMENSIONS.forEach(d => {
      const obs = observations[d.key];
      if (obs?.nivel) {
        const levelConfig = LEVEL_CONFIG.find(l => l.nivel === obs.nivel);
        scores[d.key] = levelConfig?.score ?? 0;
      } else {
        scores[d.key] = 0;
      }
    });
    await onSave(player.player_id, scores);
    if (hasNext) onNext();
  }, [player, observations, onSave, hasNext, onNext]);

  const handleSaveEmpty = useCallback(async () => {
    if (!player) return;
    const scores: Record<StatKey, number> = {} as Record<StatKey, number>;
    DIMENSIONS.forEach(d => { scores[d.key] = 0; });
    await onSave(player.player_id, scores);
    if (hasNext) onNext();
  }, [player, onSave, hasNext, onNext]);

  if (!player) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-3">
          <SheetTitle className="flex items-center gap-2">
            {player.player_name}
            <Badge variant="outline" className="text-xs">{ageGroup}</Badge>
          </SheetTitle>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {completedCount} de {DIMENSIONS.length} dimensiones
            </span>
            <div className="flex gap-1.5">
              {DIMENSIONS.map((d, i) => (
                <button
                  key={d.key}
                  onClick={() => { setCurrentDimIndex(i); setShowNote(false); }}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    i === currentDimIndex
                      ? 'bg-[#C9A227] scale-125'
                      : observations[d.key]?.nivel != null
                        ? 'bg-primary/60'
                        : 'bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
          </div>
        </SheetHeader>

        {!hasRubrics ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
            <p className="text-muted-foreground">
              No hay rúbricas configuradas para esta categoría ({ageGroup}).
            </p>
            <Button onClick={handleSaveEmpty} disabled={isSaving} variant="outline">
              Guardar igual
            </Button>
          </div>
        ) : currentDim ? (
          <div className="space-y-4 mt-2">
            {/* Dimension header */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-xs px-2 py-0.5 ${PILLAR_COLORS[currentDim.pillar]?.badge || ''}`}>
                {currentDim.shortLabel}
              </Badge>
              <h3 className="text-lg font-semibold">{currentDim.label}</h3>
            </div>

            <p className="text-xs text-muted-foreground">{currentDim.description}</p>

            {/* Level cards */}
            <div className="space-y-3">
              {LEVEL_CONFIG.map(level => {
                const rubric = dimRubrics.find(r => r.band_min === level.bandMin);
                const bullets: string[] = (rubric?.bullets as string[]) || [];
                const isSelected = currentObs?.nivel === level.nivel;

                return (
                  <button
                    key={level.nivel}
                    onClick={() => handleSelectLevel(level.nivel)}
                    className={`w-full text-left rounded-lg border-2 p-3 transition-all ${
                      isSelected ? level.selectedColor : level.color
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${level.dot}`} />
                        <span className="text-sm font-semibold">
                          Nivel {level.nivel} — {level.label}
                        </span>
                      </div>
                      {level.nivel === 3 && (
                        <Badge variant="outline" className="text-[10px] border-green-300 text-green-600">
                          Umbral: {threshold}%
                        </Badge>
                      )}
                    </div>
                    {bullets.length > 0 ? (
                      <ul className="space-y-1 ml-4">
                        {bullets.map((b, i) => (
                          <li key={i} className="text-xs text-muted-foreground leading-relaxed">
                            • {b}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground/50 ml-4 italic">
                        Sin criterios definidos
                      </p>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Note */}
            {showNote ? (
              <div className="space-y-1">
                <Input
                  value={currentObs?.nota || ''}
                  onChange={e => handleNoteChange(e.target.value)}
                  placeholder="Nota de observación..."
                  maxLength={100}
                  className="text-sm"
                />
                <span className="text-[10px] text-muted-foreground">
                  {(currentObs?.nota || '').length}/100
                </span>
              </div>
            ) : (
              <button
                onClick={() => setShowNote(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageSquarePlus className="w-3.5 h-3.5" />
                Agregar nota
              </button>
            )}
          </div>
        ) : null}

        {/* Footer navigation */}
        {hasRubrics && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t gap-2">
            {currentDimIndex > 0 ? (
              <Button variant="outline" size="sm" onClick={handlePrev} className="gap-1">
                <ChevronLeft className="w-4 h-4" /> Anterior
              </Button>
            ) : (
              <div />
            )}

            <button
              onClick={handleNext}
              className="text-[11px] text-muted-foreground hover:text-foreground"
              style={{ display: currentDimIndex < 3 ? undefined : 'none' }}
            >
              Saltar dimensión
            </button>

            {currentDimIndex < 3 ? (
              <Button size="sm" onClick={handleNext} className="gap-1">
                Siguiente <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="gap-1.5 bg-[#C9A227] hover:bg-[#B08D1F] text-black"
              >
                <Save className="w-4 h-4" /> Guardar evaluación
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
