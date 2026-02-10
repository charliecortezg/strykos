import { useMemo } from 'react';
import type { StatKey } from '@/types/evaluations';
import { WLA_STATS } from '@/types/evaluations';

interface WLARadarChartProps {
  scores: Record<StatKey, number>;
  previousScores?: Record<StatKey, number> | null;
  size?: number;
  className?: string;
}

const AXES = WLA_STATS.map((stat, i) => ({
  ...stat,
  angle: -90 + (i * 360) / 6,
}));

export function WLARadarChart({ scores, previousScores, size = 220, className = '' }: WLARadarChartProps) {
  const center = size / 2;
  const maxRadius = (size / 2) - 35;

  const getPoint = (value: number, angle: number) => {
    const norm = Math.min(20, Math.max(0, value)) / 20;
    const r = norm * maxRadius;
    const rad = (angle * Math.PI) / 180;
    return { x: center + r * Math.cos(rad), y: center + r * Math.sin(rad) };
  };

  const currentPoints = useMemo(() =>
    AXES.map(a => ({ ...a, ...getPoint(scores[a.key] || 0, a.angle), value: scores[a.key] || 0 })),
    [scores, center, maxRadius]
  );

  const previousPoints = useMemo(() => {
    if (!previousScores) return null;
    return AXES.map(a => ({ ...a, ...getPoint(previousScores[a.key] || 0, a.angle), value: previousScores[a.key] || 0 }));
  }, [previousScores, center, maxRadius]);

  const gridLevels = [5, 10, 15, 20];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={`w-full h-auto ${className}`} style={{ maxWidth: size }}>
      {/* Grid circles */}
      {gridLevels.map((level) => (
        <circle
          key={level}
          cx={center} cy={center} r={maxRadius * (level / 20)}
          fill="none" stroke="currentColor" strokeOpacity={0.08} strokeWidth={1}
        />
      ))}

      {/* Grid labels */}
      {gridLevels.map((level) => (
        <text
          key={`label-${level}`}
          x={center + 3} y={center - maxRadius * (level / 20) + 3}
          className="text-[7px] fill-muted-foreground" opacity={0.5}
        >
          {level}
        </text>
      ))}

      {/* Axis lines */}
      {AXES.map((a, i) => {
        const end = getPoint(20, a.angle);
        return <line key={i} x1={center} y1={center} x2={end.x} y2={end.y} stroke="currentColor" strokeOpacity={0.1} strokeWidth={1} />;
      })}

      {/* Previous month overlay */}
      {previousPoints && (
        <polygon
          points={previousPoints.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          opacity={0.4}
        />
      )}

      {/* Current polygon */}
      <polygon
        points={currentPoints.map(p => `${p.x},${p.y}`).join(' ')}
        fill="hsl(var(--primary))"
        fillOpacity={0.25}
        stroke="hsl(var(--primary))"
        strokeWidth={2}
      />

      {/* Current dots */}
      {currentPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="hsl(var(--primary))" />
      ))}

      {/* Labels */}
      {AXES.map((a, i) => {
        const labelR = maxRadius + 22;
        const rad = (a.angle * Math.PI) / 180;
        const lx = center + labelR * Math.cos(rad);
        const ly = center + labelR * Math.sin(rad);
        // Short labels for compactness
        const shortLabels: Record<string, string> = {
          actitud_esfuerzo: 'Actitud',
          disciplina_constancia: 'Disciplina',
          autonomia_liderazgo: 'Autonomía',
          control_conduccion: 'Control',
          pase_recepcion: 'Pase',
          decision_juego: 'Decisión',
        };
        return (
          <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
            className="text-[9px] fill-muted-foreground font-medium">
            {shortLabels[a.key] || a.label}
          </text>
        );
      })}

      {/* Score values */}
      {currentPoints.map((p, i) => (
        <text key={`v-${i}`} x={p.x} y={p.y - 8} textAnchor="middle"
          className="text-[8px] fill-foreground font-bold">
          {p.value}
        </text>
      ))}
    </svg>
  );
}
