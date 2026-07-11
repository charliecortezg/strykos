import { useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useWLPlayerSeason, useWLCategoryIndicators, wlFamilyPhrase } from '@/hooks/useWLProgression';
import { WL_MONTHS, type WLCategoryKey, type WLMonthKey } from '@/types/wl';
import { Copy, TrendingUp } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerName: string;
  playerId: string | null;
  categoryKey: WLCategoryKey;
  season: string;
}

const NIVEL_COLORS: Record<number, string> = {
  1: 'bg-red-400', 2: 'bg-yellow-400', 3: 'bg-green-500',
};

export function WLPlayerProgressionSheet({ open, onOpenChange, playerName, playerId, categoryKey, season }: Props) {
  const { toast } = useToast();
  const { seasonEvals, isLoading } = useWLPlayerSeason(playerId, season);
  const { monthConfigs } = useWLCategoryIndicators(categoryKey);
  const [selectedMonth, setSelectedMonth] = useState<WLMonthKey | null>(null);

  const byMonth = useMemo(() => {
    const map = new Map(seasonEvals.map(e => [e.month_key, e]));
    return WL_MONTHS.map(m => ({
      month: m,
      cfg: monthConfigs.find(c => c.month_key === m.key),
      ev: map.get(m.key) || null,
    }));
  }, [seasonEvals, monthConfigs]);

  const selected = byMonth.find(r => r.month.key === selectedMonth) || null;

  const familyText = useMemo(() => {
    if (!selected?.ev || !selected.cfg) return null;
    const lines: string[] = [];
    const f1 = wlFamilyPhrase(selected.cfg, 1, selected.ev.nivel_ind1 as 1 | 2 | 3 | null);
    const f2 = wlFamilyPhrase(selected.cfg, 2, selected.ev.nivel_ind2 as 1 | 2 | 3 | null);
    if (f1) lines.push(f1);
    if (f2) lines.push(f2);
    if (lines.length === 0) return null;
    return `${playerName} — ${selected.month.label}:\n` + lines.map(l => `• ${l}`).join('\n');
  }, [selected, playerName]);

  const handleCopy = async () => {
    if (!familyText) return;
    await navigator.clipboard.writeText(familyText);
    toast({ title: 'Copiado', description: 'Frase para la familia copiada al portapapeles.' });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: '#C9A227' }} />
            {playerName}
            <Badge variant="outline" className="text-xs">{categoryKey.toUpperCase()} · {season}</Badge>
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
        ) : (
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Progresión anual</p>
              {byMonth.map(({ month, ev }) => {
                const batteryCount = ev ? Object.values(ev.battery_results || {}).filter(Boolean).length : null;
                const hasData = ev && (ev.nivel_ind1 || ev.nivel_ind2 || batteryCount);
                return (
                  <button
                    key={month.key}
                    onClick={() => hasData && setSelectedMonth(month.key)}
                    disabled={!hasData}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-colors ${
                      selectedMonth === month.key ? 'border-[#C9A227] bg-[#C9A22710]' : 'border-border bg-card'
                    } ${!hasData ? 'opacity-40' : 'hover:bg-accent/40'}`}
                  >
                    <span className="text-xs font-medium w-9 shrink-0">{month.label.slice(0, 3)}</span>
                    <div className="flex items-center gap-1.5 flex-1">
                      {ev?.nivel_ind1 && (
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold text-white ${NIVEL_COLORS[ev.nivel_ind1]}`}>
                          N{ev.nivel_ind1}
                        </span>
                      )}
                      {ev?.nivel_ind2 && (
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold text-white ${NIVEL_COLORS[ev.nivel_ind2]}`}>
                          N{ev.nivel_ind2}
                        </span>
                      )}
                      {batteryCount !== null && batteryCount > 0 && (
                        <Badge variant="outline" className="text-[10px] ml-auto">{batteryCount}/15</Badge>
                      )}
                      {!hasData && <span className="text-[11px] text-muted-foreground">Sin registro</span>}
                    </div>
                  </button>
                );
              })}
            </div>

            {selected?.ev && selected.cfg && (
              <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: '#C9A22740', backgroundColor: '#C9A22708' }}>
                <p className="text-xs font-semibold">{selected.month.label} — detalle</p>
                {selected.cfg.ind1_name && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{selected.cfg.ind1_name}:</span>{' '}
                    {selected.ev.nivel_ind1 ? `Nivel ${selected.ev.nivel_ind1}` : 'Sin registro'}
                  </p>
                )}
                {selected.cfg.ind2_name && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{selected.cfg.ind2_name}:</span>{' '}
                    {selected.ev.nivel_ind2 ? `Nivel ${selected.ev.nivel_ind2}` : 'Sin registro'}
                  </p>
                )}
                {selected.ev.coach_note && (
                  <p className="text-[11px] italic text-muted-foreground">Nota: {selected.ev.coach_note}</p>
                )}
                {familyText && (
                  <div className="pt-2 border-t border-[#C9A22730]">
                    <p className="text-[11px] whitespace-pre-line leading-relaxed" style={{ color: '#8a6d10' }}>{familyText}</p>
                    <Button size="sm" variant="outline" onClick={handleCopy} className="mt-2 gap-1.5 text-xs h-7">
                      <Copy className="w-3 h-3" /> Copiar para la familia
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
