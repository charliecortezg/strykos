import { DollarSign, Receipt, TrendingUp, Percent } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useMonthlyFinanceSummary } from '@/hooks/useMonthlyFinanceSummary';
import { useAcademyKpis } from '@/hooks/useAcademyKpis';
import { OWNER_COPY } from '@/lib/owner-language';
import { cn } from '@/lib/utils';

const fmt = (v: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);

export function MoneySummaryCards() {
  const { organization } = useAuth();
  const { ingresos, gastos, delta, isLoading } = useMonthlyFinanceSummary(organization?.id);
  const { kpis } = useAcademyKpis(organization?.id);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-success" />
          </div>
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-display font-semibold text-success truncate">
              {isLoading ? '—' : fmt(ingresos)}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">{OWNER_COPY.ingresos_mes}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-destructive" />
          </div>
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-display font-semibold text-destructive truncate">
              {isLoading ? '—' : fmt(gastos)}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">{OWNER_COPY.gastos_mes}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              delta >= 0 ? 'bg-primary/10' : 'bg-destructive/10',
            )}
          >
            <TrendingUp
              className={cn('w-5 h-5', delta >= 0 ? 'text-primary' : 'text-destructive')}
            />
          </div>
          <div className="min-w-0">
            <p
              className={cn(
                'text-xl sm:text-2xl font-display font-semibold truncate',
                delta >= 0 ? 'text-foreground' : 'text-destructive',
              )}
            >
              {isLoading ? '—' : fmt(delta)}
            </p>
            <p className="text-[11px] sm:text-xs text-muted-foreground leading-tight">
              {OWNER_COPY.ingresos_menos_gastos}
            </p>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 leading-tight">
          {OWNER_COPY.ingresos_menos_gastos_nota}
        </p>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              kpis.pct_cobranza >= 80
                ? 'bg-success/10'
                : kpis.pct_cobranza >= 50
                  ? 'bg-warning/10'
                  : 'bg-destructive/10',
            )}
          >
            <Percent
              className={cn(
                'w-5 h-5',
                kpis.pct_cobranza >= 80
                  ? 'text-success'
                  : kpis.pct_cobranza >= 50
                    ? 'text-warning'
                    : 'text-destructive',
              )}
            />
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-display font-semibold">{kpis.pct_cobranza}%</p>
            <p className="text-xs sm:text-sm text-muted-foreground">{OWNER_COPY.cobranza}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
