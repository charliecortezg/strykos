import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { WLARadarChart } from '@/components/evaluations/WLARadarChart';
import { usePlayerLastEvaluation } from '@/hooks/usePortal/usePlayerLastEvaluation';
import { WLA_STATS } from '@/types/evaluations';
import { getLevelLabel } from '@/types/idp';
import { TrendingUp, TrendingDown, Minus, MessageSquare, BookOpen } from 'lucide-react';

interface Props {
  playerId: string;
}

export function LastEvaluationCard({ playerId }: Props) {
  const { lastEvaluation, isLoading } = usePlayerLastEvaluation(playerId);

  if (isLoading) return <div className="h-40 bg-muted animate-pulse rounded-lg" />;
  if (!lastEvaluation) return (
    <Card>
      <CardContent className="py-8 text-center text-muted-foreground text-sm">
        Aún no hay evaluaciones cerradas para este jugador.
      </CardContent>
    </Card>
  );

  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const [year, month] = lastEvaluation.period.split('-');
  const periodLabel = `${months[parseInt(month) - 1]} ${year}`;

  const overall = lastEvaluation.overall_score;
  const prev = lastEvaluation.previous_overall;
  const delta = overall != null && prev != null ? overall - prev : null;

  return (
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

        {/* Rubrics - Level descriptions with Quiere/Sabe/Puede ser */}
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
  );
}
