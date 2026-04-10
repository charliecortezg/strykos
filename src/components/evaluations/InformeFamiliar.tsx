import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Copy, X } from 'lucide-react';
import { toast } from 'sonner';
import { getCurrentMacroMonth } from '@/config/wl-macrociclo';

const DIMENSIONS = ['tecnico', 'tactico', 'coordinativo', 'psicologico'] as const;
const DIM_LABELS: Record<string, string> = {
  tecnico: 'Técnico',
  tactico: 'Táctico',
  coordinativo: 'Coordinativo',
  psicologico: 'Psicológico',
};

const TIPS_CASA: Record<string, string> = {
  tecnico: 'Pueden preguntarle qué restricción trabajó hoy en el rondo',
  tactico: 'Pueden preguntarle: ¿cuándo decimos disponemos? ¿Y recuperamos?',
  coordinativo: 'Pueden hacer 5 minutos de conducción libre en casa o en el parque',
  psicologico: 'Pregúntenle qué fue lo mejor de la sesión de hoy — no el resultado',
};

const FORTALEZA_TEXTOS: Record<string, string> = {
  tecnico: 'Su mayor fortaleza este mes fue el fundamento técnico. Mostró dominio y confianza en la ejecución durante las sesiones de juego real.',
  tactico: 'Su mayor fortaleza este mes fue la comprensión táctica. Demostró aplicar los momentos del juego con mayor autonomía.',
  coordinativo: 'Su mayor fortaleza este mes fue la dimensión coordinativa. Su coordinación ojo-pie y orientación espacial mostraron un avance notable.',
  psicologico: 'Su mayor fortaleza este mes fue la actitud y resiliencia. Mostró comunicación vocal activa, liderazgo y buena respuesta ante el error.',
};

const TRABAJO_TEXTOS: Record<string, string> = {
  tecnico: 'El área de trabajo para el próximo mes es la dimensión técnica. Seguiremos fortaleciendo la ejecución de fundamentos en situaciones de juego con mayor presión.',
  tactico: 'El área de trabajo para el próximo mes es la dimensión táctica. Continuaremos reforzando la aplicación del modelo de juego: momentos, zonas y posicionamiento.',
  coordinativo: 'El área de trabajo para el próximo mes es la dimensión coordinativa. Trabajaremos en mejorar la orientación espacial y la velocidad de reacción.',
  psicologico: 'El área de trabajo para el próximo mes es la dimensión psicológica. Seguiremos fomentando la comunicación vocal, resiliencia y respuesta positiva al error.',
};

interface Props {
  playerId: string;
  playerName: string;
  ageGroup: string;
  eventId: string;
  categoryName: string;
  onClose: () => void;
}

