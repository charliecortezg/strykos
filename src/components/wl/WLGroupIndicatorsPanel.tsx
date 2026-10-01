import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import type { WLMonthlyIndicator, WLMonthlyEvaluation } from '@/types/wl';

interface Props {
  monthConfig: WLMonthlyIndicator | null;
  evaluations: WLMonthlyEvaluation[];
}

interface IndicatorStat {
  slot: 1 | 2;
  name: string;
  dim: string | null;
  n1: number;
  n2: number;
  n3: number;
  total: number;
  pctN3: number;
}

export function WLGroupIndicatorsPanel({ monthConfig, evaluations }: Props) {
  const stats = useMemo<IndicatorStat[]>(() => {
    if (!monthConfig) return [];
    const result: IndicatorStat[] = [];
    const slots: { slot: 1 | 2; name: string | null; dim: string | null }[] = [
      { slot: 1, name: monthConfig.ind1_name, dim: monthConfig.ind1_dim },
      { slot: 2, name: monthConfig.ind2_name, dim: monthConfig.ind2_dim },
    ];
    for (const { slot, name, dim } of slots) {
      if (!name) continue;
      const key = slot === 1 ? 'nivel_ind1' : 'nivel_ind2';
      const withLevel = evaluations.filter(e => e[key] != null);
      const n1 = withLevel.filter(e => e[key] === 1).length;
      const n2 = withLevel.filter(e => e[key] === 2).length;
      const n3 = withLevel.filter(e => e[key] === 3).length;
      const total = withLevel.length;
      result.push({
        slot,
        name,
        dim,
        n1,
        n2,
        n3,
        total,
        pctN3: total > 0 ? Math.round((n3 / total) * 100) : 0,
      });
    }
    return result;
  }, [monthConfig, evaluations]);

  if (stats.length === 0) return null;

  const evaluatedAny = stats.some(s => s.total > 0);
  if (!evaluatedAny) {
    return (
      <div className="stryk-card p-6 text-center">
        <p className="text-sm text-muted-foreground">Aún no hay niveles de indicadores registrados este mes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Indicadores del mes — nivel del grupo</h3>

      {stats.map(s => {
        const belowHalf = s.total > 0 && s.pctN3 < 50;
        return (
          <div key={s.slot} className="rounded-lg border border-border bg-card p-3 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="outline" className="text-[10px] shrink-0">Ind. {s.slot}</Badge>
                  {s.dim && (
                    <Badge variant="outline" className="text-[10px] shrink-0" style={{ borderColor: '#C9A22760', color: '#C9A227' }}>
                      {s.dim}
                    </Badge>
                  )}
                </div>
                <p className="text-xs font-medium mt-1.5 leading-snug">{s.name}</p>
              </div>
              <Badge
                variant="outline"
                className={`text-xs shrink-0 ${belowHalf ? 'border-red-300 text-red-600' : ''}`}
              >
                {s.pctN3}% en N3 ({s.n3}/{s.total})
              </Badge>
            </div>

            {s.total > 0 ? (
              <>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden flex">
                  {s.n1 > 0 && (
                    <div className="h-full" style={{ width: `${(s.n1 / s.total) * 100}%`, backgroundColor: '#ef4444' }} />
                  )}
                  {s.n2 > 0 && (
                    <div className="h-full" style={{ width: `${(s.n2 / s.total) * 100}%`, backgroundColor: '#C9A227' }} />
                  )}
                  {s.n3 > 0 && (
                    <div className="h-full" style={{ width: `${(s.n3 / s.total) * 100}%`, backgroundColor: '#22c55e' }} />
                  )}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#ef4444' }} />
                    N1: {s.n1}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#C9A227' }} />
                    N2: {s.n2}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }} />
                    N3: {s.n3}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-[11px] text-muted-foreground">Sin capturas de este indicador todavía.</p>
            )}

            {belowHalf && (
              <div className="rounded-lg border border-red-300 bg-red-500/5 p-2.5 flex gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-red-700 leading-relaxed">
                  <span className="font-semibold">El grupo no consolidó este indicador:</span> repetir el foco el mes
                  siguiente con otro ejercicio — no con más exigencia.
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
