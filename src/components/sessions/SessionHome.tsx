import { useState } from 'react';
import { useTrainerCategories } from '@/hooks/useTrainerCategories';
import { useSessionPlans } from '@/hooks/useSessionPlans';
import { getCurrentMacroMonth } from '@/config/wl-macrociclo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, CalendarDays, Sparkles, Play, Dumbbell, Trophy, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlanificarSesion } from './PlanificarSesion';
import { PartidoObservacion } from './PartidoObservacion';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface SessionHomeProps {
  onShowHistorial?: () => void;
}

export function SessionHome({ onShowHistorial }: SessionHomeProps) {
  const { categories } = useTrainerCategories();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showPartido, setShowPartido] = useState(false);
  const [showTipoSelector, setShowTipoSelector] = useState(false);
  const [tipoPartido, setTipoPartido] = useState<'practica' | 'competicion'>('practica');

  const activeCategoryId = selectedCategoryId || categories[0]?.id || null;
  const activeCategory = categories.find(c => c.id === activeCategoryId);

  const { sessions, isLoading } = useSessionPlans(activeCategoryId || undefined);
  const macroMonth = getCurrentMacroMonth();

  const today = new Date().toISOString().slice(0, 10);
  const todaySession = sessions.find(s => s.session_date === today);
  const recentSessions = sessions.filter(s => s.session_date !== today).slice(0, 3);

  const nivelColors: Record<string, string> = {
    intro: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
    desar: 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30',
    cons: 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30',
  };

  const handleSelectTipo = (tipo: 'practica' | 'competicion') => {
    setTipoPartido(tipo);
    setShowTipoSelector(false);
    setShowPartido(true);
  };

  if (showPartido && todaySession && activeCategory) {
    return (
      <PartidoObservacion
        sessionPlan={todaySession}
        categoryId={activeCategory.id}
        ageGroup={activeCategory.age_group}
        tipoPartido={tipoPartido}
        onClose={() => setShowPartido(false)}
      />
    );
  }

  if (showPlanForm && activeCategory) {
    return (
      <PlanificarSesion
        categoryId={activeCategory.id}
        categoryName={activeCategory.name}
        ageGroup={activeCategory.age_group}
        onClose={() => setShowPlanForm(false)}
        onSaved={() => setShowPlanForm(false)}
        categories={categories}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Category Selector */}
      {categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
                cat.id === activeCategoryId
                  ? 'border-[#C9A227] text-[#C9A227] bg-[#C9A227]/10'
                  : 'border-border text-muted-foreground bg-muted/50'
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}
      {categories.length === 1 && (
        <p className="text-sm font-medium text-muted-foreground">{categories[0].name}</p>
      )}

      {/* Macrocycle Card */}
      {macroMonth && (
        <div
          className="rounded-xl p-4 bg-card border"
          style={{ borderColor: `${macroMonth.periodColor}66` }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Badge
              className="text-[10px] px-2 py-0.5 border"
              style={{
                backgroundColor: `${macroMonth.periodColor}20`,
                borderColor: `${macroMonth.periodColor}40`,
                color: macroMonth.periodColor,
              }}
            >
              {macroMonth.period.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}
            </Badge>
            <span className="text-xs text-muted-foreground">{macroMonth.label}</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-foreground font-semibold text-base">
              {macroMonth.fundamentoTecnico.label}
            </span>
            <Badge className={cn('text-[10px] uppercase border', nivelColors[macroMonth.fundamentoTecnico.nivel])}>
              {macroMonth.fundamentoTecnico.nivel}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            {macroMonth.focoTactico}
          </p>
        </div>
      )}

      {/* CTA */}
      {!todaySession ? (
        <Button
          onClick={() => setShowPlanForm(true)}
          className="w-full h-14 bg-[#C9A227] hover:bg-[#B8922A] text-black font-semibold text-base gap-2"
        >
          <Sparkles className="w-5 h-5" />
          Planificar sesión de hoy
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl p-4 border border-green-500/30 bg-green-500/10">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-green-600 dark:text-green-400 font-semibold">Sesión planificada</span>
            </div>
            <p className="text-xs text-muted-foreground ml-7">
              {todaySession.fundamento_mes}
              {todaySession.restriccion_rondo && ` · ${todaySession.restriccion_rondo}`}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 ml-7"
              onClick={() => {/* TODO: detail view */}}
            >
              Ver detalle
            </Button>
          </div>

          {/* Activate match button — only if session is active */}
          {todaySession.status === 'activa' && (
            <Button
              variant="outline"
              onClick={() => setShowTipoSelector(true)}
              className="w-full h-12 border-[#C9A227]/40 text-[#C9A227] hover:bg-[#C9A227]/10 font-medium gap-2"
            >
              <Play className="w-5 h-5" />
              Activar partido
            </Button>
          )}
        </div>
      )}

      {/* Match type selector sheet */}
      <Sheet open={showTipoSelector} onOpenChange={setShowTipoSelector}>
        <SheetContent side="bottom" className="bg-card rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Tipo de partido</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            <button
              onClick={() => handleSelectTipo('practica')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-[#C9A227]/40 hover:bg-muted/50 transition-all text-left"
            >
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <Dumbbell className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Partido de práctica</p>
                <p className="text-xs text-muted-foreground">Último bloque de la sesión de hoy</p>
              </div>
            </button>
            <button
              onClick={() => handleSelectTipo('competicion')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-[#C9A227]/40 hover:bg-muted/50 transition-all text-left"
            >
              <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <Trophy className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Partido de competición</p>
                <p className="text-xs text-muted-foreground">Partido oficial de esta semana</p>
              </div>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground/80 mb-3">Sesiones recientes</h3>
          <div className="space-y-2">
            {recentSessions.map(session => (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(session.session_date), "EEE d MMM", { locale: es })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/80 mt-0.5 truncate">
                    {session.fundamento_mes}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {session.observaciones_partido && Object.keys(session.observaciones_partido as object).length > 0 && (
                    <span className="text-[10px] text-muted-foreground">⚽</span>
                  )}
                  {(() => {
                    const displayStatus = getDisplaySessionStatus(session);
                    return (
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] border',
                          displayStatus === 'completada' && 'border-green-500/30 text-green-500',
                          displayStatus === 'activa' && 'border-[#C9A227]/30 text-[#C9A227]',
                          displayStatus === 'borrador' && 'border-border text-muted-foreground',
                          displayStatus === 'expirada' && 'border-muted-foreground/30 text-muted-foreground',
                        )}
                      >
                        {getDisplaySessionStatusLabel(displayStatus)}
                      </Badge>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>

          {onShowHistorial && (
            <button
              onClick={onShowHistorial}
              className="mt-3 text-sm text-[#C9A227] hover:underline font-medium"
            >
              Ver historial completo →
            </button>
          )}
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#C9A227]" />
        </div>
      )}
    </div>
  );
}
