import { useState, useEffect, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { WL_LEVEL_CONFIG } from '@/lib/wl-utils';
import type { WLMonthlyIndicator, WLBatteryItem, WLMonthlyEvaluation } from '@/types/wl';
import { Save, ChevronRight, MessageSquarePlus } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerName: string;
  playerId: string;
  monthConfig: WLMonthlyIndicator;
  batteryItems: WLBatteryItem[];
  existing: WLMonthlyEvaluation | null;
  threshold: number;
  onSave: (payload: {
    playerId: string;
    nivelInd1: 1 | 2 | 3 | null;
    nivelInd2: 1 | 2 | 3 | null;
    batteryResults: Record<string, boolean>;
    coachNote: string | null;
  }) => Promise<void>;
  onNext: () => void;
  hasNext: boolean;
  isSaving: boolean;
}

function IndicatorCard({
  dim, name, niveles, frases, isProposed, selected, onSelect,
}: {
  dim: string; name: string;
  niveles: (string | null)[]; frases: (string | null)[];
  isProposed: boolean;
  selected: 1 | 2 | 3 | null;
  onSelect: (n: 1 | 2 | 3) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-[10px] uppercase tracking-wide" style={{ borderColor: '#C9A227', color: '#8a6d10' }}>
          {dim}
        </Badge>
        {isProposed && (
          <Badge variant="outline" className="text-[10px] border-red-300 text-red-600">Propuesto</Badge>
        )}
      </div>
      <h4 className="text-sm font-semibold leading-snug">{name}</h4>
      <div className="space-y-2">
        {WL_LEVEL_CONFIG.map((lvl, i) => {
          const isSelected = selected === lvl.nivel;
          return (
            <button
              key={lvl.nivel}
              onClick={() => onSelect(lvl.nivel)}
              className={`w-full text-left rounded-lg border-2 p-3 transition-all ${isSelected ? lvl.selectedColor : lvl.color}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${lvl.dot}`} />
                <span className="text-xs font-semibold">Nivel {lvl.nivel} — {lvl.label}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{niveles[i]}</p>
              {isSelected && frases[i] && (
                <p className="text-[11px] mt-1.5 italic" style={{ color: '#8a6d10' }}>
                  Familia verá: "{frases[i]}"
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function WLPlayerEvaluationSheet({
  open, onOpenChange, playerName, playerId, monthConfig, batteryItems,
  existing, threshold, onSave, onNext, hasNext, isSaving,
}: Props) {
  const [nivelInd1, setNivelInd1] = useState<1 | 2 | 3 | null>(null);
  const [nivelInd2, setNivelInd2] = useState<1 | 2 | 3 | null>(null);
  const [battery, setBattery] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);

  useEffect(() => {
    setNivelInd1((existing?.nivel_ind1 as 1 | 2 | 3 | null) ?? null);
    setNivelInd2((existing?.nivel_ind2 as 1 | 2 | 3 | null) ?? null);
    setBattery(existing?.battery_results ?? {});
    setNote(existing?.coach_note ?? '');
    setShowNote(!!existing?.coach_note);
  }, [playerId, existing]);

  const hasIndicators = !!monthConfig.ind1_name;
  const coordItems = useMemo(() => batteryItems.filter(b => b.dimension === 'coordinativo'), [batteryItems]);
  const condItems = useMemo(() => batteryItems.filter(b => b.dimension === 'conductual'), [batteryItems]);
  const batteryCount = Object.values(battery).filter(Boolean).length;

  const toggleItem = (n: number) => {
    setBattery(prev => ({ ...prev, [String(n)]: !prev[String(n)] }));
  };

  const handleSave = async () => {
    await onSave({
      playerId,
      nivelInd1,
      nivelInd2,
      batteryResults: battery,
      coachNote: note.trim() || null,
    });
    if (hasNext) onNext();
    else onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2 flex-wrap">
            {playerName}
            <Badge variant="outline" className="text-xs">{monthConfig.category_key.toUpperCase()}</Badge>
            <Badge variant="outline" className="text-[10px] border-green-300 text-green-600">
              Umbral {threshold}%
            </Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-2 pb-24">
          {hasIndicators ? (
            <>
              <IndicatorCard
                dim={monthConfig.ind1_dim || 'TÉCNICO'}
                name={monthConfig.ind1_name!}
                niveles={[monthConfig.ind1_nivel1, monthConfig.ind1_nivel2, monthConfig.ind1_nivel3]}
                frases={[monthConfig.ind1_frase1, monthConfig.ind1_frase2, monthConfig.ind1_frase3]}
                isProposed={monthConfig.ind1_is_proposed}
                selected={nivelInd1}
                onSelect={n => setNivelInd1(prev => (prev === n ? null : n))}
              />
              {monthConfig.ind2_name && (
                <IndicatorCard
                  dim={monthConfig.ind2_dim || 'TÁCTICO'}
                  name={monthConfig.ind2_name}
                  niveles={[monthConfig.ind2_nivel1, monthConfig.ind2_nivel2, monthConfig.ind2_nivel3]}
                  frases={[monthConfig.ind2_frase1, monthConfig.ind2_frase2, monthConfig.ind2_frase3]}
                  isProposed={monthConfig.ind2_is_proposed}
                  selected={nivelInd2}
                  onSelect={n => setNivelInd2(prev => (prev === n ? null : n))}
                />
              )}
            </>
          ) : (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {monthConfig.context_note || 'Mes de cierre: re-evaluar con las tablas de los meses anteriores. Este mes solo se registra la batería.'}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Batería Motriz y Conductual</h4>
              <Badge variant="outline" className="text-xs">{batteryCount}/15 SÍ</Badge>
            </div>

            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Coordinativa (1-10)</p>
            <div className="space-y-1.5">
              {coordItems.map(item => (
                <div key={item.item_number} className="flex items-start justify-between gap-3 p-2.5 rounded-lg border border-border bg-card">
                  <div className="min-w-0">
                    <p className="text-xs font-medium leading-snug">{item.item_number}. {item.observable}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{item.criterion}</p>
                  </div>
                  <Switch
                    checked={!!battery[String(item.item_number)]}
                    onCheckedChange={() => toggleItem(item.item_number)}
                    className="shrink-0 mt-0.5"
                  />
                </div>
              ))}
            </div>

            <p className="text-[11px] text-muted-foreground uppercase tracking-wide pt-1">Conductual (11-15)</p>
            <div className="space-y-1.5">
              {condItems.map(item => (
                <div key={item.item_number} className="flex items-start justify-between gap-3 p-2.5 rounded-lg border border-border bg-card">
                  <div className="min-w-0">
                    <p className="text-xs font-medium leading-snug">{item.item_number}. {item.observable}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{item.criterion}</p>
                  </div>
                  <Switch
                    checked={!!battery[String(item.item_number)]}
                    onCheckedChange={() => toggleItem(item.item_number)}
                    className="shrink-0 mt-0.5"
                  />
                </div>
              ))}
            </div>
          </div>

          {showNote ? (
            <Input
              value={note}
              onChange={e => setNote(e.target.value.slice(0, 200))}
              placeholder="Nota de observación (opcional)..."
              className="text-sm"
            />
          ) : (
            <button onClick={() => setShowNote(true)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <MessageSquarePlus className="w-3.5 h-3.5" /> Agregar nota
            </button>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t flex gap-2">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 gap-1.5 text-black"
            style={{ backgroundColor: '#C9A227' }}
          >
            <Save className="w-4 h-4" />
            {hasNext ? 'Guardar y siguiente' : 'Guardar evaluación'}
            {hasNext && <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
