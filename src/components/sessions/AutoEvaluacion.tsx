import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUpdateSessionPlan } from '@/hooks/useSessionPlans';
import { toast } from 'sonner';

interface Props {
  sessionPlanId: string;
  onComplete: () => void;
}

type ScoreKey = 'planificacion' | 'gestion' | 'feedback' | 'sistema_wl';

interface Question {
  key: ScoreKey;
  title: string;
  question: string;
  options: [string, string, string];
}

const QUESTIONS: Question[] = [
  {
    key: 'planificacion',
    title: 'PLANIFICACIÓN',
    question: '¿Llegué con la sesión planificada?',
    options: ['Improvisé', 'Tenía estructura', 'Ficha completa'],
  },
  {
    key: 'gestion',
    title: 'GESTIÓN DEL GRUPO',
    question: '¿Cuánto tiempo jugaron los jugadores?',
    options: ['Interrumpí mucho', 'Balance parcial', 'Jugaron 80%+'],
  },
  {
    key: 'feedback',
    title: 'FEEDBACK',
    question: '¿Cómo fue mi feedback durante la sesión?',
    options: [
      'Corregí errores en público',
      'Solo feedback colectivo',
      'Feedback específico y positivo',
    ],
  },
  {
    key: 'sistema_wl',
    title: 'SISTEMA WL',
    question: '¿Apliqué el vocabulario y los principios WL?',
    options: ['No usé el vocabulario', 'Con recordatorio', 'Espontáneamente'],
  },
];

export function AutoEvaluacion({ sessionPlanId, onComplete }: Props) {
  const [scores, setScores] = useState<Record<ScoreKey, number | null>>({
    planificacion: null,
    gestion: null,
    feedback: null,
    sistema_wl: null,
  });

  const updateSession = useUpdateSessionPlan();

  const handleSave = async () => {
    const autoeval = {
      planificacion: scores.planificacion || 0,
      gestion: scores.gestion || 0,
      feedback: scores.feedback || 0,
      sistema_wl: scores.sistema_wl || 0,
    };

    try {
      await updateSession.mutateAsync({
        id: sessionPlanId,
        data: {
          autoevaluacion: autoeval,
          status: 'completada',
        },
      });
      toast.success('✓ Sesión completada');
      onComplete();
    } catch {
      toast.error('Error al guardar auto-evaluación');
    }
  };

  const handleSkip = async () => {
    try {
      await updateSession.mutateAsync({
        id: sessionPlanId,
        data: { status: 'completada' },
      });
      onComplete();
    } catch {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0F1117] flex flex-col text-white overflow-y-auto">
      <div className="p-6 flex-1">
        <h2 className="text-xl font-bold mb-1">Auto-evaluación post-sesión</h2>
        <p className="text-sm text-white/40 mb-6">2 minutos · Opcional</p>

        <div className="space-y-6">
          {QUESTIONS.map(q => (
            <div key={q.key}>
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">
                {q.title}
              </p>
              <p className="text-sm text-white/80 mb-3">{q.question}</p>
              <div className="flex gap-2">
                {q.options.map((label, idx) => {
                  const value = idx + 1;
                  const selected = scores[q.key] === value;
                  return (
                    <button
                      key={value}
                      onClick={() => setScores(prev => ({ ...prev, [q.key]: value }))}
                      className={cn(
                        'flex-1 py-3 px-2 rounded-lg text-xs font-medium text-center transition-all border',
                        selected
                          ? 'bg-[#C9A227]/20 border-[#C9A227]/50 text-[#C9A227]'
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                      )}
                    >
                      <span className="block text-lg font-bold mb-0.5">{value}</span>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-3 pb-safe">
        <Button
          onClick={handleSave}
          disabled={updateSession.isPending}
          className="w-full h-14 bg-[#C9A227] hover:bg-[#B8922A] text-black font-semibold text-base"
        >
          {updateSession.isPending ? 'Guardando...' : 'Guardar auto-evaluación'}
        </Button>
        <button
          onClick={handleSkip}
          className="w-full text-center text-sm text-white/40 hover:text-white/60 py-2"
        >
          Omitir
        </button>
      </div>
    </div>
  );
}
