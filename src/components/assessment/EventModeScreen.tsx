import { useState, useCallback, useEffect } from 'react';
import { X, ChevronRight, Save, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { useEventPlayers } from '@/hooks/useEvaluationEvents';
import { useEvaluationRubrics } from '@/hooks/useEvaluationRubrics';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { WLA_STATS, type StatKey } from '@/types/evaluations';
import { calculateAgeGroup } from '@/lib/evaluation-utils';
import type { EvaluationEvent } from '@/types/assessment';
import { useToast } from '@/hooks/use-toast';

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

interface EventModeScreenProps {
  event: EvaluationEvent;
  onExit: () => void;
}

export function EventModeScreen({ event, onExit }: EventModeScreenProps) {
  const { organization } = useAuth();
  const { toast } = useToast();
  const { getRubric } = useEvaluationRubrics();
  const { pendingPlayers, markPlayerCompleted } = useEventPlayers(event.id);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scores, setScores] = useState<Record<StatKey, number>>({} as Record<StatKey, number>);
  const [isSaving, setIsSaving] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const currentPlayer = pendingPlayers[0]; // always take first pending

  // Initialize scores when player changes
  useEffect(() => {
    if (currentPlayer) {
      const initial = {} as Record<StatKey, number>;
      WLA_STATS.forEach(s => { initial[s.key] = 10; });
      setScores(initial);
    } else if (pendingPlayers.length === 0) {
      setIsComplete(true);
    }
  }, [currentPlayer?.id, pendingPlayers.length]);

  // Try fullscreen
  useEffect(() => {
    try {
      document.documentElement.requestFullscreen?.();
    } catch {}
    return () => {
      try { document.exitFullscreen?.(); } catch {}
    };
  }, []);

  const handleSaveAndNext = useCallback(async () => {
    if (!currentPlayer || !organization?.id || isSaving) return;
    setIsSaving(true);

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const ageGroup = calculateAgeGroup(currentPlayer.player?.date_of_birth || null);

      // Upsert evaluation
      const { data: evalData, error: evalError } = await supabase
        .from('evaluations')
        .upsert(
          {
            organization_id: organization.id,
            category_id: organization.id, // placeholder for external (no real category)
            player_id: currentPlayer.player_id,
            period: new Date().toISOString().slice(0, 7),
            age_group: ageGroup,
            status: 'open',
            event_id: event.id,
            recorded_by: userId,
          },
          { onConflict: 'organization_id,player_id,period' }
        )
        .select('id')
        .single();

      if (evalError) throw evalError;

      // Upsert scores
      const scoreRows = Object.entries(scores).map(([stat_key, score]) => ({
        evaluation_id: evalData.id,
        stat_key,
        score: Math.round(Math.min(20, Math.max(0, score))),
      }));

      const { error: scoresError } = await supabase
        .from('evaluation_scores')
        .upsert(scoreRows, { onConflict: 'evaluation_id,stat_key' });

      if (scoresError) throw scoresError;

      // Mark player as completed
      await markPlayerCompleted.mutateAsync(currentPlayer.id);

      setCurrentIndex(prev => prev + 1);
    } catch (error: any) {
      toast({ title: 'Error al guardar', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }, [currentPlayer, organization, scores, event.id, isSaving, markPlayerCompleted, toast]);

  const handleExit = () => {
    try { document.exitFullscreen?.(); } catch {}
    onExit();
  };

  // Event Complete Screen
  if (isComplete || (!currentPlayer && pendingPlayers.length === 0)) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center gap-6">
        <CheckCircle2 className="h-20 w-20 text-primary" />
        <h1 className="text-3xl font-bold">¡Evento Completo!</h1>
        <p className="text-muted-foreground text-lg">Todos los jugadores han sido evaluados.</p>
        <Button onClick={handleExit} size="lg" className="mt-4">
          Salir del modo evento
        </Button>
      </div>
    );
  }

  if (!currentPlayer) return null;

  const ageGroup = calculateAgeGroup(currentPlayer.player?.date_of_birth || null);

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {/* Minimal Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-medium text-muted-foreground">{event.title}</h1>
          <Badge variant="secondary" className="text-xs">
            {pendingPlayers.length} pendientes
          </Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={handleExit} className="gap-1.5">
          <X className="h-4 w-4" /> Salir
        </Button>
      </header>

      {/* Player Info */}
      <div className="px-4 py-4 bg-muted/30 border-b shrink-0">
        <h2 className="text-2xl font-bold">{currentPlayer.player?.full_name}</h2>
        <Badge variant="outline" className="mt-1">{ageGroup}</Badge>
      </div>

      {/* Sliders */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <TooltipProvider delayDuration={200}>
          <div className="space-y-6 max-w-lg mx-auto">
            {WLA_STATS.map(stat => {
              const score = scores[stat.key] ?? 10;
              const bullets = getRubric(ageGroup, stat.key, score);

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
                      <span className="text-2xl font-bold tabular-nums w-8 text-right">{score}</span>
                      {bullets.length > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex cursor-help">
                              <Info className="w-4 h-4 text-muted-foreground" />
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
                    onValueChange={([v]) => setScores(prev => ({ ...prev, [stat.key]: v }))}
                    min={0}
                    max={20}
                    step={1}
                    className="py-2"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>0</span><span>10</span><span>20</span>
                  </div>
                </div>
              );
            })}
          </div>
        </TooltipProvider>
      </div>

      {/* Sticky Save Button */}
      <div className="shrink-0 p-4 border-t bg-card">
        <Button
          onClick={handleSaveAndNext}
          disabled={isSaving}
          size="lg"
          className="w-full text-lg h-14 gap-2"
        >
          {isSaving ? 'Guardando...' : (
            <>
              Guardar y siguiente <ChevronRight className="h-5 w-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
