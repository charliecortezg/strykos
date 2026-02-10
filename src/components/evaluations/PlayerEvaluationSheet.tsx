import { useState, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WLA_STATS, type StatKey, type PlayerEvaluationStatus } from '@/types/evaluations';
import { useEvaluationRubrics } from '@/hooks/useEvaluationRubrics';
import { Info, ChevronRight, Save } from 'lucide-react';

interface PlayerEvaluationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: PlayerEvaluationStatus | null;
  onSave: (playerId: string, scores: Record<StatKey, number>) => Promise<void>;
  onNext: () => void;
  hasNext: boolean;
  isSaving: boolean;
}

const GROUP_COLORS: Record<string, string> = {
  mentalidad: 'bg-blue-500/10 text-blue-700 border-blue-200',
  tecnica: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  juego: 'bg-amber-500/10 text-amber-700 border-amber-200',
};

const GROUP_LABELS: Record<string, string> = {
  mentalidad: 'Mentalidad',
  tecnica: 'Técnica',
  juego: 'Juego',
};

export function PlayerEvaluationSheet({
  open, onOpenChange, player, onSave, onNext, hasNext, isSaving,
}: PlayerEvaluationSheetProps) {
  const { getRubric } = useEvaluationRubrics();
  const [localScores, setLocalScores] = useState<Record<StatKey, number>>({} as Record<StatKey, number>);

  // Sync when player changes
  const currentPlayerId = player?.player_id;
  const [lastPlayerId, setLastPlayerId] = useState<string | null>(null);
  if (currentPlayerId && currentPlayerId !== lastPlayerId) {
    setLastPlayerId(currentPlayerId);
    const initial = {} as Record<StatKey, number>;
    WLA_STATS.forEach(s => { initial[s.key] = player?.scores[s.key] ?? 10; });
    setLocalScores(initial);
  }

  const handleSave = useCallback(async () => {
    if (!player) return;
    await onSave(player.player_id, localScores);
    if (hasNext) onNext();
  }, [player, localScores, onSave, hasNext, onNext]);

  if (!player) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            {player.player_name}
            <Badge variant="outline" className="text-xs">{player.age_group}</Badge>
          </SheetTitle>
        </SheetHeader>

        <TooltipProvider delayDuration={200}>
          <div className="space-y-5">
            {WLA_STATS.map((stat) => {
              const score = localScores[stat.key] ?? 10;
              const bullets = getRubric(player.age_group, stat.key, score);

              return (
                <div key={stat.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${GROUP_COLORS[stat.group]}`}>
                        {GROUP_LABELS[stat.group]}
                      </Badge>
                      <span className="text-sm font-medium">{stat.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg font-bold tabular-nums w-7 text-right">{score}</span>
                      {bullets.length > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex cursor-help">
                              <Info className="w-3.5 h-3.5 text-muted-foreground" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-[240px]">
                            <ul className="text-xs space-y-0.5">
                              {bullets.map((b, i) => <li key={i}>• {b}</li>)}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                  <Slider
                    value={[score]}
                    onValueChange={([v]) => setLocalScores(prev => ({ ...prev, [stat.key]: v }))}
                    min={0}
                    max={20}
                    step={1}
                    className="py-1"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>0</span>
                    <span>10</span>
                    <span>20</span>
                  </div>
                </div>
              );
            })}
          </div>
        </TooltipProvider>

        <div className="flex gap-2 mt-6 pt-4 border-t">
          <Button onClick={handleSave} disabled={isSaving} className="flex-1 gap-1.5">
            {hasNext ? (
              <>
                Guardar y siguiente <ChevronRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Guardar
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
