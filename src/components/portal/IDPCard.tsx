import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { usePlayerIDP } from '@/hooks/usePortal/usePlayerIDP';
import { STAT_LABELS } from '@/types/idp';
import { Target, TrendingUp, AlertTriangle, CheckCircle2, Flame, Brain } from 'lucide-react';
import { IDPSessionModal } from './IDPSessionModal';

interface Props {
  playerId: string;
}

export function IDPCard({ playerId }: Props) {
  const {
    idpCycle, focusAreas, sessions, isLoading, hasSessionToday, acceptIDP, registerSession,
  } = usePlayerIDP(playerId);
  const [showSessionModal, setShowSessionModal] = useState(false);

  if (isLoading) return <div className="h-40 bg-muted animate-pulse rounded-lg" />;
  if (!idpCycle) return null;

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

  return (
    <>
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
            <span>{idpCycle.starts_at} → {idpCycle.ends_at}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Accept button */}
          {!idpCycle.accepted_at && (
            <Button
              onClick={() => acceptIDP.mutate()}
              disabled={acceptIDP.isPending}
              className="w-full"
              variant="default"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Aceptar Plan
            </Button>
          )}

          {/* === SECTION 1: Enfoque Técnico === */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Enfoque Técnico
            </h4>

            {/* Strengthen areas */}
            {strengthenAreas.map(fa => (
              <FocusAreaRow
                key={fa.id}
                statKey={fa.stat_key}
                initial={fa.initial_score}
                target={fa.target_score}
                label="Potenciar"
                variant="green"
              />
            ))}

            {/* Improve area */}
            {improveAreas.map(fa => (
              <FocusAreaRow
                key={fa.id}
                statKey={fa.stat_key}
                initial={fa.initial_score}
                target={fa.target_score}
                label="Mejorar"
                variant="yellow"
              />
            ))}
          </div>

          {/* Sessions + Streak */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="text-sm">
              <span className="font-medium">{sessions.length}</span>
              <span className="text-muted-foreground"> sesiones</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="font-medium">Racha</span>
            </div>
            <Button
              size="sm"
              onClick={() => setShowSessionModal(true)}
              disabled={hasSessionToday || idpCycle.status === 'completed'}
            >
              {hasSessionToday ? 'Ya registraste hoy' : 'Registrar sesión'}
            </Button>
          </div>

          {/* Weekly plan */}
          {plan?.weekly_plan && (
            <p className="text-xs text-muted-foreground italic">
              {plan.weekly_plan.description}
            </p>
          )}

          {/* === SECTION 2: Indicaciones de Mentalidad === */}
          {mentalidadActions.length > 0 && (
            <div className="space-y-3 pt-2 border-t">
              <h4 className="font-semibold text-sm flex items-center gap-1.5">
                <Brain className="h-4 w-4 text-purple-500" />
                Acciones de Mentalidad
              </h4>
              <p className="text-xs text-muted-foreground">
                Acciones recomendadas para los próximos 30 días
              </p>
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
            </div>
          )}
        </CardContent>
      </Card>

      <IDPSessionModal
        open={showSessionModal}
        onOpenChange={setShowSessionModal}
        sessionNumber={sessions.length + 1}
        onConfirm={() => {
          registerSession.mutate();
          setShowSessionModal(false);
        }}
        isPending={registerSession.isPending}
      />
    </>
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
