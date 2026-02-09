import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { UserPlus, UserMinus, AlertTriangle, CreditCard, ArrowRight, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PlayerTimelineProps {
  playerId: string;
}

interface TimelineEvent {
  id: string;
  type: 'lifecycle' | 'billing';
  event_type: string;
  label: string;
  detail: string | null;
  created_at: string;
}

const LIFECYCLE_EVENT_CONFIG: Record<string, { label: string; icon: typeof UserPlus; color: string }> = {
  onboard: { label: 'Onboarding completado', icon: UserPlus, color: 'text-success' },
  manual_change: { label: 'Cambio manual', icon: ArrowRight, color: 'text-primary' },
  auto_deactivate: { label: 'Desactivación automática', icon: UserMinus, color: 'text-destructive' },
  offboarding_started: { label: 'Offboarding iniciado', icon: UserMinus, color: 'text-warning' },
};

const BILLING_EVENT_CONFIG: Record<string, { label: string; color: string }> = {
  payment_recorded: { label: 'Pago registrado', color: 'text-success' },
  set_paid_current: { label: 'Al día', color: 'text-success' },
  set_overdue_1: { label: 'Mora 1 mes', color: 'text-warning' },
  set_overdue_2: { label: 'Mora 2+ meses', color: 'text-destructive' },
  auto_suspended: { label: 'Suspendido automáticamente', color: 'text-destructive' },
};

export function PlayerTimeline({ playerId }: PlayerTimelineProps) {
  const { organization } = useAuth();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['player-timeline', playerId, organization?.id],
    queryFn: async (): Promise<TimelineEvent[]> => {
      if (!organization?.id) return [];

      const [lifecycleRes, billingRes] = await Promise.all([
        supabase
          .from('player_lifecycle_log')
          .select('id, event_type, from_status, to_status, reason, created_at')
          .eq('organization_id', organization.id)
          .eq('player_id', playerId)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('billing_events_log')
          .select('id, event_type, meta, created_at')
          .eq('organization_id', organization.id)
          .eq('player_id', playerId)
          .order('created_at', { ascending: false })
          .limit(30),
      ]);

      const lifecycleEvents: TimelineEvent[] = (lifecycleRes.data || []).map((e: any) => ({
        id: e.id,
        type: 'lifecycle',
        event_type: e.event_type,
        label: LIFECYCLE_EVENT_CONFIG[e.event_type]?.label || e.event_type,
        detail: e.reason || (e.from_status && e.to_status ? `${e.from_status} → ${e.to_status}` : null),
        created_at: e.created_at,
      }));

      const billingEvents: TimelineEvent[] = (billingRes.data || []).map((e: any) => ({
        id: e.id,
        type: 'billing',
        event_type: e.event_type,
        label: BILLING_EVENT_CONFIG[e.event_type]?.label || e.event_type,
        detail: e.meta?.month || e.meta?.amount ? `${e.meta.month || ''} ${e.meta.amount ? `$${e.meta.amount}` : ''}`.trim() : null,
        created_at: e.created_at,
      }));

      return [...lifecycleEvents, ...billingEvents].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: !!organization?.id && !!playerId,
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Clock className="w-10 h-10 mx-auto mb-3 opacity-50" />
        <p>No hay eventos de lifecycle registrados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-64 overflow-y-auto">
      {events.map((event) => {
        const isLifecycle = event.type === 'lifecycle';
        const config = isLifecycle
          ? LIFECYCLE_EVENT_CONFIG[event.event_type]
          : BILLING_EVENT_CONFIG[event.event_type];
        const colorClass = config?.color || 'text-muted-foreground';
        const Icon = isLifecycle
          ? (LIFECYCLE_EVENT_CONFIG[event.event_type]?.icon || ArrowRight)
          : CreditCard;

        return (
          <div key={event.id} className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg">
            <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', colorClass)} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{event.label}</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {isLifecycle ? 'Lifecycle' : 'Billing'}
                </Badge>
              </div>
              {event.detail && (
                <p className="text-xs text-muted-foreground mt-0.5">{event.detail}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(new Date(event.created_at), "d MMM yyyy, HH:mm", { locale: es })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
