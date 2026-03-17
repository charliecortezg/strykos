import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCategories } from '@/hooks/useCategories';
import { useUniformOrders, useBlockedNumbers } from '@/hooks/useUniforms';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

const PERMANENT_BLOCKS = [67, 69];

interface Props {
  campaignId: string;
}

export function NumbersGridTab({ campaignId }: Props) {
  const { categories } = useCategories();
  const activeCategories = categories.filter(c => c.is_active);
  const { orders } = useUniformOrders(campaignId);
  const { blocked } = useBlockedNumbers();
  const { organization } = useAuth();
  const [categoryId, setCategoryId] = useState<string>(activeCategories?.[0]?.id || '');

  // Get players with jersey numbers for selected category
  const { data: playersWithNumbers } = useQuery({
    queryKey: ['players-jersey', organization?.id, categoryId],
    enabled: !!organization?.id && !!categoryId,
    queryFn: async () => {
      const { data } = await supabase
        .from('players')
        .select('id, full_name, jersey_number')
        .eq('organization_id', organization!.id)
        .eq('category_id', categoryId)
        .not('jersey_number', 'is', null);
      return data || [];
    },
  });

  // Build number map
  const numberMap = new Map<number, { status: string; name: string }>();

  // Permanent blocks
  PERMANENT_BLOCKS.forEach((n) => numberMap.set(n, { status: 'permanent', name: '' }));

  // Active players
  playersWithNumbers?.forEach((p) => {
    if (p.jersey_number && !numberMap.has(p.jersey_number)) {
      numberMap.set(p.jersey_number, { status: 'active_player', name: p.full_name });
    }
  });

  // Blocked numbers
  blocked.data
    ?.filter((b) => b.category_id === categoryId)
    .forEach((b) => {
      if (!numberMap.has(b.number)) {
        numberMap.set(b.number, { status: 'blocked', name: b.player_name });
      }
    });

  // Orders
  (orders.data || [])
    .filter((o) => o.category_id === categoryId && o.assigned_number)
    .forEach((o) => {
      if (!numberMap.has(o.assigned_number!)) {
        numberMap.set(o.assigned_number!, {
          status: o.number_status === 'confirmed' ? 'confirmed' : 'submitted',
          name: o.player_name,
        });
      }
    });

  const getNumberStyle = (n: number) => {
    const info = numberMap.get(n);
    if (!info) return 'bg-background border-border text-foreground';
    switch (info.status) {
      case 'permanent':
        return 'bg-destructive/20 text-destructive line-through border-destructive/30';
      case 'active_player':
        return 'bg-muted text-muted-foreground border-muted-foreground/30';
      case 'blocked':
        return 'bg-muted text-muted-foreground border-muted-foreground/30';
      case 'submitted':
        return 'bg-warning/20 text-warning border-warning/30';
      case 'confirmed':
        return 'bg-success/20 text-success border-success/30';
      default:
        return 'bg-background border-border';
    }
  };

  return (
    <div className="space-y-4">
      <Select value={categoryId} onValueChange={setCategoryId}>
        <SelectTrigger className="w-[250px]">
          <SelectValue placeholder="Selecciona categoría" />
        </SelectTrigger>
        <SelectContent>
          {activeCategories?.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex flex-wrap gap-1.5 text-xs mb-2">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-background border" /> Libre</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-muted" /> Jugador activo</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-warning/20" /> Por confirmar</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-success/20" /> Confirmado</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-destructive/20 line-through" /> Bloqueado</span>
      </div>

      {categoryId && (
        <div className="grid grid-cols-10 gap-1.5">
          {Array.from({ length: 99 }, (_, i) => i + 1).map((n) => {
            const info = numberMap.get(n);
            return (
              <div
                key={n}
                className={cn(
                  'border rounded p-1 text-center text-xs min-h-[48px] flex flex-col items-center justify-center',
                  getNumberStyle(n)
                )}
                title={info?.name || `#${n} - Libre`}
              >
                <span className="font-bold">{n}</span>
                {info?.name && (
                  <span className="text-[9px] leading-tight truncate w-full">
                    {info.name.split(' ')[0]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
