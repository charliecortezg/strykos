import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAutoEvent } from '@/hooks/useAutoEvent';
import { useCoachNotifications } from '@/hooks/useCoachNotifications';
import { EventModeScreen } from '@/components/assessment/EventModeScreen';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, CheckCircle2, Play, AlertTriangle } from 'lucide-react';

export function CoachExternalEvaluationsView() {
  const { allOrganizations } = useAuth();
  const [eventMode, setEventMode] = useState(false);

  // Find assessment lab org
  const assessmentLabOrg = allOrganizations.find(
    o => o.organization.organization_mode === 'evaluation_only'
  );
  const assessmentLabOrgId = assessmentLabOrg?.organization.id || null;

  const { autoEvent, pendingPlayers, completedPlayers, isLoading } = useAutoEvent(assessmentLabOrgId);
  const { unreadCount, markAllRead } = useCoachNotifications(assessmentLabOrgId);

  // Mark notifications as read when this view mounts
  useEffect(() => {
    if (unreadCount > 0) {
      markAllRead.mutate();
    }
  }, [unreadCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPlayers = pendingPlayers.length + completedPlayers.length;
  const progressPercent = totalPlayers > 0 ? Math.round((completedPlayers.length / totalPlayers) * 100) : 0;

  if (!assessmentLabOrg) {
    return (
      <div className="stryk-card p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-warning mx-auto mb-3" />
        <h3 className="font-semibold text-foreground mb-1">Sin acceso a Assessment Lab</h3>
        <p className="text-sm text-muted-foreground">
          No tienes acceso a evaluaciones externas. Solicita al Director Deportivo que te agregue.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  // Event mode fullscreen
  if (eventMode && autoEvent) {
    return <EventModeScreen event={autoEvent} onExit={() => setEventMode(false)} />;
  }

  if (!autoEvent || totalPlayers === 0) {
    return (
      <div className="stryk-card p-8 text-center">
        <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">
          No hay evaluaciones externas pendientes este mes. El Director Deportivo agregará jugadores cuando haya un evento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* CTA */}
      {pendingPlayers.length > 0 && (
        <Button
          onClick={() => setEventMode(true)}
          size="lg"
          className="w-full sm:w-auto gap-2 text-base h-12"
        >
          <Play className="w-5 h-5" />
          {completedPlayers.length > 0 ? 'Continuar Modo Evento' : 'Iniciar Modo Evento'}
        </Button>
      )}

      {/* Progress */}
      <div className="stryk-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{autoEvent.title}</h3>
          <Badge variant="outline" className="text-xs">
            {completedPlayers.length}/{totalPlayers} evaluados
          </Badge>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Pending list */}
      {pendingPlayers.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-sm font-medium text-muted-foreground">Pendientes</h4>
          {pendingPlayers.map(p => (
            <div key={p.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
              <span className="text-sm font-medium">{p.player?.full_name}</span>
              <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/20 gap-1">
                <Clock className="w-3 h-3" /> Pendiente
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* Completed list */}
      {completedPlayers.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-sm font-medium text-muted-foreground">Evaluados</h4>
          {completedPlayers.map(p => (
            <div key={p.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
              <span className="text-sm font-medium">{p.player?.full_name}</span>
              <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20 gap-1">
                <CheckCircle2 className="w-3 h-3" /> Evaluado
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
