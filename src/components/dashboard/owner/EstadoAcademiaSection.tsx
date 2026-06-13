import { UserPlus, UserMinus, Users, UserX, AlertTriangle, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useAcademyKpis } from '@/hooks/useAcademyKpis';
import { useAuth } from '@/contexts/AuthContext';
import { OWNER_COPY } from '@/lib/owner-language';

/**
 * Versión "Panel del Dueño" de LifecycleBillingSection con copy traducido.
 * NO sustituye a LifecycleBillingSection (White Lions sigue usando esa).
 */
export function EstadoAcademiaSection() {
  const { organization } = useAuth();
  const { kpis, isLoading } = useAcademyKpis(organization?.id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-display font-semibold text-foreground">
          {OWNER_COPY.estado_academia}
        </h2>
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

  const items = [
    {
      value: kpis.nuevos_mes,
      label: OWNER_COPY.nuevos_ingresos,
      icon: UserPlus,
      tone: 'success' as const,
    },
    {
      value: kpis.bajas_mes,
      label: OWNER_COPY.bajas,
      icon: UserMinus,
      tone: 'destructive' as const,
    },
    {
      value: kpis.jugadores_activos,
      label: OWNER_COPY.activos,
      icon: Users,
      tone: 'primary' as const,
    },
    {
      value: kpis.jugadores_inactivos,
      label: OWNER_COPY.inactivos,
      icon: UserX,
      tone: 'muted' as const,
    },
    {
      value: kpis.mora_1_mes,
      label: OWNER_COPY.deben_1,
      icon: AlertTriangle,
      tone: 'warning' as const,
    },
    {
      value: kpis.mora_2_plus,
      label: OWNER_COPY.deben_2_plus,
      icon: AlertCircle,
      tone: 'destructive' as const,
    },
  ];

  const toneClasses: Record<string, string> = {
    success: 'bg-success/10 text-success',
    destructive: 'bg-destructive/10 text-destructive',
    primary: 'bg-primary/10 text-primary',
    muted: 'bg-muted text-muted-foreground',
    warning: 'bg-warning/10 text-warning',
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-display font-semibold text-foreground">
        {OWNER_COPY.estado_academia}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <Card key={it.label} className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${toneClasses[it.tone]}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-display font-semibold">{it.value}</p>
                  <p className="text-sm text-muted-foreground">{it.label}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
