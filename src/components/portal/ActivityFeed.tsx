import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Activity, CheckCircle, Trophy, Target, Zap } from 'lucide-react';

interface ActivityEvent {
  id: string;
  source_type: 'attendance' | 'match' | 'manual' | 'challenge';
  xp_delta: number;
  created_at: string;
  description: string;
}

interface ActivityFeedProps {
  events: ActivityEvent[];
  isLoading?: boolean;
}

const SOURCE_ICONS: Record<ActivityEvent['source_type'], typeof Activity> = {
  attendance: CheckCircle,
  match: Trophy,
  challenge: Target,
  manual: Zap,
};

const SOURCE_COLORS: Record<ActivityEvent['source_type'], string> = {
  attendance: 'text-green-600 bg-green-100',
  match: 'text-blue-600 bg-blue-100',
  challenge: 'text-purple-600 bg-purple-100',
  manual: 'text-amber-600 bg-amber-100',
};

export function ActivityFeed({ events, isLoading }: ActivityFeedProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-muted" />
            <div className="flex-1 space-y-1">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Activity className="w-10 h-10 mx-auto mb-2 opacity-20" />
        <p className="text-sm">Sin actividad reciente</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map(event => {
        const Icon = SOURCE_ICONS[event.source_type] || Activity;
        const colorClass = SOURCE_COLORS[event.source_type] || 'text-muted-foreground bg-muted';

        return (
          <div key={event.id} className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{event.description}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(event.created_at), { 
                  addSuffix: true,
                  locale: es,
                })}
              </p>
            </div>
            <span className="text-sm font-semibold text-primary">
              +{event.xp_delta}
            </span>
          </div>
        );
      })}
    </div>
  );
}
