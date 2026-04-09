import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { getCurrentMacroMonth } from '@/config/wl-macrociclo';
import { useCreateSessionPlan } from '@/hooks/useSessionPlans';
import { useRestrictionBank, useRecentRestrictions } from '@/hooks/useRestrictionBank';
import { toast } from 'sonner';
import type { TrainerCategory } from '@/hooks/useTrainerCategories';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface Props {
  categoryId: string;
  categoryName: string;
  ageGroup: string;
  onClose: () => void;
  onSaved: () => void;
  categories?: TrainerCategory[];
}

interface FormData {
  fundamento_mes: string;
  fundamento_nivel: 'intro' | 'desar' | 'cons';
  restriccion_rondo: string;
  juego_posicional: string;
  foco_partido: string;
  pregunta_cierre: string;
}

function normalizeAgeGroup(categoryAgeGroup: string): string {
  const ag = categoryAgeGroup?.toLowerCase() || '';
  if (ag.includes('5') && ag.includes('6')) return 'sub-6';
  if (ag.includes('biberón') || ag.includes('biberon')) return 'sub-5';
  if (ag.includes('escuelita')) return 'sub-6';
  if (ag.includes('sub-5') || ag === '5') return 'sub-5';
  if (ag.includes('sub-6') || ag === '6') return 'sub-6';
  if (ag.includes('sub-8') || ag.includes('8')) return 'sub-8';
  if (ag.includes('sub-10') || ag.includes('10')) return 'sub-10';
  if (ag.includes('sub-12') || ag.includes('12')) return 'sub-12';
  if (ag.includes('sub-13') || ag.includes('13')) return 'sub-13';
  if (ag.includes('juvenil')) return 'sub-13';
  return 'sub-10';
}

