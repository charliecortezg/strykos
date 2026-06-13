import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  ClipboardList,
  AlertTriangle,
  Calendar,
  Percent
} from 'lucide-react';
import { useFounderKPIs } from '@/hooks/useFounderKPIs';
import { useAcademyKpis } from '@/hooks/useAcademyKpis';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

export function FounderKPISection() {
  const { organization } = useAuth();
  // KPIs canónicos desde RPC (fuente única de verdad)
  const { kpis, isLoading: kpisLoading, sinAtrasados } = useAcademyKpis(organization?.id);
  // Solo extras no canónicos (gráfica histórica + entrenamientos/categorías de apoyo)
  const {
    revenueByMonth,
    trainingsThisWeek,
    activeCategories,
    isLoading: extrasLoading,
  } = useFounderKPIs();

  const monthlyRevenue = kpis.ingresos_mes;
  const pendingPayments = kpis.monto_pendiente;
  const collectionRate = kpis.pct_cobranza;
  const globalAttendanceRate = kpis.pct_asistencia_mes;
  const activePlayers = kpis.jugadores_activos;
  const overduePlayersCount = kpis.mora_1_mes + kpis.mora_2_plus;
  const isLoading = kpisLoading || extrasLoading;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 mb-8">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 mb-8">
      <h2 className="text-xl font-display font-semibold text-foreground">
        Resumen del mes
      </h2>

      {/* Main KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Monthly Revenue */}
        <div className="stryk-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-display font-semibold text-success">
                {formatCurrency(monthlyRevenue)}
              </p>
              <p className="text-sm text-muted-foreground">Ingresos del mes</p>
            </div>
          </div>
        </div>

        {/* Pending Payments */}
        <div className="stryk-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-display font-semibold">
                {formatCurrency(pendingPayments)}
              </p>
              <p className="text-sm text-muted-foreground">Pendiente</p>
            </div>
          </div>
        </div>

        {/* Collection Rate */}
        <div className="stryk-card p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              collectionRate >= 80 ? 'bg-success/10' : collectionRate >= 50 ? 'bg-warning/10' : 'bg-destructive/10'
            }`}>
              <Percent className={`w-5 h-5 ${
                collectionRate >= 80 ? 'text-success' : collectionRate >= 50 ? 'text-warning' : 'text-destructive'
              }`} />
            </div>
            <div>
              <p className="text-2xl font-display font-semibold">
                {collectionRate}%
              </p>
              <p className="text-sm text-muted-foreground">Cobranza</p>
            </div>
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="stryk-card p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              globalAttendanceRate >= 80 ? 'bg-success/10' : globalAttendanceRate >= 60 ? 'bg-warning/10' : 'bg-muted'
            }`}>
              <ClipboardList className={`w-5 h-5 ${
                globalAttendanceRate >= 80 ? 'text-success' : globalAttendanceRate >= 60 ? 'text-warning' : 'text-muted-foreground'
              }`} />
            </div>
            <div>
              <p className="text-2xl font-display font-semibold">
                {globalAttendanceRate}%
              </p>
              <p className="text-sm text-muted-foreground">Asistencia</p>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary KPIs Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stryk-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-display font-semibold">{activePlayers}</p>
              <p className="text-sm text-muted-foreground">Alumnos activos</p>
            </div>
          </div>
        </div>

        <div className="stryk-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-display font-semibold">{activeCategories}</p>
              <p className="text-sm text-muted-foreground">Categorías</p>
            </div>
          </div>
        </div>

        <div className="stryk-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-display font-semibold">{trainingsThisWeek}</p>
              <p className="text-sm text-muted-foreground">Entrenamientos semana</p>
            </div>
          </div>
        </div>

        {sinAtrasados ? (
          <div className="stryk-card p-4 border-success/30 bg-success/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-success">Sin atrasados</p>
                <p className="text-sm text-muted-foreground">Todos al día</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="stryk-card p-4 border-destructive/30 bg-destructive/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-display font-semibold text-destructive">
                  {overduePlayersCount}
                </p>
                <p className="text-sm text-muted-foreground">
                  {overduePlayersCount > 0 ? 'jugadores con adeudo' : 'con monto pendiente'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Revenue Chart */}
      {revenueByMonth.length > 0 && (
        <div className="stryk-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            Ingresos últimos 6 meses
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="month" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Ingresos']}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
