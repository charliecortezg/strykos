import { useMemo } from 'react';
import type { RadarAttributes } from '@/types/stryk-way';

interface RadarChartProps {
  data: RadarAttributes;
  size?: number;
  className?: string;
}

const ATTRIBUTES = [
  { key: 'tecnica', label: 'Control', shortLabel: 'CTRL', angle: -90 },
  { key: 'tactica', label: 'Decisión', shortLabel: 'DEC', angle: -30 },
  { key: 'fisica', label: 'Pase', shortLabel: 'PAS', angle: 30 },
  { key: 'mental', label: 'Actitud', shortLabel: 'ACT', angle: 150 },
  { key: 'social', label: 'Autonomía', shortLabel: 'AUT', angle: 210 },
  { key: 'disciplina', label: 'Disciplina', shortLabel: 'DIS', angle: 90 },
] as const;

export function RadarChart({ data, size = 200, className = '' }: RadarChartProps) {
  const center = size / 2;
  const labelPadding = 32;
  const maxRadius = (size / 2) - labelPadding;

  const points = useMemo(() => {
    return ATTRIBUTES.map(attr => {
      const value = data[attr.key as keyof RadarAttributes] || 50;
      const normalizedValue = Math.min(100, Math.max(0, value)) / 100;
      const radius = normalizedValue * maxRadius;
      const angleRad = (attr.angle * Math.PI) / 180;
      
      return {
        ...attr,
        value,
        x: center + radius * Math.cos(angleRad),
        y: center + radius * Math.sin(angleRad),
        labelX: center + (maxRadius + 18) * Math.cos(angleRad),
        labelY: center + (maxRadius + 18) * Math.sin(angleRad),
      };
    });
  }, [data, center, maxRadius]);

  const polygonPoints = points.map(p => `${p.x},${p.y}`).join(' ');
  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <svg 
      viewBox={`0 0 ${size} ${size}`} 
      className={`w-full h-auto ${className}`}
      style={{ maxWidth: size }}
    >
      {/* Background grid circles */}
      {gridLevels.map((level, i) => (
        <circle
          key={i}
          cx={center}
          cy={center}
          r={maxRadius * level}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.1}
          strokeWidth={1}
        />
      ))}

      {/* Axis lines */}
      {ATTRIBUTES.map((attr, i) => {
        const angleRad = (attr.angle * Math.PI) / 180;
        const endX = center + maxRadius * Math.cos(angleRad);
        const endY = center + maxRadius * Math.sin(angleRad);
        
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={endX}
            y2={endY}
            stroke="currentColor"
            strokeOpacity={0.1}
            strokeWidth={1}
          />
        );
      })}

      {/* Data polygon */}
      <polygon
        points={polygonPoints}
        fill="hsl(var(--primary))"
        fillOpacity={0.25}
        stroke="hsl(var(--primary))"
        strokeWidth={2}
      />

      {/* Data points */}
      {points.map((point, i) => (
        <circle
          key={i}
          cx={point.x}
          cy={point.y}
          r={3}
          fill="hsl(var(--primary))"
        />
      ))}

      {/* Labels - short abbreviations to avoid overflow */}
      {points.map((point, i) => (
        <text
          key={i}
          x={point.labelX}
          y={point.labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-[9px] fill-muted-foreground font-semibold uppercase tracking-wide"
        >
          {point.shortLabel}
        </text>
      ))}
    </svg>
  );
}
