import { getPhysicalColor, physicalScore, type WLPhysicalTest, type WLPhysicalResults } from '@/lib/wl-utils';
import type { WLMonthlyEvaluation } from '@/types/wl';

export function WLGroupPhysicalPanel({ tests, evaluations }: { tests: WLPhysicalTest[]; evaluations: WLMonthlyEvaluation[] }) {
  if (tests.length === 0) return null;
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Pruebas físicas — nivel del grupo</h3>
      {tests.map(t => {
        const c = { rojo: 0, amarillo: 0, verde: 0 };
        const scores: number[] = [];
        evaluations.forEach(ev => {
          const v = (ev.physical_results as WLPhysicalResults | undefined)?.[t.test_key];
          const col = getPhysicalColor(t, v);
          if (col) c[col]++;
          const raw = t.kind === 'beep' && v && typeof v === 'object' ? Number(`${v.nivel}.${v.recorrido}`) : physicalScore(t, v);
          if (raw !== null) scores.push(raw);
        });
        const total = c.rojo + c.amarillo + c.verde;
        const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—';
        const pct = (n: number) => (total ? (n / total) * 100 : 0);
        return (
          <div key={t.test_key} className="rounded-lg border border-border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{t.name}</p>
              <p className="text-xs text-muted-foreground">Promedio: {avg} · {total} con dato</p>
            </div>
            <div className="flex h-3 rounded overflow-hidden bg-muted">
              <div className="bg-red-500" style={{ width: `${pct(c.rojo)}%` }} />
              <div className="bg-amber-400" style={{ width: `${pct(c.amarillo)}%` }} />
              <div className="bg-green-500" style={{ width: `${pct(c.verde)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">Rojo: {c.rojo} · Amarillo: {c.amarillo} · Verde: {c.verde}</p>
          </div>
        );
      })}
    </div>
  );
}
