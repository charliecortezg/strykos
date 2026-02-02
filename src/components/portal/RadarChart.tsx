import { useMemo } from 'react';
import type { RadarAttributes } from '@/types/stryk-way';

interface RadarChartProps {
  data: RadarAttributes;
  size?: number;
  className?: string;
}

const ATTRIBUTES = [
  { key: 'tecnica', label: 'Técnica', angle: -90 },
  { key: 'tactica', label: 'Táctica', angle: -30 },
  { key: 'fisica', label: 'Física', angle: 30 },
  { key: 'mental', label: 'Mental', angle: 90 },
  { key: 'social', label: 'Social', angle: 150 },
  { key: 'disciplina', label: 'Disciplina', angle: 210 },
] as const;

export function RadarChart({ data, size = 200, className = '' }: RadarChartProps) {
  const center = size / 2;
  const maxRadius = (size / 2) - 30;

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
        labelX: center + (maxRadius + 20) * Math.cos(angleRad),
        labelY: center + (maxRadius + 20) * Math.sin(angleRad),
      };
    });
  }, [data, center, maxRadius]);

  const polygonPoints = points.map(p => `${p.x},${p.y}`).join(' ');

  // Grid circles
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
        fillOpacity={0.3}
        stroke="hsl(var(--primary))"
        strokeWidth={2}
      />

      {/* Data points */}
      {points.map((point, i) => (
        <circle
          key={i}
          cx={point.x}
          cy={point.y}
          r={4}
          fill="hsl(var(--primary))"
        />
      ))}

      {/* Labels */}
      {points.map((point, i) => (
        <text
          key={i}
          x={point.labelX}
          y={point.labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-[10px] fill-muted-foreground font-medium"
        >
          {point.label}
        </text>
      ))}

      {/* Center value labels */}
      {points.map((point, i) => (
        <text
          key={`value-${i}`}
          x={point.x}
          y={point.y - 10}
          textAnchor="middle"
          className="text-[8px] fill-foreground font-bold"
        >
          {point.value}
        </text>
      ))}
    </svg>
  );
}
