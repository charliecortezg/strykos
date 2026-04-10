import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionPlans, useAllSessionPlans } from '@/hooks/useSessionPlans';
import { useTrainerCategories } from '@/hooks/useTrainerCategories';
import { WL_MACROCICLO, getCurrentMacroMonth } from '@/config/wl-macrociclo';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardList, ChevronDown, ChevronUp, Trophy, CheckCircle, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { SessionPlan, SessionPlanWithRelations } from '@/types/session-plans';
import type { Json } from '@/integrations/supabase/types';

type FilterStatus = 'todos' | 'activa' | 'completada' | 'borrador';

const STATUS_COLORS: Record<string, string> = {
  borrador: 'border-border text-muted-foreground',
  activa: 'border-blue-500/30 text-blue-500',
  completada: 'border-green-500/30 text-green-500',
};

const NIVEL_COLORS: Record<string, string> = {
  intro: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
  desar: 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30',
  cons: 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30',
};

function getObsData(obs: Json | null | undefined): Record<string, any> | null {
  if (!obs || typeof obs !== 'object' || Array.isArray(obs)) return null;
  const jugadores = (obs as Record<string, any>).jugadores;
  if (!jugadores || typeof jugadores !== 'object') return null;
  return jugadores as Record<string, any>;
}

function getAutoEvalData(ae: Json | null | undefined): Record<string, number> | null {
  if (!ae || typeof ae !== 'object' || Array.isArray(ae)) return null;
  return ae as Record<string, number>;
}

function getDimStats(jugadores: Record<string, any>, dim: string): number | null {
  let cumple = 0;
  let total = 0;
  for (const pid of Object.keys(jugadores)) {
    const val = jugadores[pid]?.[dim];
    if (val === true) { cumple++; total++; }
    else if (val === false) { total++; }
  }
  if (total === 0) return null;
  return Math.round((cumple / total) * 100);
}

