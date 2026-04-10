import { useMemo } from 'react';
import { useSessionPlans, useUpdateSessionPlan } from '@/hooks/useSessionPlans';
import { useTrainerCategories } from '@/hooks/useTrainerCategories';
import { getCurrentMacroMonth, WL_MACROCICLO } from '@/config/wl-macrociclo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, RefreshCw, Info, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { SessionPlan } from '@/types/session-plans';
import type { Json } from '@/integrations/supabase/types';

interface Props {
  onNavigateEvaluations?: () => void;
}

type Dimension = 'tecnico' | 'tactico' | 'coordinativo' | 'psicologico';

const DIM_LABELS: Record<Dimension, string> = {
  tecnico: 'Técnico',
  tactico: 'Táctico',
  coordinativo: 'Coordinativo',
  psicologico: 'Psicológico',
};

function getObsJugadores(obs: Json | null | undefined): Record<string, any> | null {
  if (!obs || typeof obs !== 'object' || Array.isArray(obs)) return null;
  const j = (obs as Record<string, any>).jugadores;
  if (!j || typeof j !== 'object') return null;
  return j as Record<string, any>;
}

function hasObservations(session: SessionPlan): boolean {
  const j = getObsJugadores(session.observaciones_partido);
  return j != null && Object.keys(j).length > 0;
}

export function SincronizacionStryk({ onNavigateEvaluations }: Props) {
  const { sessions, isLoading } = useSessionPlans();
  const updateSession = useUpdateSessionPlan();
  const macroMonth = getCurrentMacroMonth();

  // Pending sync sessions
  const pendingSessions = useMemo(() => {
    return sessions.filter(s => !s.sincronizado_stryk && hasObservations(s));
  }, [sessions]);

  // Current month synced sessions for progress
  const currentMonthSynced = useMemo(() => {
    if (!macroMonth) return [];
    return sessions.filter(s => {
      if (!s.sincronizado_stryk) return false;
      if (!hasObservations(s)) return false;
      const d = parseISO(s.session_date);
      const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      return `${monthNames[d.getMonth()]}_${d.getFullYear()}` === macroMonth.month;
    });
  }, [sessions, macroMonth]);

  // Calculate progress per dimension
  const dimProgress = useMemo(() => {
    const dims: Dimension[] = ['tecnico', 'tactico', 'coordinativo', 'psicologico'];
    const result: Record<Dimension, { pct: number | null; cumple: number; total: number }> = {
      tecnico: { pct: null, cumple: 0, total: 0 },
      tactico: { pct: null, cumple: 0, total: 0 },
      coordinativo: { pct: null, cumple: 0, total: 0 },
      psicologico: { pct: null, cumple: 0, total: 0 },
    };

    for (const s of currentMonthSynced) {
      const jugadores = getObsJugadores(s.observaciones_partido);
      if (!jugadores) continue;

      for (const pid of Object.keys(jugadores)) {
        const data = jugadores[pid];
        for (const dim of dims) {
          const val = data?.[dim];
          if (val === true) { result[dim].cumple++; result[dim].total++; }
          else if (val === false) { result[dim].total++; }
        }
      }
    }

    for (const dim of dims) {
      if (result[dim].total > 0) {
        result[dim].pct = Math.round((result[dim].cumple / result[dim].total) * 100);
      }
    }

    return result;
  }, [currentMonthSynced]);

  const handleSync = async (sessionId: string) => {
    try {
      await updateSession.mutateAsync({
        id: sessionId,
        data: { sincronizado_stryk: true },
      });
      toast.success('Sesión sincronizada con Stryk');
    } catch {
      toast.error('Error al sincronizar');
    }
  };

  const dims: Dimension[] = ['tecnico', 'tactico', 'coordinativo', 'psicologico'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-display font-semibold text-foreground">Sincronización Stryk</h2>
        {macroMonth && (
          <p className="text-sm text-muted-foreground">{macroMonth.label}</p>
        )}
      </div>

      {/* Pending Sessions */}
      <div>
        <h3 className="text-sm font-semibold text-foreground/80 mb-2">Sesiones pendientes de sincronizar</h3>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#C9A227]" />
          </div>
        ) : pendingSessions.length === 0 ? (
          <div className="rounded-xl border p-4 bg-green-500/5 border-green-500/20 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
            <span className="text-sm text-green-600 dark:text-green-400 font-medium">Todo sincronizado ✓</span>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingSessions.map(s => (
              <div key={s.id} className="rounded-xl border p-3 bg-card flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {format(parseISO(s.session_date), "EEE d MMM", { locale: es })}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{s.fundamento_mes}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSync(s.id)}
                  disabled={updateSession.isPending}
                  className="gap-1.5 shrink-0 bg-[#C9A227] hover:bg-[#B8922A] text-black text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Sincronizar
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Monthly Progress */}
      <div>
        <h3 className="text-sm font-semibold text-foreground/80 mb-3">Progreso mensual del equipo</h3>
        {currentMonthSynced.length === 0 ? (
          <div className="rounded-xl border p-6 text-center bg-card">
            <Info className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-foreground mb-1">Sin datos de partido este mes</p>
            <p className="text-xs text-muted-foreground">
              Registra observaciones durante el partido para ver el progreso del equipo.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {dims.map(dim => {
              const { pct } = dimProgress[dim];
              const indicator = macroMonth?.indicadoresActivos?.[dim] || '';
              const color = pct == null ? 'muted' :
                pct > 70 ? 'green' :
                pct >= 50 ? 'amber' : 'red';

              const statusLabel = pct == null ? 'Sin datos' :
                pct > 70 ? 'En vía de consolidación' :
                pct >= 50 ? 'En desarrollo' : 'Indicador no consolidado';

              return (
                <div key={dim} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{DIM_LABELS[dim]}</span>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] border',
                          color === 'green' && 'border-green-500/30 text-green-500',
                          color === 'amber' && 'border-amber-500/30 text-amber-500',
                          color === 'red' && 'border-red-500/30 text-red-500',
                          color === 'muted' && 'border-border text-muted-foreground',
                        )}
                      >
                        {pct != null ? `${pct}%` : '—'}
                      </Badge>
                    </div>
                  </div>

                  <Progress
                    value={pct ?? 0}
                    className={cn(
                      'h-2',
                      color === 'green' && '[&>div]:bg-green-500',
                      color === 'amber' && '[&>div]:bg-amber-500',
                      color === 'red' && '[&>div]:bg-red-500',
                    )}
                  />

                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground truncate flex-1 mr-2">{indicator}</p>
                    <span className={cn(
                      'text-[10px] shrink-0',
                      color === 'green' && 'text-green-500',
                      color === 'amber' && 'text-amber-500',
                      color === 'red' && 'text-red-500',
                      color === 'muted' && 'text-muted-foreground',
                    )}>
                      {statusLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick access */}
      {onNavigateEvaluations && (
        <Button
          variant="outline"
          onClick={onNavigateEvaluations}
          className="w-full gap-2"
        >
          Ver evaluaciones en Stryk <ArrowRight className="w-4 h-4" />
        </Button>
      )}

      {/* Info note */}
      <p className="text-xs text-muted-foreground leading-relaxed">
        Las observaciones del partido alimentan el perfil mensual del jugador en Stryk. 
        Cada indicador registrado suma al % de cumplimiento de la evaluación mensual.
      </p>
    </div>
  );
}
