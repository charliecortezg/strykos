import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WLARadarChart } from '@/components/evaluations/WLARadarChart';
import { usePlayerLastEvaluation } from '@/hooks/usePortal/usePlayerLastEvaluation';
import { WLA_STATS } from '@/types/evaluations';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  playerId: string;
}

export function LastEvaluationCard({ playerId }: Props) {
  const { lastEvaluation, isLoading } = usePlayerLastEvaluation(playerId);

  if (isLoading) return <div className="h-40 bg-muted animate-pulse rounded-lg" />;
  if (!lastEvaluation) return null;

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

        {/* Stats list */}
        <div className="grid grid-cols-2 gap-2">
          {WLA_STATS.map(stat => (
            <div key={stat.key} className="flex justify-between text-sm px-2 py-1 rounded bg-muted/50">
              <span className="text-muted-foreground truncate">{stat.label.split(' ')[0]}</span>
              <span className="font-medium">{lastEvaluation.scores[stat.key] ?? '—'}/20</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
