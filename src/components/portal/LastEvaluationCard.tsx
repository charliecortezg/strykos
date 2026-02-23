import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { WLARadarChart } from '@/components/evaluations/WLARadarChart';
import { usePlayerLastEvaluation } from '@/hooks/usePortal/usePlayerLastEvaluation';
import { usePlayerEvaluationHistory } from '@/hooks/usePortal/usePlayerEvaluationHistory';
import { WLA_STATS } from '@/types/evaluations';
import { getLevelLabel } from '@/types/idp';
import { TrendingUp, TrendingDown, Minus, MessageSquare, BookOpen, ChevronDown, ChevronUp, History } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';

interface Props {
  playerId: string;
}

export function LastEvaluationCard({ playerId }: Props) {
  const { lastEvaluation, isLoading } = usePlayerLastEvaluation(playerId);
  const { evaluations: allEvaluations, isLoading: historyLoading } = usePlayerEvaluationHistory(playerId);
  const [historyOpen, setHistoryOpen] = useState(false);

  if (isLoading) return <div className="h-40 bg-muted animate-pulse rounded-lg" />;
  if (!lastEvaluation) return (
    <Card>
      <CardContent className="py-8 text-center text-muted-foreground text-sm">
        Aún no hay evaluaciones cerradas para este jugador.
      </CardContent>
    </Card>
  );

  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const formatPeriod = (period: string) => {
    const [year, month] = period.split('-');
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  const periodLabel = formatPeriod(lastEvaluation.period);
  const overall = lastEvaluation.overall_score;
  const prev = lastEvaluation.previous_overall;
  const delta = overall != null && prev != null ? overall - prev : null;

  // Previous evaluations (excluding the latest)
  const previousEvaluations = allEvaluations.filter(e => e.id !== lastEvaluation.id);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Última Evaluación</CardTitle>
            <Badge variant="outline">{periodLabel}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall Score */}
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{overall ?? '—'}</div>
              <div className="text-xs text-muted-foreground">Overall</div>
            </div>
            {delta !== null && (
              <div className={`flex items-center gap-1 text-sm font-medium ${delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                {delta > 0 ? <TrendingUp className="h-4 w-4" /> : delta < 0 ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                {delta > 0 ? '+' : ''}{delta}
              </div>
            )}
          </div>

          {/* Radar */}
          <div className="h-48">
            <WLARadarChart scores={lastEvaluation.scores} />
          </div>

          {/* Stats with progress bars */}
          <div className="space-y-2">
            {WLA_STATS.map(stat => {
              const score = lastEvaluation.scores[stat.key] ?? 0;
              const pct = (score / 20) * 100;
              return (
                <div key={stat.key} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{stat.label}</span>
                    <span className="font-medium">{score}/20</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              );
            })}
          </div>

          {/* Rubrics */}
          {lastEvaluation.rubrics.length > 0 && (
            <div className="space-y-3 pt-2 border-t">
              <h4 className="font-semibold text-sm flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-primary" />
                Nivel Actual
              </h4>
              {lastEvaluation.rubrics.map(rubric => {
                const levelInfo = getLevelLabel(rubric.band_min, rubric.band_max);
                return (
                  <div key={rubric.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {WLA_STATS.find(s => s.key === rubric.stat_key)?.label || rubric.stat_key}
                      </span>
                      <Badge variant="outline" className={`text-xs ${levelInfo.color}`}>
                        {levelInfo.label}
                      </Badge>
                    </div>
                    <ul className="ml-4 space-y-0.5">
                      {rubric.bullets.map((bullet, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground shrink-0" />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}

          {/* Coach Comments */}
          {lastEvaluation.comments.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <h4 className="font-semibold text-sm flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-primary" />
                Comentarios del Entrenador
              </h4>
              {lastEvaluation.comments.map((comment, i) => (
                <p key={i} className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 italic">
                  "{comment}"
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Evaluation History */}
      {previousEvaluations.length > 0 && (
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-4 h-auto">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Evaluaciones anteriores ({previousEvaluations.length})</span>
                </div>
                {historyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-3">
                {previousEvaluations.map(ev => {
                  const evDelta = ev.overall_score != null && ev.previous_overall != null
                    ? ev.overall_score - ev.previous_overall
                    : null;
                  return (
                    <div key={ev.id} className="p-3 rounded-lg border bg-muted/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">{formatPeriod(ev.period)}</Badge>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-primary">{ev.overall_score ?? '—'}</span>
                          {evDelta !== null && (
                            <span className={`text-xs font-medium ${evDelta > 0 ? 'text-green-600' : evDelta < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                              {evDelta > 0 ? '+' : ''}{evDelta}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="h-32">
                        <WLARadarChart scores={ev.scores} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
}
