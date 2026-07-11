import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePlayers } from '@/hooks/usePlayers';
import { useWLMonthly, useHasWLMethodology } from '@/hooks/useWLMonthly';
import { WLPlayerEvaluationSheet } from './WLPlayerEvaluationSheet';
import { wlCurrentMonthKey, wlCurrentSeason, wlCategoryKeyFromAgeGroup } from '@/lib/wl-utils';
import { WL_MONTHS, type WLMonthKey } from '@/types/wl';
import { ClipboardCheck, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';

interface Props {
  categories: { id: string; name: string; age_group?: string }[];
}

export function WLMonthlyEvaluationModule({ categories }: Props) {
  const { wlCategories, hasWLMethodology, isLoading: loadingMeth } = useHasWLMethodology();
  const [selectedCategoryId, setSelectedCategoryId] = useState(categories[0]?.id || '');
  const [monthKey, setMonthKey] = useState<WLMonthKey>(wlCurrentMonthKey());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const season = wlCurrentSeason();
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const categoryKey = wlCategoryKeyFromAgeGroup(selectedCategory?.age_group)
    ?? wlCategoryKeyFromAgeGroup(selectedCategory?.name);
  const threshold = wlCategories.find(c => c.category_key === categoryKey)?.consolidation_threshold ?? 65;

  const { monthConfig, batteryItems, evaluations, isLoading, saveEvaluation } =
    useWLMonthly(selectedCategoryId || null, categoryKey, monthKey, season);

  const { players } = usePlayers();
  const categoryPlayers = useMemo(
    () => players.filter(p => p.category_id === selectedCategoryId && p.is_active),
    [players, selectedCategoryId]
  );

  const playerStatuses = useMemo(() =>
    categoryPlayers.map(p => {
      const ev = evaluations.find(e => e.player_id === p.id) || null;
      const batteryCount = ev ? Object.values(ev.battery_results || {}).filter(Boolean).length : 0;
      const hasLevels = ev && (ev.nivel_ind1 != null || ev.nivel_ind2 != null);
      const hasBattery = ev && Object.keys(ev.battery_results || {}).length > 0;
      return {
        player: p,
        evaluation: ev,
        batteryCount,
        status: (hasLevels || hasBattery) ? 'completado' : 'pendiente',
      };
    }),
    [categoryPlayers, evaluations]
  );

  const completedCount = playerStatuses.filter(s => s.status === 'completado').length;
  const current = playerStatuses[selectedIdx] || null;

  if (loadingMeth) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>;
  }

  if (!hasWLMethodology) {
    return (
      <div className="stryk-card p-8 text-center">
        <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">Esta organización no tiene una metodología de evaluación configurada.</p>
      </div>
    );
  }

  if (!categoryKey) {
    return (
      <div className="stryk-card p-8 text-center">
        <p className="text-muted-foreground">
          La categoría seleccionada no está mapeada a una categoría de la metodología WL.
          Verifica el campo age_group de la categoría (debe corresponder a sub-5, sub-7, sub-9, sub-11 o sub-13).
        </p>
      </div>
    );
  }

  const handleNext = () => {
    const nextIdx = playerStatuses.findIndex((s, i) => i > selectedIdx && s.status === 'pendiente');
    if (nextIdx >= 0) setSelectedIdx(nextIdx);
    else {
      const firstPending = playerStatuses.findIndex((s, i) => i !== selectedIdx && s.status === 'pendiente');
      if (firstPending >= 0) setSelectedIdx(firstPending);
      else setSheetOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="w-5 h-5" style={{ color: '#C9A227' }} />
        <h2 className="text-lg font-display font-semibold">Evaluación Mensual WL</h2>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={selectedCategoryId} onValueChange={v => { setSelectedCategoryId(v); }}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Categoría" /></SelectTrigger>
          <SelectContent>
            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={monthKey} onValueChange={v => setMonthKey(v as WLMonthKey)}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {WL_MONTHS.map(m => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="self-center">{completedCount}/{playerStatuses.length} evaluados</Badge>
      </div>

      {monthConfig && (
        <div className="rounded-lg border p-3" style={{ borderColor: '#C9A22740', backgroundColor: '#C9A22708' }}>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge className="text-[10px] text-black" style={{ backgroundColor: '#C9A227' }}>
              {monthConfig.eval_type.toUpperCase().replace('_', ' ')}
            </Badge>
            {monthConfig.ind1_name && (
              <span className="text-xs font-medium">{monthConfig.ind1_name}</span>
            )}
          </div>
          {monthConfig.ind2_name && <p className="text-xs font-medium mb-1">{monthConfig.ind2_name}</p>}
          {monthConfig.context_note && (
            <p className="text-[11px] text-muted-foreground leading-relaxed">{monthConfig.context_note}</p>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
      ) : categoryPlayers.length === 0 ? (
        <div className="stryk-card p-8 text-center"><p className="text-muted-foreground">No hay jugadores en esta categoría.</p></div>
      ) : (
        <div className="grid gap-2">
          {playerStatuses.map((s, idx) => (
            <button
              key={s.player.id}
              onClick={() => { setSelectedIdx(idx); setSheetOpen(true); }}
              className="flex items-center justify-between p-3 bg-card border border-border rounded-lg hover:bg-accent/50 transition-colors text-left w-full"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{s.player.full_name}</p>
                {s.status === 'completado' && (
                  <p className="text-xs text-muted-foreground">
                    {s.evaluation?.nivel_ind1 ? `Ind.1: N${s.evaluation.nivel_ind1}` : ''}
                    {s.evaluation?.nivel_ind2 ? ` · Ind.2: N${s.evaluation.nivel_ind2}` : ''}
                    {` · Batería ${s.batteryCount}/15`}
                  </p>
                )}
              </div>
              <Badge
                variant="outline"
                className={`ml-2 text-xs shrink-0 gap-1 ${
                  s.status === 'completado'
                    ? 'bg-success/10 text-success border-success/20'
                    : 'bg-warning/10 text-warning border-warning/20'
                }`}
              >
                {s.status === 'completado'
                  ? <><CheckCircle2 className="w-3 h-3" /> Listo</>
                  : <><Clock className="w-3 h-3" /> Pendiente</>}
              </Badge>
            </button>
          ))}
        </div>
      )}

      {monthConfig && current && (
        <WLPlayerEvaluationSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          playerName={current.player.full_name}
          playerId={current.player.id}
          monthConfig={monthConfig}
          batteryItems={batteryItems}
          existing={current.evaluation}
          threshold={threshold}
          onSave={async payload => { await saveEvaluation.mutateAsync(payload); }}
          onNext={handleNext}
          hasNext={playerStatuses.some((s, i) => i !== selectedIdx && s.status === 'pendiente')}
          isSaving={saveEvaluation.isPending}
        />
      )}
    </div>
  );
}
