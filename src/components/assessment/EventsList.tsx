import { Calendar, Plus, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useEvaluationEvents } from '@/hooks/useEvaluationEvents';
import type { EvaluationEvent, EventStatus } from '@/types/assessment';
import { EVENT_STATUS_LABELS } from '@/types/assessment';

const STATUS_COLORS: Record<EventStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-primary/10 text-primary border-primary/20',
  closed: 'bg-secondary text-secondary-foreground',
};

interface EventsListProps {
  onCreateEvent: () => void;
  onSelectEvent: (event: EvaluationEvent) => void;
  canCreate: boolean;
}

export function EventsList({ onCreateEvent, onSelectEvent, canCreate }: EventsListProps) {
  const { events, isLoading } = useEvaluationEvents();

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Cargando eventos...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Eventos de Evaluación</h2>
        {canCreate && (
          <Button onClick={onCreateEvent} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Crear Evento
          </Button>
        )}
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No hay eventos de evaluación</p>
            {canCreate && (
              <Button onClick={onCreateEvent} variant="outline" size="sm" className="mt-4">
                Crear primer evento
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {events.map(event => (
            <Card
              key={event.id}
              className="cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => onSelectEvent(event)}
            >
              <CardContent className="flex items-center justify-between py-4 px-5">
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{event.title}</span>
                  {event.event_date && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.event_date).toLocaleDateString('es-MX', {
                        year: 'numeric', month: 'long', day: 'numeric',
                      })}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={STATUS_COLORS[event.status as EventStatus]}>
                    {EVENT_STATUS_LABELS[event.status as EventStatus]}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
