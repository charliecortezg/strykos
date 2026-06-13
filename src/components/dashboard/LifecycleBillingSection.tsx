import { UserPlus, UserMinus, Users, UserX, AlertTriangle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLifecycleKPIs } from '@/hooks/useLifecycleKPIs';
import { useAcademyKpis } from '@/hooks/useAcademyKpis';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const BILLING_STATUS_LABELS: Record<string, string> = {
  paid_current: 'Al día',
  overdue_1: 'Mora 1 mes',
  overdue_2: 'Mora 2+ meses',
  suspended: 'Suspendido',
};

const LIFECYCLE_STATUS_LABELS: Record<string, string> = {
  prospect: 'Prospecto',
  active: 'Activo',
  inactive: 'Inactivo',
};

export function LifecycleBillingSection() {
  const { organization } = useAuth();
  // Conteos canónicos desde RPC (consistentes con FounderKPISection)
  const { kpis: academyKpis, isLoading: academyLoading } = useAcademyKpis(organization?.id);
  // Solo tabla de jugadores en riesgo del hook anterior
  const { playersAtRisk, isLoading: riskLoading } = useLifecycleKPIs();
  const isLoading = academyLoading || riskLoading;

  // Mapear al shape esperado abajo
  const kpis = {
    onboardedThisMonth: academyKpis.nuevos_mes,
    churnedThisMonth: academyKpis.bajas_mes,
    activeCount: academyKpis.jugadores_activos,
    inactiveCount: academyKpis.jugadores_inactivos,
    overdue1Count: academyKpis.mora_1_mes,
    overdue2Count: academyKpis.mora_2_plus,
  };

  if (isLoading) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-display font-semibold text-foreground mb-4">Lifecycle & Cobranza</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="h-8 bg-muted rounded w-12 mb-2" />
              <div className="h-4 bg-muted rounded w-20" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 space-y-6">
      <h2 className="text-xl font-display font-semibold text-foreground">Lifecycle & Cobranza</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-display font-semibold">{kpis.onboardedThisMonth}</p>
              <p className="text-sm text-muted-foreground">Onboarding este mes</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <UserMinus className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-display font-semibold">{kpis.churnedThisMonth}</p>
              <p className="text-sm text-muted-foreground">Churn este mes</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-display font-semibold">{kpis.activeCount}</p>
              <p className="text-sm text-muted-foreground">Activos</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <UserX className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-display font-semibold">{kpis.inactiveCount}</p>
              <p className="text-sm text-muted-foreground">Inactivos</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-display font-semibold">{kpis.overdue1Count}</p>
              <p className="text-sm text-muted-foreground">Mora 1 mes</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-display font-semibold">{kpis.overdue2Count}</p>
              <p className="text-sm text-muted-foreground">Mora 2+ meses</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Players at Risk Table */}
      {playersAtRisk.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Jugadores en Riesgo ({playersAtRisk.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Nombre</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden md:table-cell">Categoría</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden sm:table-cell">Último pago</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Cobranza</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {playersAtRisk.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 text-sm font-medium">{p.full_name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{p.category_name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{p.last_paid_month || 'Nunca'}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            p.billing_status === 'overdue_1' && 'bg-warning/10 text-warning border-warning/20',
                            p.billing_status === 'overdue_2' && 'bg-destructive/10 text-destructive border-destructive/20',
                          )}
                        >
                          {BILLING_STATUS_LABELS[p.billing_status] || p.billing_status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {LIFECYCLE_STATUS_LABELS[p.lifecycle_status] || p.lifecycle_status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
