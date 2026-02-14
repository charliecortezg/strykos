import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { usePlayerIDP } from '@/hooks/usePortal/usePlayerIDP';
import { STAT_LABELS, parseWeeklyPlan } from '@/types/idp';
import { Target, TrendingUp, AlertTriangle, CheckCircle2, Flame, Brain, Sparkles, ListChecks, Calendar, Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  playerId: string;
}

export function IDPCard({ playerId }: Props) {
  const { idpCycle, focusAreas, sessions, isLoading } = usePlayerIDP(playerId);

  if (isLoading) return <div className="h-40 bg-muted animate-pulse rounded-lg" />;
  if (!idpCycle) return (
    <Card>
      <CardContent className="py-8 text-center text-muted-foreground text-sm">
        Aún no se ha generado un Plan de Desarrollo para este jugador.
      </CardContent>
    </Card>
  );

  const plan = idpCycle.plan_json;
  const stageLabels: Record<string, string> = { '0_30': 'Días 1–30', '31_60': 'Días 31–60', '61_90': 'Días 61–90' };
  const statusConfig: Record<string, { label: string; variant: 'default' | 'destructive' | 'secondary' }> = {
    active: { label: 'Activo', variant: 'default' },
    overdue: { label: 'Vencido', variant: 'destructive' },
    completed: { label: 'Completado', variant: 'secondary' },
  };

  const config = statusConfig[idpCycle.status] || statusConfig.active;
  const strengthenAreas = focusAreas.filter(f => f.focus_type === 'strengthen');
  const improveAreas = focusAreas.filter(f => f.focus_type === 'improve');
  const mentalidadActions = plan?.mentalidad_actions || [];

  // Parse weekly plan into structured days
  const weeklyPlanDays = plan?.weekly_plan?.description
    ? parseWeeklyPlan(plan.weekly_plan.description)
    : [];

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Plan de Desarrollo (90 días)</CardTitle>
            </div>
            <Badge variant={config.variant}>{config.label}</Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{stageLabels[idpCycle.stage] || idpCycle.stage}</span>
            <span>•</span>
            <span>{sessions.length} sesiones</span>
            <Flame className="h-3.5 w-3.5 text-orange-500" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Accept button */}
          {!idpCycle.accepted_at && (
            <Button className="w-full" variant="default" disabled>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Aceptar Plan
            </Button>
          )}

          {/* AI Comment */}
          {plan?.ai_comment && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Análisis del Jugador</span>
              </div>
              <p className="text-sm text-muted-foreground">{plan.ai_comment}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Technical Focus Card */}
      {(strengthenAreas.length > 0 || improveAreas.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Enfoque Técnico
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {strengthenAreas.map(fa => (
              <FocusAreaRow key={fa.id} statKey={fa.stat_key} initial={fa.initial_score} target={fa.target_score} label="Potenciar" variant="green" />
            ))}
            {improveAreas.map(fa => (
              <FocusAreaRow key={fa.id} statKey={fa.stat_key} initial={fa.initial_score} target={fa.target_score} label="Mejorar" variant="yellow" />
            ))}
          </CardContent>
        </Card>
      )}

      {/* AI Recommendations Card */}
      {plan?.ai_recommendations && plan.ai_recommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-1.5">
              <ListChecks className="h-4 w-4 text-primary" />
              Recomendaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {plan.ai_recommendations.map((rec, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  {rec}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Weekly Plan Cards */}
      {weeklyPlanDays.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary" />
              Plan Semanal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {weeklyPlanDays.map((day, i) => (
                <div key={i} className="p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Dumbbell className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm font-semibold">{day.day}</span>
                    {day.title && <span className="text-xs text-muted-foreground">— {day.title}</span>}
                  </div>
                  <ul className="space-y-0.5">
                    {day.exercises.map((ex, j) => (
                      <li key={j} className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground shrink-0" />
                        {ex}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mentality Actions Card */}
      {mentalidadActions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-1.5">
              <Brain className="h-4 w-4 text-purple-500" />
              Acciones de Mentalidad
            </CardTitle>
            <p className="text-xs text-muted-foreground">Acciones recomendadas para los próximos 30 días</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {mentalidadActions.map((ma, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-sm font-medium">{ma.stat_label}</span>
                  <Badge variant="outline" className="text-xs">{ma.score}/20</Badge>
                </div>
                <ul className="ml-6 space-y-0.5">
                  {ma.actions.map((action, j) => (
                    <li key={j} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground shrink-0" />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FocusAreaRow({
  statKey, initial, target, label, variant,
}: {
  statKey: string; initial: number; target: number; label: string; variant: 'green' | 'yellow';
}) {
  const pct = target > initial ? Math.round(((initial) / target) * 100) : 100;
  const badgeClass = variant === 'green' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm">{STAT_LABELS[statKey] || statKey}</span>
        <Badge variant="outline" className={`text-xs ${badgeClass}`}>{label}</Badge>
      </div>
      <div className="flex items-center gap-2">
        <Progress value={pct} className="h-2 flex-1" />
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {initial} → {target}
        </span>
      </div>
    </div>
  );
}
