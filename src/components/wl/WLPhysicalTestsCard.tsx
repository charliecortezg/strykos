import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  getPhysicalColor, WL_PHYSICAL_COLOR_STYLE, WL_PHYSICAL_MAX_REPS, WL_PHYSICAL_CONFIRM_REPS,
  type WLPhysicalTest, type WLPhysicalResults, type WLBeepValue,
} from '@/lib/wl-utils';

interface Props {
  tests: WLPhysicalTest[];
  value: WLPhysicalResults;
  onChange: (v: WLPhysicalResults) => void;
}

export function WLPhysicalTestsCard({ tests, value, onChange }: Props) {
  if (tests.length === 0) return null;
  const set = (k: string, v: WLPhysicalResults[string]) => onChange({ ...value, [k]: v });

  const onReps = (t: WLPhysicalTest, raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (digits === '') return set(t.test_key, null);
    const n = Math.min(parseInt(digits, 10), WL_PHYSICAL_MAX_REPS);
    set(t.test_key, n);
  };

  const onRepsBlur = (t: WLPhysicalTest) => {
    const n = value[t.test_key];
    if (typeof n === 'number' && n > WL_PHYSICAL_CONFIRM_REPS) {
      if (!window.confirm(`¿Seguro? ${n} ${t.name.toLowerCase()} en 1 minuto`)) set(t.test_key, null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Pruebas físicas</h4>
        <span className="text-[11px] text-muted-foreground">1 minuto por ejercicio · vacío = no la hizo</span>
      </div>
      <div className="space-y-1.5">
        {tests.map(t => {
          const v = value[t.test_key];
          const color = getPhysicalColor(t, v);
          const beep = (typeof v === 'object' && v) ? (v as WLBeepValue) : null;
          return (
            <div key={t.test_key} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border bg-card">
              <div className="min-w-0">
                <p className="text-xs font-medium">{t.name}</p>
                <p className="text-[11px] text-muted-foreground">{t.unit}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {t.kind === 'reps' ? (
                  <Input
                    inputMode="numeric"
                    className="w-20 h-9 text-center"
                    placeholder="—"
                    value={typeof v === 'number' ? String(v) : ''}
                    onChange={e => onReps(t, e.target.value)}
                    onBlur={() => onRepsBlur(t)}
                  />
                ) : (
                  <div className="flex items-center gap-1">
                    <Select
                      value={beep ? String(beep.nivel) : ''}
                      onValueChange={n => set(t.test_key, { nivel: Number(n), recorrido: beep?.recorrido ?? 1 })}
                    >
                      <SelectTrigger className="w-16 h-9"><SelectValue placeholder="Niv" /></SelectTrigger>
                      <SelectContent>{Array.from({ length: 10 }, (_, i) => <SelectItem key={i} value={String(i + 1)}>{i + 1}</SelectItem>)}</SelectContent>
                    </Select>
                    <span>.</span>
                    <Select
                      value={beep ? String(beep.recorrido) : ''}
                      disabled={!beep}
                      onValueChange={r => beep && set(t.test_key, { nivel: beep.nivel, recorrido: Number(r) })}
                    >
                      <SelectTrigger className="w-16 h-9"><SelectValue placeholder="Rec" /></SelectTrigger>
                      <SelectContent>{Array.from({ length: 9 }, (_, i) => <SelectItem key={i} value={String(i + 1)}>{i + 1}</SelectItem>)}</SelectContent>
                    </Select>
                    {beep && (
                      <button className="text-[11px] text-muted-foreground underline ml-1" onClick={() => set(t.test_key, null)}>Quitar</button>
                    )}
                  </div>
                )}
                <Badge variant="outline" className={`text-[10px] w-16 justify-center ${color ? WL_PHYSICAL_COLOR_STYLE[color].cls : ''}`}>
                  {color ? WL_PHYSICAL_COLOR_STYLE[color].label : 'Sin dato'}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