export function HistorialSesiones() {
  const { activeRole } = useAuth();
  const isDirector = activeRole === 'director_deportivo' || activeRole === 'org_owner';

  const { categories } = useTrainerCategories();
  const trainerData = useSessionPlans();
  const allData = useAllSessionPlans();

  const sessions = isDirector ? allData.sessions : trainerData.sessions;
  const isLoading = isDirector ? allData.isLoading : trainerData.isLoading;

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('todos');
  const [filterTrainer, setFilterTrainer] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Available months from sessions
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    sessions.forEach(s => {
      const d = parseISO(s.session_date);
      const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      months.add(`${monthNames[d.getMonth()]}_${d.getFullYear()}`);
    });
    return Array.from(months).sort((a, b) => {
      const ma = WL_MACROCICLO.findIndex(m => m.month === a);
      const mb = WL_MACROCICLO.findIndex(m => m.month === b);
      return mb - ma;
    });
  }, [sessions]);

  // Available trainers (director view only)
  const availableTrainers = useMemo(() => {
    if (!isDirector) return [];
    const map = new Map<string, string>();
    (sessions as SessionPlanWithRelations[]).forEach(s => {
      if (s.trainer?.id && s.trainer?.full_name) {
        map.set(s.trainer.id, s.trainer.full_name);
      }
    });
    return Array.from(map.entries());
  }, [sessions, isDirector]);

  // Filtered sessions
  const filtered = useMemo(() => {
    return sessions.filter(s => {
      if (selectedCategoryId && s.category_id !== selectedCategoryId) return false;
      if (filterStatus !== 'todos' && s.status !== filterStatus) return false;
      if (filterMonth) {
        const d = parseISO(s.session_date);
        const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const key = `${monthNames[d.getMonth()]}_${d.getFullYear()}`;
        if (key !== filterMonth) return false;
      }
      if (isDirector && filterTrainer && (s as SessionPlanWithRelations).trainer?.id !== filterTrainer) return false;
      return true;
    });
  }, [sessions, selectedCategoryId, filterStatus, filterMonth, filterTrainer, isDirector]);

  // Stats
  const macroMonth = getCurrentMacroMonth();
  const currentMonthSessions = useMemo(() => {
    if (!macroMonth) return [];
    return sessions.filter(s => {
      const d = parseISO(s.session_date);
      const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      return `${monthNames[d.getMonth()]}_${d.getFullYear()}` === macroMonth.month;
    });
  }, [sessions, macroMonth]);

  const statsCount = currentMonthSessions.length;
  const statsWithMatch = currentMonthSessions.filter(s => {
    const obs = getObsData(s.observaciones_partido);
    return obs && Object.keys(obs).length > 0;
  }).length;
  const statsWithAutoEval = currentMonthSessions.filter(s => getAutoEvalData(s.autoevaluacion)).length;
  const matchPct = statsCount > 0 ? Math.round((statsWithMatch / statsCount) * 100) : 0;
  const evalPct = statsCount > 0 ? Math.round((statsWithAutoEval / statsCount) * 100) : 0;

  const uniqueTrainerCount = isDirector
    ? new Set((currentMonthSessions as SessionPlanWithRelations[]).map(s => s.trainer?.id).filter(Boolean)).size
    : 0;

  // Category list for filter
  const catOptions = useMemo(() => {
    if (isDirector) {
      const map = new Map<string, string>();
      (sessions as SessionPlanWithRelations[]).forEach(s => {
        if (s.category?.id && s.category?.name) map.set(s.category.id, s.category.name);
      });
      return Array.from(map.entries());
    }
    return categories.map(c => [c.id, c.name] as [string, string]);
  }, [sessions, categories, isDirector]);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        <Badge variant="outline" className="shrink-0 text-xs px-3 py-1.5">
          {statsCount} sesiones este mes
        </Badge>
        {isDirector && (
          <Badge variant="outline" className="shrink-0 text-xs px-3 py-1.5">
            {uniqueTrainerCount} entrenadores activos
          </Badge>
        )}
        <Badge variant="outline" className="shrink-0 text-xs px-3 py-1.5">
          {matchPct}% con partido
        </Badge>
        {!isDirector && (
          <Badge variant="outline" className="shrink-0 text-xs px-3 py-1.5">
            {evalPct}% con auto-evaluación
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="space-y-2">
        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          <button
            onClick={() => setSelectedCategoryId(null)}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
              !selectedCategoryId
                ? 'border-[#C9A227] text-[#C9A227] bg-[#C9A227]/10'
                : 'border-border text-muted-foreground bg-muted/50'
            )}
          >
            Todas
          </button>
          {catOptions.map(([id, name]) => (
            <button
              key={id}
              onClick={() => setSelectedCategoryId(id)}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                selectedCategoryId === id
                  ? 'border-[#C9A227] text-[#C9A227] bg-[#C9A227]/10'
                  : 'border-border text-muted-foreground bg-muted/50'
              )}
            >
              {name}
            </button>
          ))}
        </div>

        {/* Status pills + month/trainer selectors */}
        <div className="flex gap-2 items-center flex-wrap">
          {(['todos', 'activa', 'completada', 'borrador'] as FilterStatus[]).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium border transition-all',
                filterStatus === s
                  ? 'border-[#C9A227] text-[#C9A227] bg-[#C9A227]/10'
                  : 'border-border text-muted-foreground bg-muted/50'
              )}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}

          {availableMonths.length > 0 && (
            <Select value={filterMonth || 'all'} onValueChange={v => setFilterMonth(v === 'all' ? null : v)}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los meses</SelectItem>
                {availableMonths.map(m => {
                  const macro = WL_MACROCICLO.find(wl => wl.month === m);
                  return (
                    <SelectItem key={m} value={m}>
                      {macro?.label || m}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}

          {isDirector && availableTrainers.length > 0 && (
            <Select value={filterTrainer || 'all'} onValueChange={v => setFilterTrainer(v === 'all' ? null : v)}>
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue placeholder="Entrenador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {availableTrainers.map(([id, name]) => (
                  <SelectItem key={id} value={id}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Session list */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#C9A227]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border p-8 text-center bg-card">
          <ClipboardList className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium text-foreground mb-1">No hay sesiones registradas</p>
          <p className="text-xs text-muted-foreground">
            {filterStatus !== 'todos'
              ? `No hay sesiones con status "${filterStatus}" en este período.`
              : 'Planifica tu primera sesión desde el Home.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(session => {
            const s = session as SessionPlanWithRelations;
            const isExpanded = expandedId === s.id;
            const obsJugadores = getObsData(s.observaciones_partido);
            const hasMatch = obsJugadores && Object.keys(obsJugadores).length > 0;
            const autoEval = getAutoEvalData(s.autoevaluacion);
            const dims = ['tecnico', 'tactico', 'coordinativo', 'psicologico'] as const;

            return (
              <div key={s.id} className="rounded-xl border bg-card overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : s.id)}
                  className="w-full text-left p-3 hover:bg-muted/30 transition-colors"
                >
                  {/* Line 1: Date + status + icons */}
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {format(parseISO(s.session_date), "EEE d MMM yyyy", { locale: es })}
                      </span>
                      <div className="flex items-center gap-1">
                        {hasMatch && <span className="text-[10px]">⚽</span>}
                        {autoEval && <CheckCircle className="w-3 h-3 text-green-500" />}
                        {s.sincronizado_stryk && <RefreshCw className="w-3 h-3 text-[#C9A227]" />}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn('text-[10px] border', STATUS_COLORS[s.status])}>
                        {s.status}
                      </Badge>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {/* Line 2: Category / Trainer */}
                  <p className="text-xs text-muted-foreground mb-0.5">
                    {isDirector && s.category?.name ? s.category.name : ''}
                    {isDirector && s.trainer?.full_name && (
                      <span className="ml-1.5">· {s.trainer.full_name}</span>
                    )}
                    {!isDirector && s.category_id && categories.find(c => c.id === s.category_id)?.name}
                  </p>

                  {/* Line 3: Fundamento + nivel */}
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-foreground">{s.fundamento_mes}</span>
                    <Badge className={cn('text-[10px] uppercase border', NIVEL_COLORS[s.fundamento_nivel])}>
                      {s.fundamento_nivel}
                    </Badge>
                  </div>

                  {/* Line 4: Restriction */}
                  {s.restriccion_rondo && (
                    <p className="text-xs text-muted-foreground truncate">{s.restriccion_rondo}</p>
                  )}

                  {/* Dimension badges */}
                  <div className="flex gap-1.5 mt-2">
                    {hasMatch ? dims.map(dim => {
                      const pct = getDimStats(obsJugadores!, dim);
                      return (
                        <Badge
                          key={dim}
                          variant="outline"
                          className={cn(
                            'text-[9px] border',
                            pct != null && pct >= 70 ? 'border-green-500/30 text-green-500' :
                            pct != null && pct >= 50 ? 'border-amber-500/30 text-amber-500' :
                            pct != null ? 'border-red-500/30 text-red-500' :
                            'border-border text-muted-foreground'
                          )}
                        >
                          {dim.slice(0, 3).toUpperCase()} {pct != null ? `${pct}%` : '—'}
                        </Badge>
                      );
                    }) : (
                      <Badge variant="outline" className="text-[9px] border-border text-muted-foreground">
                        Sin partido registrado
                      </Badge>
                    )}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t space-y-2">
                    {s.juego_posicional && (
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-0.5">Juego posicional</p>
                        <p className="text-xs text-foreground">{s.juego_posicional}</p>
                      </div>
                    )}
                    {s.foco_partido && (
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-0.5">Foco del partido</p>
                        <p className="text-xs text-foreground">{s.foco_partido}</p>
                      </div>
                    )}
                    {s.pregunta_cierre && (
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-0.5">Pregunta de cierre</p>
                        <p className="text-xs text-foreground">{s.pregunta_cierre}</p>
                      </div>
                    )}

                    {/* Auto-evaluation */}
                    {autoEval && (
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Auto-evaluación</p>
                        <div className="flex gap-2 flex-wrap">
                          {[
                            { key: 'planificacion', label: 'Plan' },
                            { key: 'gestion', label: 'Gestión' },
                            { key: 'feedback', label: 'Feedback' },
                            { key: 'sistema_wl', label: 'WL' },
                          ].map(({ key, label }) => (
                            <Badge key={key} variant="outline" className="text-[10px]">
                              {label}: {autoEval[key]}/3
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Match observations */}
                    {hasMatch && (
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Observaciones del partido</p>
                        <div className="space-y-1">
                          {Object.entries(obsJugadores!).map(([pid, data]) => {
                            const d = data as Record<string, any>;
                            const count = [d.tecnico, d.tactico, d.coordinativo, d.psicologico].filter(v => v === true).length;
                            const total = [d.tecnico, d.tactico, d.coordinativo, d.psicologico].filter(v => v != null).length;
                            return (
                              <div key={pid} className="flex items-center justify-between text-xs py-1">
                                <span className="text-foreground truncate flex-1 min-w-0">{d.nombre || pid}</span>
                                <Badge variant="outline" className={cn(
                                  'text-[10px] ml-2 shrink-0',
                                  count >= 3 ? 'border-green-500/30 text-green-500' :
                                  count >= 1 ? 'border-amber-500/30 text-amber-500' :
                                  'border-red-500/30 text-red-500'
                                )}>
                                  {count}/{total}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