const NIVELES = [
  { value: 'intro' as const, label: 'INTRO', color: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30' },
  { value: 'desar' as const, label: 'DESAR', color: 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30' },
  { value: 'cons' as const, label: 'CONS', color: 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30' },
];

function getCierreQuestions(ageGroup: string): string[] {
  const ag = normalizeAgeGroup(ageGroup);
  if (ag === 'sub-5' || ag === 'sub-6') {
    return [
      '¿Qué fue lo mejor de hoy?',
      '¿Con quién hiciste el mejor pase?',
      '¿Qué quieres practicar la próxima sesión?',
    ];
  }
  if (ag === 'sub-8' || ag === 'sub-10') {
    return [
      '¿Cuándo dijimos disponemos hoy?',
      '¿Por qué orientamos el primer toque?',
      '¿Qué mejoró el equipo hoy?',
    ];
  }
  return [
    '¿Qué decidiste tú — no el entrenador — en el partido?',
    '¿Por qué no podemos estar 2 jugadores en el mismo pasillo?',
    '¿Qué cambiarías de tu actuación hoy?',
  ];
}

export function PlanificarSesion({ categoryId: initialCategoryId, categoryName: initialCategoryName, ageGroup: initialAgeGroup, onClose, onSaved, categories }: Props) {
  const macroMonth = getCurrentMacroMonth();
  const [currentStep, setCurrentStep] = useState(1);
  const [activeCategoryId, setActiveCategoryId] = useState(initialCategoryId);
  const [activeCategoryName, setActiveCategoryName] = useState(initialCategoryName);
  const [activeAgeGroup, setActiveAgeGroup] = useState(initialAgeGroup);

  const [formData, setFormData] = useState<FormData>({
    fundamento_mes: macroMonth?.fundamentoTecnico.key || '',
    fundamento_nivel: macroMonth?.fundamentoTecnico.nivel || 'intro',
    restriccion_rondo: '',
    juego_posicional: '',
    foco_partido: '',
    pregunta_cierre: '',
  });

  const [showCustomRestriction, setShowCustomRestriction] = useState(false);
  const [showCustomJuego, setShowCustomJuego] = useState(false);
  const [showCustomFoco, setShowCustomFoco] = useState(false);
  const [showCustomCierre, setShowCustomCierre] = useState(false);

  const createMutation = useCreateSessionPlan();
  const normalizedAge = normalizeAgeGroup(activeAgeGroup);
  const { restrictions, isLoading: loadingRestrictions } = useRestrictionBank(formData.fundamento_mes, normalizedAge);
  const { recentRestrictions } = useRecentRestrictions(activeCategoryId);

  const [showAllRestrictions, setShowAllRestrictions] = useState(false);

  const update = (field: keyof FormData, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const handleCategoryChange = (catId: string) => {
    const cat = categories?.find(c => c.id === catId);
    if (!cat) return;
    setActiveCategoryId(cat.id);
    setActiveCategoryName(cat.name);
    setActiveAgeGroup(cat.age_group);
    // Reset restriction since age group may differ
    update('restriccion_rondo', '');
  };

  const handleSave = async (status: 'activa' | 'borrador') => {
    if (!macroMonth) return;
    try {
      await createMutation.mutateAsync({
        category_id: activeCategoryId,
        session_date: new Date().toISOString().slice(0, 10),
        macrocycle_month: macroMonth.month,
        macrocycle_period: macroMonth.period,
        period_color: macroMonth.periodColor,
        fundamento_mes: formData.fundamento_mes,
        fundamento_nivel: formData.fundamento_nivel,
        restriccion_rondo: formData.restriccion_rondo || undefined,
        juego_posicional: formData.juego_posicional || undefined,
        foco_partido: formData.foco_partido || undefined,
        pregunta_cierre: formData.pregunta_cierre || undefined,
        status,
      });
      if (status === 'activa') {
        toast.success('¡Sesión planificada ✓');
      }
      onSaved();
    } catch {
      toast.error('Error al guardar la sesión');
    }
  };

  const visibleRestrictions = restrictions.slice(0, 3);
  const cierreQuestions = getCierreQuestions(activeAgeGroup);
  const juegoOptions = macroMonth?.juegosPosicionales || [];
  const focoOptions = macroMonth?.focosSugeridos || [];

  return (
    <div className="min-h-screen -mx-3 sm:-mx-4 -mt-4 sm:-mt-6 px-4 py-4 bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-foreground font-semibold text-base">Planificar sesión</h2>
          <p className="text-xs text-muted-foreground truncate">{activeCategoryName}</p>
        </div>
      </div>

      {/* Category selector in wizard */}
      {categories && categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none mb-4">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={cn(
                'shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all border',
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

      {/* Progress Dots */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {[1, 2, 3, 4, 5].map(step => (
          <div
            key={step}
            className={cn(
              'w-2.5 h-2.5 rounded-full transition-colors',
              step === currentStep ? 'bg-[#C9A227]' :
              step < currentStep ? 'bg-[#C9A227]/40' : 'bg-muted-foreground/20'
            )}
          />
        ))}
      </div>

      {/* Step Content */}
      <div className="space-y-4 pb-24">
        {/* PASO 1 — Fundamento */}
        {currentStep === 1 && (
          <>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Fundamento del mes</label>
            <p className="text-xl text-foreground font-semibold">{macroMonth?.fundamentoTecnico.label}</p>
            <div className="flex gap-2 mt-3">
              {NIVELES.map(n => (
                <button
                  key={n.value}
                  onClick={() => update('fundamento_nivel', n.value)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-xs font-bold border transition-all',
                    formData.fundamento_nivel === n.value
                      ? `${n.color} ring-1 ring-[#C9A227]`
                      : 'border-border text-muted-foreground'
                  )}
                >
                  {n.label}
                </button>
              ))}
            </div>
            {macroMonth && (
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                📋 {macroMonth.indicadoresActivos.tecnico}
              </p>
            )}
          </>
        )}

        {/* PASO 2 — Restricción */}
        {currentStep === 2 && (
          <>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Restricción del rondo</label>
            {loadingRestrictions ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#C9A227]" />
              </div>
            ) : (
              <div className="space-y-2">
                {visibleRestrictions.map(r => {
                  const isRecent = recentRestrictions.includes(r.restriccion);
                  return (
                    <button
                      key={r.id}
                      onClick={() => { update('restriccion_rondo', r.restriccion); setShowCustomRestriction(false); }}
                      className={cn(
                        'w-full text-left p-3 rounded-lg border transition-all',
                        formData.restriccion_rondo === r.restriccion
                          ? 'border-[#C9A227] bg-[#C9A227]/10'
                          : 'border-border bg-muted/50'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {r.es_recomendada && (
                          <span className="text-[#C9A227] mt-0.5 shrink-0">•</span>
                        )}
                        <p className="text-sm text-foreground/80 flex-1 min-w-0">{r.restriccion}</p>
                      </div>
                      {isRecent && (
                        <p className="text-[10px] text-orange-500/70 mt-1">⚠ Usada recientemente</p>
                      )}
                    </button>
                  );
                })}

                {restrictions.length > 3 && (
                  <Sheet open={showAllRestrictions} onOpenChange={setShowAllRestrictions}>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-[#C9A227] text-xs w-full">
                        Ver más ({restrictions.length - 3} más)
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
                      <SheetHeader>
                        <SheetTitle>Todas las restricciones</SheetTitle>
                      </SheetHeader>
                      <div className="space-y-2 mt-4">
                        {restrictions.map(r => (
                          <button
                            key={r.id}
                            onClick={() => {
                              update('restriccion_rondo', r.restriccion);
                              setShowAllRestrictions(false);
                              setShowCustomRestriction(false);
                            }}
                            className={cn(
                              'w-full text-left p-3 rounded-lg border transition-all',
                              formData.restriccion_rondo === r.restriccion
                                ? 'border-[#C9A227] bg-[#C9A227]/10'
                                : 'border-border bg-muted/50'
                            )}
                          >
                            <div className="flex items-start gap-2">
                              {r.es_recomendada && <span className="text-[#C9A227] mt-0.5 shrink-0">•</span>}
                              <p className="text-sm text-foreground/80">{r.restriccion}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </SheetContent>
                  </Sheet>
                )}

                {!showCustomRestriction ? (
                  <button
                    onClick={() => setShowCustomRestriction(true)}
                    className="text-xs text-[#C9A227] hover:underline mt-1"
                  >
                    Escribir restricción propia →
                  </button>
                ) : (
                  <Input
                    autoFocus
                    placeholder="Ej: el receptor orienta el primer toque fuera del cuadrado"
                    value={restrictions.some(r => r.restriccion === formData.restriccion_rondo) ? '' : formData.restriccion_rondo}
                    onChange={e => update('restriccion_rondo', e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>
            )}
          </>
        )}

        {/* PASO 3 — Juego posicional */}
        {currentStep === 3 && (
          <>
            {macroMonth && (
              <div className="rounded-lg p-3 bg-[#C9A227]/10 border border-[#C9A227]/20 mb-2">
                <p className="text-xs text-[#C9A227]">
                  📌 Foco táctico: {macroMonth.focoTactico}
                </p>
              </div>
            )}
            <label className="text-xs text-muted-foreground uppercase tracking-wider">
              Juego posicional / Situación
            </label>
            <div className="space-y-2">
              {juegoOptions.map((option, i) => (
                <button
                  key={i}
                  onClick={() => { update('juego_posicional', option); setShowCustomJuego(false); }}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border transition-all',
                    formData.juego_posicional === option
                      ? 'border-[#C9A227] bg-[#C9A227]/10'
                      : 'border-border bg-muted/50'
                  )}
                >
                  <p className="text-sm text-foreground/80">{option}</p>
                </button>
              ))}
            </div>
            {!showCustomJuego ? (
              <button
                onClick={() => setShowCustomJuego(true)}
                className="text-xs text-[#C9A227] hover:underline mt-1"
              >
                Personalizar →
              </button>
            ) : (
              <div className="relative mt-2">
                <Textarea
                  autoFocus
                  placeholder="Escribe tu juego posicional..."
                  value={juegoOptions.includes(formData.juego_posicional) ? '' : formData.juego_posicional}
                  onChange={e => {
                    if (e.target.value.length <= 200) update('juego_posicional', e.target.value);
                  }}
                  className="min-h-[80px] resize-none"
                />
                <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground">
                  {(juegoOptions.includes(formData.juego_posicional) ? 0 : formData.juego_posicional.length)}/200
                </span>
              </div>
            )}
          </>
        )}

        {/* PASO 4 — Foco del partido */}
        {currentStep === 4 && (
          <>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Foco del partido</label>
            <p className="text-xs text-muted-foreground mb-2">
              Esta frase aparecerá fija durante el partido para guiar tu observación.
            </p>
            <div className="space-y-2">
              {focoOptions.map((option, i) => (
                <button
                  key={i}
                  onClick={() => { update('foco_partido', option); setShowCustomFoco(false); }}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border transition-all',
                    formData.foco_partido === option
                      ? 'border-[#C9A227] bg-[#C9A227]/10'
                      : 'border-border bg-muted/50'
                  )}
                >
                  <p className="text-sm text-foreground/80">{option}</p>
                </button>
              ))}
            </div>
            {!showCustomFoco ? (
              <button
                onClick={() => setShowCustomFoco(true)}
                className="text-xs text-[#C9A227] hover:underline mt-1"
              >
                Escribir foco propio →
              </button>
            ) : (
              <Input
                autoFocus
                placeholder="Ej: ¿Orienta antes de recibir?"
                value={focoOptions.includes(formData.foco_partido) ? '' : formData.foco_partido}
                onChange={e => {
                  if (e.target.value.length <= 60) update('foco_partido', e.target.value);
                }}
                className="mt-2"
              />
            )}
          </>
        )}

        {/* PASO 5 — Pregunta del cierre */}
        {currentStep === 5 && (
          <>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Pregunta del cierre</label>
            <div className="space-y-2 mt-1">
              {cierreQuestions.map(q => (
                <button
                  key={q}
                  onClick={() => { update('pregunta_cierre', q); setShowCustomCierre(false); }}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border transition-all text-sm',
                    formData.pregunta_cierre === q
                      ? 'border-[#C9A227] bg-[#C9A227]/10 text-foreground'
                      : 'border-border bg-muted/50 text-foreground/60'
                  )}
                >
                  {q}
                </button>
              ))}
            </div>
            {!showCustomCierre ? (
              <button
                onClick={() => setShowCustomCierre(true)}
                className="text-xs text-[#C9A227] hover:underline mt-1"
              >
                Escribir pregunta propia →
              </button>
            ) : (
              <Input
                autoFocus
                placeholder="O escribe la tuya..."
                value={cierreQuestions.includes(formData.pregunta_cierre) ? '' : formData.pregunta_cierre}
                onChange={e => update('pregunta_cierre', e.target.value)}
                className="mt-2"
              />
            )}
          </>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 p-4 bg-background border-t border-border space-y-2 z-40">
        {currentStep < 5 ? (
          <Button
            onClick={() => setCurrentStep(s => Math.min(s + 1, 5) as 1 | 2 | 3 | 4 | 5)}
            className="w-full h-12 bg-[#C9A227] hover:bg-[#B8922A] text-black font-semibold"
          >
            Siguiente →
          </Button>
        ) : (
          <>
            <Button
              onClick={() => handleSave('activa')}
              disabled={createMutation.isPending}
              className="w-full h-12 bg-[#C9A227] hover:bg-[#B8922A] text-black font-semibold"
            >
              {createMutation.isPending ? 'Guardando...' : 'Guardar sesión'}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSave('borrador')}
              disabled={createMutation.isPending}
              className="w-full"
            >
              Guardar borrador
            </Button>
          </>
        )}
        {currentStep > 1 && (
          <Button
            variant="ghost"
            onClick={() => setCurrentStep(s => Math.max(s - 1, 1) as 1 | 2 | 3 | 4 | 5)}
            className="w-full text-muted-foreground"
          >
            ← Atrás
          </Button>
        )}
      </div>
    </div>
  );
}
