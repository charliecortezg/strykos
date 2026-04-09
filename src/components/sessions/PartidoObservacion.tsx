import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, X, Snowflake, Check, XIcon, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { usePlayers } from '@/hooks/usePlayers';
import { useUpdateSessionPlan } from '@/hooks/useSessionPlans';
import { getCurrentMacroMonth } from '@/config/wl-macrociclo';
import { toast } from 'sonner';
import type { SessionPlan } from '@/types/session-plans';
import { AutoEvaluacion } from './AutoEvaluacion';

interface Props {
  sessionPlan: SessionPlan;
  categoryId: string;
  ageGroup: string;
  tipoPartido: 'practica' | 'competicion';
  onClose: () => void;
}

interface JugadorObservacion {
  tecnico?: boolean | null;
  tactico?: boolean | null;
  coordinativo?: boolean | null;
  psicologico?: boolean | null;
  nota?: string;
}

type Fase = 'prePartido' | 'enPartido' | 'finalizado';
type Dimension = 'tecnico' | 'tactico' | 'coordinativo' | 'psicologico';

const DIMENSION_LABELS: Record<Dimension, string> = {
  tecnico: 'TÉC',
  tactico: 'TÁC',
  coordinativo: 'COO',
  psicologico: 'PSI',
};

function normalizeAgeGroup(categoryAgeGroup: string): string {
  const ag = categoryAgeGroup?.toLowerCase().trim() || '';
  if (['sub-5', 'sub-6', 'sub-8', 'sub-10', 'sub-12', 'sub-13'].includes(ag)) return ag;
  return 'sub-10';
}

