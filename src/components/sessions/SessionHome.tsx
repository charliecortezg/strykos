import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTrainerCategories } from '@/hooks/useTrainerCategories';
import { useSessionPlans } from '@/hooks/useSessionPlans';
import { getCurrentMacroMonth } from '@/config/wl-macrociclo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, CalendarDays, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlanificarSesion } from './PlanificarSesion';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export function SessionHome() {
  const { categories } = useTrainerCategories();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showPlanForm, setShowPlanForm] = useState(false);

  // Initialize with first category
  const activeCategoryId = selectedCategoryId || categories[0]?.id || null;
  const activeCategory = categories.find(c => c.id === activeCategoryId);

  const { sessions, isLoading } = useSessionPlans(activeCategoryId || undefined);
  const macroMonth = getCurrentMacroMonth();

  const today = new Date().toISOString().slice(0, 10);
  const todaySession = sessions.find(s => s.session_date === today);
  const recentSessions = sessions.filter(s => s.session_date !== today).slice(0, 3);

  const nivelColors: Record<string, string> = {
    intro: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    desar: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    cons: 'bg-green-500/20 text-green-400 border-green-500/30',
  };

  if (showPlanForm && activeCategory) {
    return (
      <PlanificarSesion
        categoryId={activeCategory.id}
        categoryName={activeCategory.name}
        ageGroup={activeCategory.age_group}
        onClose={() => setShowPlanForm(false)}
        onSaved={() => setShowPlanForm(false)}
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
                  : 'border-white/10 text-white/50 bg-white/5'
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}
      {categories.length === 1 && (
        <p className="text-sm font-medium text-white/70">{categories[0].name}</p>
      )}

      {/* Macrocycle Card */}
      {macroMonth && (
        <div
          className="rounded-xl p-4 border"
          style={{
            backgroundColor: `${macroMonth.periodColor}15`,
            borderColor: `${macroMonth.periodColor}4D`,
          }}
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
            <span className="text-xs text-white/50">{macroMonth.label}</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-white font-semibold text-base">
              {macroMonth.fundamentoTecnico.label}
            </span>
            <Badge className={cn('text-[10px] uppercase border', nivelColors[macroMonth.fundamentoTecnico.nivel])}>
              {macroMonth.fundamentoTecnico.nivel}
            </Badge>
          </div>
          <p className="text-xs text-white/50 mt-1.5 leading-relaxed">
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
        <div className="rounded-xl p-4 border border-green-500/30 bg-green-500/10">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-green-400 font-semibold">Sesión planificada</span>
          </div>
          <p className="text-xs text-white/50 ml-7">
            {todaySession.fundamento_mes}
            {todaySession.restriccion_rondo && ` · ${todaySession.restriccion_rondo}`}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 ml-7 border-white/20 text-white/70"
            onClick={() => {/* TODO: detail view */}}
          >
            Ver detalle
          </Button>
        </div>
      )}

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white/80 mb-3">Sesiones recientes</h3>
          <div className="space-y-2">
            {recentSessions.map(session => (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-3.5 h-3.5 text-white/40 shrink-0" />
                    <span className="text-xs text-white/50">
                      {format(parseISO(session.session_date), "EEE d MMM", { locale: es })}
                    </span>
                  </div>
                  <p className="text-sm text-white/80 mt-0.5 truncate">
                    {session.fundamento_mes}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {session.observaciones_partido && Object.keys(session.observaciones_partido as object).length > 0 && (
                    <span className="text-[10px] text-white/30">⚽</span>
                  )}
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] border',
                      session.status === 'completada' && 'border-green-500/30 text-green-400',
                      session.status === 'activa' && 'border-[#C9A227]/30 text-[#C9A227]',
                      session.status === 'borrador' && 'border-white/20 text-white/40',
                    )}
                  >
                    {session.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
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
