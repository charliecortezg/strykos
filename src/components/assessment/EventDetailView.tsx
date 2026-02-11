import { useState } from 'react';
import { ArrowLeft, Play, Lock, Users, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useEventPlayers } from '@/hooks/useEvaluationEvents';
import { useEvaluationEvents } from '@/hooks/useEvaluationEvents';
import { AddExternalPlayerForm } from './AddExternalPlayerForm';
import { EventModeScreen } from './EventModeScreen';
import { EVENT_STATUS_LABELS, type EvaluationEvent, type EventStatus } from '@/types/assessment';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface EventDetailViewProps {
  event: EvaluationEvent;
  onBack: () => void;
  canManage: boolean; // director/owner
  canEvaluate: boolean; // coach/director
}

export function EventDetailView({ event, onBack, canManage, canEvaluate }: EventDetailViewProps) {
  const { eventPlayers, pendingPlayers, completedPlayers, addPlayerToEvent } = useEventPlayers(event.id);
  const { updateEventStatus } = useEvaluationEvents();
  const [showEventMode, setShowEventMode] = useState(false);

  const isClosed = event.status === 'closed';
  const isActive = event.status === 'active';
  const isDraft = event.status === 'draft';

  const handleActivate = () => {
    updateEventStatus.mutate({ eventId: event.id, status: 'active' });
  };

  const handleClose = () => {
    updateEventStatus.mutate({ eventId: event.id, status: 'closed' });
  };

  const handlePlayerCreated = async (playerId: string) => {
    await addPlayerToEvent.mutateAsync(playerId);
  };

  if (showEventMode && isActive) {
    return (
      <EventModeScreen
        event={event}
        onExit={() => setShowEventMode(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold">{event.title}</h2>
            {event.event_date && (
              <p className="text-sm text-muted-foreground">
                {new Date(event.event_date).toLocaleDateString('es-MX', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </p>
            )}
          </div>
        </div>
        <Badge variant="outline" className="text-sm">
          {EVENT_STATUS_LABELS[event.status as EventStatus]}
        </Badge>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-4 text-center">
            <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{eventPlayers.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{completedPlayers.length}</p>
            <p className="text-xs text-muted-foreground">Evaluados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <Clock className="h-5 w-5 mx-auto mb-1 text-warning" />
            <p className="text-2xl font-bold">{pendingPlayers.length}</p>
            <p className="text-xs text-muted-foreground">Pendientes</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {canManage && isDraft && (
          <Button onClick={handleActivate} disabled={eventPlayers.length === 0 || updateEventStatus.isPending}>
            <Play className="h-4 w-4 mr-1.5" /> Activar Evento
          </Button>
        )}
        {canEvaluate && isActive && pendingPlayers.length > 0 && (
          <Button onClick={() => setShowEventMode(true)} size="lg" className="gap-2">
            <Play className="h-5 w-5" /> Iniciar Modo Evento
          </Button>
        )}
        {canManage && isActive && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="gap-1.5">
                <Lock className="h-4 w-4" /> Cerrar Evento
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Cerrar evento?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esto bloqueará todas las evaluaciones. No se podrán editar después.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleClose}>
                  Cerrar evento
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Add players (director only, when not closed) */}
      {canManage && !isClosed && (
        <AddExternalPlayerForm eventId={event.id} onPlayerCreated={handlePlayerCreated} />
      )}

      {/* Roster */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Roster ({eventPlayers.length})
        </h3>
        {eventPlayers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No hay jugadores en este evento. Agrega jugadores para comenzar.
          </p>
        ) : (
          <div className="space-y-1.5">
            {eventPlayers.map(ep => (
              <Card key={ep.id}>
                <CardContent className="flex items-center justify-between py-3 px-4">
                  <div>
                    <span className="font-medium text-sm">{ep.player?.full_name || 'Jugador'}</span>
                    {ep.player?.parent_email && (
                      <span className="text-xs text-muted-foreground ml-2">
                        {ep.player.parent_email}
                      </span>
                    )}
                  </div>
                  <Badge variant={ep.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                    {ep.status === 'completed' ? 'Evaluado' : 'Pendiente'}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