export function InformeFamiliar({ playerId, playerName, ageGroup, eventId, categoryName, onClose }: Props) {
  const macroMonth = getCurrentMacroMonth();

  // Get current event scores
  const { data: currentScores = {} } = useQuery({
    queryKey: ['informe-scores', playerId, eventId],
    queryFn: async () => {
      const { data: evals } = await supabase
        .from('evaluations')
        .select('id')
        .eq('player_id', playerId)
        .eq('event_id', eventId)
        .limit(1);

      if (!evals?.length) return {};

      const { data: scores } = await supabase
        .from('evaluation_scores')
        .select('stat_key, score')
        .eq('evaluation_id', evals[0].id);

      const map: Record<string, number> = {};
      for (const s of scores || []) map[s.stat_key] = s.score;
      return map;
    },
  });

  // Get previous event scores for comparison
  const { data: prevScores = {} } = useQuery({
    queryKey: ['informe-prev-scores', playerId, eventId],
    queryFn: async () => {
      // Find the event before this one
      const { data: currentEvent } = await supabase
        .from('evaluation_events')
        .select('event_date, organization_id')
        .eq('id', eventId)
        .single();

      if (!currentEvent?.event_date) return {};

      const { data: prevEvents } = await supabase
        .from('evaluation_events')
        .select('id')
        .eq('organization_id', currentEvent.organization_id)
        .eq('status', 'closed')
        .lt('event_date', currentEvent.event_date)
        .order('event_date', { ascending: false })
        .limit(1);

      if (!prevEvents?.length) return {};

      const { data: evals } = await supabase
        .from('evaluations')
        .select('id')
        .eq('player_id', playerId)
        .eq('event_id', prevEvents[0].id)
        .limit(1);

      if (!evals?.length) return {};

      const { data: scores } = await supabase
        .from('evaluation_scores')
        .select('stat_key, score')
        .eq('evaluation_id', evals[0].id);

      const map: Record<string, number> = {};
      for (const s of scores || []) map[s.stat_key] = s.score;
      return map;
    },
  });

  // Generate report texts
  const generated = useMemo(() => {
    const dims = DIMENSIONS.filter(d => currentScores[d] !== undefined);
    if (dims.length === 0) return null;

    // Find fortaleza: highest score or biggest improvement
    let fortalezaDim = dims[0];
    let maxScore = -1;
    let maxImprovement = -Infinity;

    for (const dim of dims) {
      const score = currentScores[dim] || 0;
      const prev = prevScores[dim];
      const improvement = prev !== undefined ? score - prev : 0;

      if (improvement > maxImprovement || (improvement === maxImprovement && score > maxScore)) {
        maxImprovement = improvement;
        fortalezaDim = dim;
        maxScore = score;
      }
    }

    // If no improvement anywhere, just use highest score
    if (maxImprovement <= 0) {
      for (const dim of dims) {
        if ((currentScores[dim] || 0) > maxScore) {
          maxScore = currentScores[dim] || 0;
          fortalezaDim = dim;
        }
      }
    }

    // Find area de trabajo: lowest score
    let trabajoDim = dims[0];
    let minScore = Infinity;
    for (const dim of dims) {
      if ((currentScores[dim] || 0) < minScore) {
        minScore = currentScores[dim] || 0;
        trabajoDim = dim;
      }
    }

    // Avoid same dimension for both
    if (trabajoDim === fortalezaDim && dims.length > 1) {
      const sorted = [...dims].sort((a, b) => (currentScores[a] || 0) - (currentScores[b] || 0));
      trabajoDim = sorted[0] === fortalezaDim ? sorted[1] : sorted[0];
    }

    return {
      fortaleza: FORTALEZA_TEXTOS[fortalezaDim] || '',
      trabajo: TRABAJO_TEXTOS[trabajoDim] || '',
      casa: TIPS_CASA[trabajoDim] || '',
      fortalezaDim,
      trabajoDim,
    };
  }, [currentScores, prevScores]);

  const [fortalezaText, setFortalezaText] = useState('');
  const [trabajoText, setTrabajoText] = useState('');
  const [casaText, setCasaText] = useState('');
  const [initialized, setInitialized] = useState(false);

  // Initialize editable text when generated changes
  if (generated && !initialized) {
    setFortalezaText(generated.fortaleza);
    setTrabajoText(generated.trabajo);
    setCasaText(generated.casa);
    setInitialized(true);
  }

  const handleCopy = async () => {
    const fullText = `Informe — ${playerName}
${categoryName} | ${macroMonth?.label || ''}

🌟 FORTALEZA DEL MES
${fortalezaText}

📋 ÁREA DE TRABAJO
${trabajoText}

🏠 CÓMO APOYAR EN CASA
${casaText}

—
Este informe no incluye comparaciones con otros jugadores ni calificaciones numéricas.`;

    try {
      await navigator.clipboard.writeText(fullText);
      toast.success('Informe copiado al portapapeles');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  if (!generated) {
    return (
      <div className="space-y-4 p-4">
        <p className="text-muted-foreground text-sm">No hay scores disponibles para generar el informe.</p>
        <Button variant="outline" onClick={onClose}>Cerrar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-display font-semibold">Informe — {playerName}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">{ageGroup}</Badge>
            {macroMonth && (
              <Badge className="text-xs" style={{ backgroundColor: macroMonth.periodColor + '20', color: macroMonth.periodColor, borderColor: macroMonth.periodColor + '40' }}>
                {macroMonth.label}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Fortaleza */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-base">🌟</span>
          <h4 className="font-semibold text-sm">Fortaleza del mes</h4>
          <Badge variant="outline" className="text-xs">{DIM_LABELS[generated.fortalezaDim]}</Badge>
        </div>
        <Textarea
          value={fortalezaText}
          onChange={e => setFortalezaText(e.target.value)}
          className="min-h-[80px] text-sm"
        />
      </div>

      {/* Área de trabajo */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-base">📋</span>
          <h4 className="font-semibold text-sm">Área de trabajo</h4>
          <Badge variant="outline" className="text-xs">{DIM_LABELS[generated.trabajoDim]}</Badge>
        </div>
        <Textarea
          value={trabajoText}
          onChange={e => setTrabajoText(e.target.value)}
          className="min-h-[80px] text-sm"
        />
      </div>

      {/* Cómo apoyar en casa */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-base">🏠</span>
          <h4 className="font-semibold text-sm">Cómo apoyar en casa</h4>
        </div>
        <Textarea
          value={casaText}
          onChange={e => setCasaText(e.target.value)}
          className="min-h-[60px] text-sm"
        />
      </div>

      {/* Nota WL */}
      <p className="text-xs text-muted-foreground italic">
        Este informe no incluye comparaciones con otros jugadores ni calificaciones numéricas.
      </p>

      {/* Buttons */}
      <div className="flex gap-2">
        <Button onClick={handleCopy} className="gap-1.5 bg-[#C9A227] hover:bg-[#B8911F] text-black">
          <Copy className="w-4 h-4" />
          Copiar informe
        </Button>
        <Button variant="outline" onClick={onClose} className="gap-1.5">
          <X className="w-4 h-4" />
          Cerrar
        </Button>
      </div>
    </div>
  );
}
