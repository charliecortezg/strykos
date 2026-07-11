import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import type { WLBatteryItem, WLMonthlyEvaluation } from '@/types/wl';

interface Props {
  batteryItems: WLBatteryItem[];
  evaluations: WLMonthlyEvaluation[];
}

export function WLGroupBatteryPanel({ batteryItems, evaluations }: Props) {
  const stats = useMemo(() => {
    const evaluated = evaluations.filter(e => Object.keys(e.battery_results || {}).length > 0);
    const n = evaluated.length;
    return batteryItems.map(item => {
      const yes = evaluated.filter(e => e.battery_results?.[String(item.item_number)] === true).length;
      const pct = n > 0 ? Math.round((yes / n) * 100) : null;
      return { item, yes, n, pct };
    });
  }, [batteryItems, evaluations]);

  const evaluatedCount = evaluations.filter(e => Object.keys(e.battery_results || {}).length > 0).length;
  const focusItems = stats.filter(s => s.pct !== null && s.pct < 50);

  if (evaluatedCount === 0) {
    return (
      <div className="stryk-card p-6 text-center">
        <p className="text-sm text-muted-foreground">Aún no hay baterías registradas este mes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Batería del grupo — % de cumplimiento</h3>
        <Badge variant="outline" className="text-xs">{evaluatedCount} jugadores con batería</Badge>
      </div>

      {focusItems.length > 0 && (
        <div className="rounded-lg border border-red-300 bg-red-500/5 p-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 leading-relaxed">
            <span className="font-semibold">{focusItems.length} ítem(s) por debajo del 50%:</span> se convierten en el
            foco de la activación del mes siguiente. Cambiar el juego de activación — no aumentar la exigencia.
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        {stats.map(({ item, pct, yes, n }) => (
          <div key={item.item_number} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-card">
            <span className="text-xs font-medium w-6 shrink-0 text-muted-foreground">{item.item_number}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{item.observable}</p>
              <div className="h-1.5 rounded-full bg-muted mt-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct ?? 0}%`,
                    backgroundColor: pct !== null && pct < 50 ? '#ef4444' : pct !== null && pct >= 90 ? '#22c55e' : '#C9A227',
                  }}
                />
              </div>
            </div>
            <Badge
              variant="outline"
              className={`text-xs shrink-0 ${pct !== null && pct < 50 ? 'border-red-300 text-red-600' : ''}`}
            >
              {pct}% ({yes}/{n})
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