function isSubTenOrAbove(ageGroup: string): boolean {
  const ag = normalizeAgeGroup(ageGroup);
  return ['sub-10', 'sub-12', 'sub-13'].includes(ag);
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function PartidoObservacion({ sessionPlan, categoryId, ageGroup, tipoPartido, onClose }: Props) {
  const [fase, setFase] = useState<Fase>('prePartido');
  const [timerSegundos, setTimerSegundos] = useState(0);
  const [timerActivo, setTimerActivo] = useState(false);
  const [observaciones, setObservaciones] = useState<Record<string, JugadorObservacion>>({});
  const [jugadorExpandido, setJugadorExpandido] = useState<string | null>(null);
  const [freezeUsado, setFreezeUsado] = useState(false);
  const [freezeActivo, setFreezeActivo] = useState(false);
  const [showAutoEval, setShowAutoEval] = useState(false);
  const [notaAbierta, setNotaAbierta] = useState<string | null>(null);
  const freezeAlertShown = useRef(false);

  const { players } = usePlayers({ categoryId, isActive: true });
  const updateSession = useUpdateSessionPlan();
  const macroMonth = getCurrentMacroMonth();
  const canFreeze = isSubTenOrAbove(ageGroup);

  const foco = sessionPlan.foco_partido || macroMonth?.indicadoresActivos?.tecnico || 'Observar el juego libre';

  // Timer
  useEffect(() => {
    if (!timerActivo) return;
    const interval = setInterval(() => setTimerSegundos(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [timerActivo]);

  // Freeze alert at minute 12
  useEffect(() => {
    if (timerSegundos >= 720 && canFreeze && !freezeUsado && !freezeAlertShown.current) {
      freezeAlertShown.current = true;
      toast('Min. 12 — ¿Necesitas el freeze?', { duration: 5000 });
    }
  }, [timerSegundos, canFreeze, freezeUsado]);

  const setDimension = useCallback((playerId: string, dim: Dimension, value: boolean) => {
    setObservaciones(prev => ({
      ...prev,
      [playerId]: { ...prev[playerId], [dim]: value },
    }));
  }, []);

  const setNota = useCallback((playerId: string, nota: string) => {
    setObservaciones(prev => ({
      ...prev,
      [playerId]: { ...prev[playerId], nota },
    }));
  }, []);

  const handleFreeze = () => {
    if (freezeUsado) return;
    setFreezeUsado(true);
    setFreezeActivo(true);
    setTimerActivo(false);
  };

  const handleResumeFreeze = () => {
    setFreezeActivo(false);
    setTimerActivo(true);
  };

  const handleFinalizar = () => {
    setTimerActivo(false);
    setFase('finalizado');
  };

  const buildObsPayload = () => {
    const jugadores: Record<string, any> = {};
    for (const p of players) {
      const obs = observaciones[p.id];
      if (obs && (obs.tecnico != null || obs.tactico != null || obs.coordinativo != null || obs.psicologico != null || obs.nota)) {
        jugadores[p.id] = {
          nombre: p.full_name,
          tecnico: obs.tecnico ?? null,
          tactico: obs.tactico ?? null,
          coordinativo: obs.coordinativo ?? null,
          psicologico: obs.psicologico ?? null,
          nota: obs.nota || null,
        };
      }
    }
    return {
      tipo_partido: tipoPartido,
      duracion_segundos: timerSegundos,
      freeze_usado: freezeUsado,
      jugadores,
    };
  };

  const handleSyncSave = async () => {
    try {
      await updateSession.mutateAsync({
        id: sessionPlan.id,
        data: {
          observaciones_partido: buildObsPayload(),
          partido_finalizado_at: new Date().toISOString(),
          sincronizado_stryk: true,
          status: 'completada',
        },
      });
      setShowAutoEval(true);
    } catch {
      toast.error('Error al guardar observaciones');
    }
  };

  const handleLocalSave = async () => {
    try {
      await updateSession.mutateAsync({
        id: sessionPlan.id,
        data: {
          observaciones_partido: buildObsPayload(),
          partido_finalizado_at: new Date().toISOString(),
          sincronizado_stryk: false,
          status: 'completada',
        },
      });
      toast.success('Observaciones guardadas');
      onClose();
    } catch {
      toast.error('Error al guardar');
    }
  };

  if (showAutoEval) {
    return (
      <AutoEvaluacion
        sessionPlanId={sessionPlan.id}
        onComplete={onClose}
      />
    );
  }

  // ── PRE-PARTIDO ──
  if (fase === 'prePartido') {
    return (
      <div className="fixed inset-0 z-50 bg-[#0F1117] flex flex-col items-center justify-center p-6 text-white">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-white/50 hover:text-white">
          <X className="w-6 h-6" />
        </button>

        <p className="text-lg font-semibold text-center leading-relaxed max-w-sm mb-4">
          {foco}
        </p>

        <Badge className={cn(
          'text-xs border mb-8',
          tipoPartido === 'competicion'
            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
        )}>
          {tipoPartido === 'competicion' ? 'Competición' : 'Práctica'}
        </Badge>

        <p className="text-sm text-white/40 mb-2">{players.length} jugadores cargados</p>

        <Button
          onClick={() => { setFase('enPartido'); setTimerActivo(true); }}
          className="w-full max-w-xs h-14 bg-[#C9A227] hover:bg-[#B8922A] text-black font-semibold text-base"
        >
          <Play className="w-5 h-5 mr-2" />
          Iniciar partido →
        </Button>
      </div>
    );
  }

  // ── FINALIZADO ──
  if (fase === 'finalizado') {
    const registeredPlayers = players.filter(p => {
      const o = observaciones[p.id];
      return o && (o.tecnico != null || o.tactico != null || o.coordinativo != null || o.psicologico != null);
    });

    const getCount = (pid: string) => {
      const o = observaciones[pid];
      if (!o) return 0;
      return [o.tecnico, o.tactico, o.coordinativo, o.psicologico].filter(v => v != null).length;
    };

    return (
      <div className="fixed inset-0 z-50 bg-[#0F1117] flex flex-col text-white overflow-y-auto">
        <div className="p-6 flex-1">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 text-white/50 hover:text-white">
            <X className="w-6 h-6" />
          </button>

          <h2 className="text-xl font-bold mb-1">Partido finalizado</h2>
          <p className="text-3xl font-bold text-[#C9A227] mb-6">
            {Math.floor(timerSegundos / 60)} min
          </p>

          <Badge className="mb-4 bg-white/10 text-white/70 border-white/20">
            {registeredPlayers.length} de {players.length} jugadores registrados
          </Badge>

          <div className="space-y-2 mb-8">
            {registeredPlayers.map(p => {
              const count = getCount(p.id);
              return (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <span className="text-sm truncate flex-1 min-w-0">{p.full_name}</span>
                  <Badge className={cn(
                    'text-xs border ml-2 shrink-0',
                    count >= 3 ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                    count >= 1 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                    'bg-red-500/20 text-red-400 border-red-500/30'
                  )}>
                    {count}/4
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-6 space-y-3 pb-safe">
          <Button
            onClick={handleSyncSave}
            disabled={updateSession.isPending}
            className="w-full h-14 bg-[#C9A227] hover:bg-[#B8922A] text-black font-semibold text-base"
          >
            {updateSession.isPending ? 'Guardando...' : 'Sincronizar con Stryk →'}
          </Button>
          <Button
            variant="outline"
            onClick={handleLocalSave}
            disabled={updateSession.isPending}
            className="w-full h-12 border-white/20 text-white hover:bg-white/10"
          >
            Guardar sin sincronizar
          </Button>
        </div>
      </div>
    );
  }

  // ── EN PARTIDO ──
  const timerMinutes = Math.floor(timerSegundos / 60);
  const isMinute12Alert = timerMinutes >= 12 && canFreeze && !freezeUsado;

  return (
    <div className="fixed inset-0 z-50 bg-[#0F1117] flex flex-col text-white">
      {/* HEADER */}
      <div className="shrink-0 px-4 pt-3 pb-2 border-b border-white/10">
        {freezeActivo && (
          <div className="flex items-center justify-center gap-2 mb-2">
            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 animate-pulse">
              <Snowflake className="w-3 h-3 mr-1" /> FREEZE ACTIVO
            </Badge>
            <Button size="sm" variant="outline" onClick={handleResumeFreeze} className="h-7 text-xs border-white/20 text-white hover:bg-white/10">
              Reanudar
            </Button>
          </div>
        )}

        <p className="text-xs text-white/50 truncate text-center mb-1">{foco}</p>

        <div className="flex items-center justify-between">
          <Badge className={cn(
            'text-[10px] border',
            tipoPartido === 'competicion'
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
          )}>
            {tipoPartido === 'competicion' ? 'Comp.' : 'Práct.'}
          </Badge>

          <span className={cn(
            'text-2xl font-mono font-bold tabular-nums',
            isMinute12Alert ? 'text-orange-400' : 'text-white'
          )}>
            {formatTimer(timerSegundos)}
          </span>

          <div className="w-10" />
        </div>
      </div>

      {/* PLAYER LIST */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {players.map(player => {
          const obs = observaciones[player.id] || {};
          const isExpanded = jugadorExpandido === player.id;
          const dims: Dimension[] = ['tecnico', 'tactico', 'coordinativo', 'psicologico'];

          return (
            <div key={player.id} className="mb-1">
              {/* Collapsed row */}
              <button
                onClick={() => setJugadorExpandido(isExpanded ? null : player.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 rounded-lg transition-colors',
                  isExpanded ? 'bg-white/10 h-11' : 'h-[52px] bg-white/5 hover:bg-white/10'
                )}
              >
                <span className="text-sm font-medium truncate flex-1 min-w-0 text-left">
                  {player.full_name}
                </span>
                <div className="flex gap-1 shrink-0">
                  {dims.map(dim => {
                    const val = obs[dim];
                    return (
                      <span
                        key={dim}
                        className={cn(
                          'text-[9px] font-bold px-1.5 py-0.5 rounded',
                          val === true && 'bg-green-500/20 text-green-400',
                          val === false && 'bg-red-500/20 text-red-400',
                          val == null && 'bg-white/10 text-white/40',
                        )}
                      >
                        {DIMENSION_LABELS[dim]}
                      </span>
                    );
                  })}
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-3 py-3 space-y-3 bg-white/5 rounded-b-lg -mt-1">
                  {dims.map(dim => {
                    const indicator = macroMonth?.indicadoresActivos?.[dim] || dim;
                    const val = obs[dim];
                    return (
                      <div key={dim}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-bold text-white/60 uppercase">{DIMENSION_LABELS[dim]}</span>
                          <span className="text-xs text-white/40 truncate flex-1">{indicator}</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setDimension(player.id, dim, true)}
                            className={cn(
                              'flex-1 h-14 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all',
                              val === true
                                ? 'bg-green-500/30 text-green-400 ring-1 ring-white/30'
                                : 'bg-green-500/10 text-green-400/60 hover:bg-green-500/20'
                            )}
                          >
                            <Check className="w-4 h-4" /> Cumple
                          </button>
                          <button
                            onClick={() => setDimension(player.id, dim, false)}
                            className={cn(
                              'flex-1 h-14 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all',
                              val === false
                                ? 'bg-red-500/30 text-red-400 ring-1 ring-white/30'
                                : 'bg-red-500/10 text-red-400/60 hover:bg-red-500/20'
                            )}
                          >
                            <XIcon className="w-4 h-4" /> No cumple
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Quick note */}
                  {notaAbierta === player.id ? (
                    <Input
                      autoFocus
                      maxLength={50}
                      placeholder="Observación específica..."
                      value={obs.nota || ''}
                      onChange={e => setNota(player.id, e.target.value)}
                      onBlur={() => setNotaAbierta(null)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/30 text-sm h-10"
                    />
                  ) : (
                    <button
                      onClick={() => setNotaAbierta(player.id)}
                      className="flex items-center gap-2 text-xs text-white/40 hover:text-white/60"
                    >
                      <StickyNote className="w-3.5 h-3.5" />
                      {obs.nota || 'Nota rápida'}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FOOTER */}
      <div className="shrink-0 h-16 px-4 flex items-center justify-between border-t border-white/10 pb-safe">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTimerActivo(prev => !prev)}
          className="h-10 border-white/20 text-white hover:bg-white/10 text-xs"
        >
          <Pause className="w-4 h-4 mr-1" />
          {timerActivo ? 'Pausar' : 'Reanudar'}
        </Button>

        {canFreeze && (
          <Button
            variant="outline"
            size="sm"
            disabled={freezeUsado}
            onClick={handleFreeze}
            className={cn(
              'h-10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 text-xs',
              freezeUsado && 'opacity-40'
            )}
          >
            <Snowflake className="w-4 h-4 mr-1" />
            {freezeUsado ? 'Freeze usado' : 'Freeze'}
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleFinalizar}
          className="h-10 border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs"
        >
          Finalizar
        </Button>
      </div>
    </div>
  );
}
