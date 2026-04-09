import { useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getCurrentMacroMonth } from '@/config/wl-macrociclo';
import { useCreateSessionPlan } from '@/hooks/useSessionPlans';
import { useRestrictionBank, useRecentRestrictions } from '@/hooks/useRestrictionBank';
import { toast } from 'sonner';
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
}

interface FormData {
  fundamento_mes: string;
  fundamento_nivel: 'intro' | 'desar' | 'cons';
  restriccion_rondo: string;
  juego_posicional: string;
  foco_partido: string;
  pregunta_cierre: string;
}

const NIVELES = [
  { value: 'intro' as const, label: 'INTRO', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'desar' as const, label: 'DESAR', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 'cons' as const, label: 'CONS', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
];

function getCierreQuestions(ageGroup: string): string[] {
  const ag = ageGroup.toLowerCase();
  if (ag.includes('sub-5') || ag.includes('sub-6')) {
    return [
      '¿Qué fue lo mejor de hoy?',
      '¿Con quién hiciste el mejor pase?',
      '¿Qué quieres practicar la próxima sesión?',
    ];
  }
  if (ag.includes('sub-8') || ag.includes('sub-10')) {
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

export function PlanificarSesion({ categoryId, categoryName, ageGroup, onClose, onSaved }: Props) {
  const macroMonth = getCurrentMacroMonth();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    fundamento_mes: macroMonth?.fundamentoTecnico.key || '',
    fundamento_nivel: macroMonth?.fundamentoTecnico.nivel || 'intro',
    restriccion_rondo: '',
    juego_posicional: '',
    foco_partido: '',
    pregunta_cierre: '',
  });

  const createMutation = useCreateSessionPlan();
  const { restrictions, isLoading: loadingRestrictions } = useRestrictionBank(formData.fundamento_mes, ageGroup);
  const { recentRestrictions } = useRecentRestrictions(categoryId);

  const [showAllRestrictions, setShowAllRestrictions] = useState(false);

  const update = (field: keyof FormData, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const handleSave = async (status: 'activa' | 'borrador') => {
    if (!macroMonth) return;
    try {
      await createMutation.mutateAsync({
        category_id: categoryId,
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
  const cierreQuestions = getCierreQuestions(ageGroup);

  return (
    <div className="min-h-screen -mx-3 sm:-mx-4 -mt-4 sm:-mt-6 px-4 py-4" style={{ background: '#0F1117' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onClose} className="text-white/60 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-white font-semibold text-base">Planificar sesión</h2>
          <p className="text-xs text-white/40">{categoryName}</p>
        </div>
      </div>

      {/* Progress Dots */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {[1, 2, 3, 4, 5].map(step => (
          <div
            key={step}
            className={cn(
              'w-2.5 h-2.5 rounded-full transition-colors',
              step === currentStep ? 'bg-[#C9A227]' :
              step < currentStep ? 'bg-[#C9A227]/40' : 'bg-white/15'
            )}
          />
        ))}
      </div>

      {/* Step Content */}
      <div className="space-y-4 pb-24">
        {currentStep === 1 && (
          <>
            <label className="text-xs text-white/50 uppercase tracking-wider">Fundamento del mes</label>
            <p className="text-xl text-white font-semibold">{macroMonth?.fundamentoTecnico.label}</p>
            <div className="flex gap-2 mt-3">
              {NIVELES.map(n => (
                <button
                  key={n.value}
                  onClick={() => update('fundamento_nivel', n.value)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-xs font-bold border transition-all',
                    formData.fundamento_nivel === n.value
                      ? `${n.color} ring-1 ring-[#C9A227]`
                      : 'border-white/10 text-white/30'
                  )}
                >
                  {n.label}
                </button>
              ))}
            </div>
            {macroMonth && (
              <p className="text-xs text-white/40 mt-3 leading-relaxed">
                📋 {macroMonth.indicadoresActivos.tecnico}
              </p>
            )}
          </>
        )}

        {currentStep === 2 && (
          <>
            <label className="text-xs text-white/50 uppercase tracking-wider">Restricción del rondo</label>
            {loadingRestrictions ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#C9A227]" />
              </div>
            ) : (
              <div className="space-y-2">
                {visibleRestrictions.map((r, i) => {
                  const isRecent = recentRestrictions.includes(r.restriccion);
                  return (
                    <button
                      key={r.id}
                      onClick={() => update('restriccion_rondo', r.restriccion)}
                      className={cn(
                        'w-full text-left p-3 rounded-lg border transition-all',
                        formData.restriccion_rondo === r.restriccion
                          ? 'border-[#C9A227] bg-[#C9A227]/10'
                          : 'border-white/10 bg-white/5'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white/80">{r.restriccion}</p>
                          {r.descripcion && (
                            <p className="text-xs text-white/40 mt-0.5">{r.descripcion}</p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {r.es_recomendada && (
                            <Badge className="text-[9px] bg-[#C9A227]/20 text-[#C9A227] border-[#C9A227]/30 border">
                              Recomendada
                            </Badge>
                          )}
                        </div>
                      </div>
                      {isRecent && (
                        <p className="text-[10px] text-orange-400/70 mt-1">⚠ Usada recientemente</p>
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
                    <SheetContent side="bottom" className="bg-[#0F1117] border-white/10 max-h-[70vh] overflow-y-auto">
                      <SheetHeader>
                        <SheetTitle className="text-white">Todas las restricciones</SheetTitle>
                      </SheetHeader>
                      <div className="space-y-2 mt-4">
                        {restrictions.map(r => (
                          <button
                            key={r.id}
                            onClick={() => {
                              update('restriccion_rondo', r.restriccion);
                              setShowAllRestrictions(false);
                            }}
                            className={cn(
                              'w-full text-left p-3 rounded-lg border transition-all',
                              formData.restriccion_rondo === r.restriccion
                                ? 'border-[#C9A227] bg-[#C9A227]/10'
                                : 'border-white/10 bg-white/5'
                            )}
                          >
                            <p className="text-sm text-white/80">{r.restriccion}</p>
                            {r.es_recomendada && (
                              <Badge className="text-[9px] bg-[#C9A227]/20 text-[#C9A227] border-[#C9A227]/30 border mt-1">
                                Recomendada
                              </Badge>
                            )}
                          </button>
                        ))}
                      </div>
                    </SheetContent>
                  </Sheet>
                )}

                <Input
                  placeholder="O escribe la tuya..."
                  value={restrictions.some(r => r.restriccion === formData.restriccion_rondo) ? '' : formData.restriccion_rondo}
                  onChange={e => update('restriccion_rondo', e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 mt-2"
                />
              </div>
            )}
          </>
        )}

        {currentStep === 3 && (
          <>
            {macroMonth && (
              <div className="rounded-lg p-3 bg-[#C9A227]/10 border border-[#C9A227]/20 mb-2">
                <p className="text-xs text-[#C9A227]">
                  📌 Foco táctico del mes: {macroMonth.focoTactico}
                </p>
              </div>
            )}
            <label className="text-xs text-white/50 uppercase tracking-wider">
              Juego posicional / Situación
            </label>
            <div className="relative">
              <Textarea
                placeholder={`Escribe la regla del juego de posición basada en: ${macroMonth?.focoTactico || ''}`}
                value={formData.juego_posicional}
                onChange={e => {
                  if (e.target.value.length <= 200) update('juego_posicional', e.target.value);
                }}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[100px] resize-none"
              />
              <span className="absolute bottom-2 right-3 text-[10px] text-white/30">
                {formData.juego_posicional.length}/200
              </span>
            </div>
          </>
        )}

        {currentStep === 4 && (
          <>
            <label className="text-xs text-white/50 uppercase tracking-wider">Foco del partido</label>
            <p className="text-xs text-white/40 mb-2">
              Esta frase aparecerá fija durante el partido para guiar tu observación.
            </p>
            <div className="relative">
              <Input
                placeholder={`Foco basado en: ${macroMonth?.fundamentoTecnico.label || ''}`}
                value={formData.foco_partido}
                onChange={e => {
                  if (e.target.value.length <= 60) update('foco_partido', e.target.value);
                }}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
              <span className="absolute top-1/2 -translate-y-1/2 right-3 text-[10px] text-white/30">
                {formData.foco_partido.length}/60
              </span>
            </div>
            <div className="rounded-lg p-2.5 bg-blue-500/10 border border-blue-500/20 mt-1">
              <p className="text-[11px] text-blue-400">
                💡 Tip: una sola frase, observable, sin tecnicismos — ej: ¿Orienta antes de recibir?
              </p>
            </div>
          </>
        )}

        {currentStep === 5 && (
          <>
            <label className="text-xs text-white/50 uppercase tracking-wider">Pregunta del cierre</label>
            <div className="space-y-2 mt-1">
              {cierreQuestions.map(q => (
                <button
                  key={q}
                  onClick={() => update('pregunta_cierre', q)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border transition-all text-sm',
                    formData.pregunta_cierre === q
                      ? 'border-[#C9A227] bg-[#C9A227]/10 text-white'
                      : 'border-white/10 bg-white/5 text-white/60'
                  )}
                >
                  {q}
                </button>
              ))}
            </div>
            <Input
              placeholder="O escribe la tuya..."
              value={cierreQuestions.includes(formData.pregunta_cierre) ? '' : formData.pregunta_cierre}
              onChange={e => update('pregunta_cierre', e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 mt-2"
            />
          </>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 p-4 bg-[#0F1117] border-t border-white/10 space-y-2 z-40">
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
              className="w-full border-white/20 text-white/70"
            >
              Guardar borrador
            </Button>
          </>
        )}
        {currentStep > 1 && (
          <Button
            variant="ghost"
            onClick={() => setCurrentStep(s => Math.max(s - 1, 1) as 1 | 2 | 3 | 4 | 5)}
            className="w-full text-white/40"
          >
            ← Atrás
          </Button>
        )}
      </div>
    </div>
  );
}
