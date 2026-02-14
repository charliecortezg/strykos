import { useMemo } from 'react';
import type { RadarAttributes } from '@/types/stryk-way';

interface RadarChartProps {
  data: RadarAttributes;
  size?: number;
  className?: string;
}

// Same axis order and labels as WLARadarChart (evaluation view)
const STAT_MAP = [
  { radarKey: 'mental', label: 'Actitud', angle: -90 },
  { radarKey: 'disciplina', label: 'Disciplina', angle: -30 },
  { radarKey: 'social', label: 'Autonomía', angle: 30 },
  { radarKey: 'tecnica', label: 'Control', angle: 90 },
  { radarKey: 'fisica', label: 'Pase', angle: 150 },
  { radarKey: 'tactica', label: 'Decisión', angle: 210 },
] as const;

export function RadarChart({ data, size = 220, className = '' }: RadarChartProps) {
  const center = size / 2;
  const maxRadius = (size / 2) - 35;

  const getPoint = (value: number, angle: number) => {
    // data values are 0-100, convert to radius
    const norm = Math.min(100, Math.max(0, value)) / 100;
    const r = norm * maxRadius;
    const rad = (angle * Math.PI) / 180;
    return { x: center + r * Math.cos(rad), y: center + r * Math.sin(rad) };
  };

  const points = useMemo(() =>
    STAT_MAP.map(s => {
      const value = data[s.radarKey as keyof RadarAttributes] || 50;
      // Convert 0-100 back to 0-20 for display (matches evaluation scale)
      const displayValue = Math.round((value / 100) * 20);
      const pt = getPoint(value, s.angle);
      return { ...s, ...pt, value, displayValue };
    }),
    [data, center, maxRadius]
  );

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
      {STAT_MAP.map((s, i) => {
        const end = getPoint(100, s.angle);
        return <line key={i} x1={center} y1={center} x2={end.x} y2={end.y} stroke="currentColor" strokeOpacity={0.1} strokeWidth={1} />;
      })}

      {/* Data polygon */}
      <polygon
        points={points.map(p => `${p.x},${p.y}`).join(' ')}
        fill="hsl(var(--primary))"
        fillOpacity={0.25}
        stroke="hsl(var(--primary))"
        strokeWidth={2}
      />

      {/* Data points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="hsl(var(--primary))" />
      ))}

      {/* Labels */}
      {points.map((p, i) => {
        const labelR = maxRadius + 22;
        const rad = (p.angle * Math.PI) / 180;
        const lx = center + labelR * Math.cos(rad);
        const ly = center + labelR * Math.sin(rad);
        return (
          <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
            className="text-[9px] fill-muted-foreground font-medium">
            {p.label}
          </text>
        );
      })}

      {/* Score values */}
      {points.map((p, i) => (
        <text key={`v-${i}`} x={p.x} y={p.y - 8} textAnchor="middle"
          className="text-[8px] fill-foreground font-bold">
          {p.displayValue}
        </text>
      ))}
    </svg>
  );
}
