import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAutoEvent } from '@/hooks/useAutoEvent';
import { useExternalPlayers } from '@/hooks/useExternalPlayers';
import { CreateExternalPlayerModal } from './CreateExternalPlayerModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { UserPlus, ChevronDown, Clock, CheckCircle2, Lock, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { AgeGroup } from '@/types/assessment';
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

export function DirectorExternalEvaluationsView() {
  const { organization } = useAuth();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(true);
  const [evaluatedOpen, setEvaluatedOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const orgId = organization?.id || null;

  const { autoEvent, pendingPlayers, completedPlayers, isLoading, addPlayerToEvent, closeEvent, notifyCoaches } =
    useAutoEvent(orgId);

  const totalPlayers = pendingPlayers.length + completedPlayers.length;
  const progressPercent = totalPlayers > 0 ? Math.round((completedPlayers.length / totalPlayers) * 100) : 0;

  const handleAddPlayer = async (data: { full_name: string; age_group: AgeGroup; parent_email: string; parent_phone?: string }) => {
    if (!orgId || !autoEvent) return;
    setIsSubmitting(true);

    try {
      const midAge = data.age_group === '6-7' ? 7 : data.age_group === '8-9' ? 9 : 11;
      const birthYear = new Date().getFullYear() - midAge;

      const { data: player, error: playerError } = await supabase
        .from('players')
        .insert({
          organization_id: orgId,
          full_name: data.full_name,
          date_of_birth: `${birthYear}-01-01`,
          parent_email: data.parent_email,
          parent_phone: data.parent_phone || null,
          player_type: 'external',
          payment_status: 'al_dia',
          is_active: true,
          is_scholarship: false,
          is_trial: false,
        })
        .select()
        .single();

      if (playerError) throw playerError;

      await addPlayerToEvent.mutateAsync(player.id);

      const monthKey = new Date().toISOString().slice(0, 7);
      await notifyCoaches.mutateAsync({
        event_id: autoEvent.id,
        player_name: data.full_name,
        month: monthKey,
      });

      toast({ title: 'Listo para evaluar', description: 'Se notificó a los entrenadores.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!orgId) {
    return (
      <div className="stryk-card p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-warning mx-auto mb-3" />
        <h3 className="font-semibold text-foreground mb-1">Sin organización activa</h3>
        <p className="text-sm text-muted-foreground">
          No se detectó una organización activa. Recarga la página e intenta de nuevo.
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

  return (
    <div className="space-y-6">
      {/* Main CTA */}
      <Button
        onClick={() => setModalOpen(true)}
        size="lg"
        className="w-full sm:w-auto gap-2 text-base h-12"
      >
        <UserPlus className="w-5 h-5" />
        Agregar jugador (Solo Evaluación)
      </Button>

      {/* Event Progress */}
      {autoEvent && totalPlayers > 0 && (
        <div className="stryk-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{autoEvent.title}</h3>
            <Badge variant="outline" className="text-xs">
              {completedPlayers.length}/{totalPlayers} evaluados
            </Badge>
          </div>
          <Progress value={progressPercent} className="h-2" />

          {/* Pending section */}
          <Collapsible open={pendingOpen} onOpenChange={setPendingOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-foreground w-full">
              <ChevronDown className={`w-4 h-4 transition-transform ${pendingOpen ? '' : '-rotate-90'}`} />
              Pendientes ({pendingPlayers.length})
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1.5">
              {pendingPlayers.length === 0 ? (
                <p className="text-xs text-muted-foreground pl-6">Todos evaluados</p>
              ) : (
                pendingPlayers.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-2.5 bg-muted/40 rounded-lg ml-6">
                    <span className="text-sm font-medium">{p.player?.full_name}</span>
                    <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/20 gap-1">
                      <Clock className="w-3 h-3" /> Pendiente
                    </Badge>
                  </div>
                ))
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Evaluated section */}
          <Collapsible open={evaluatedOpen} onOpenChange={setEvaluatedOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-foreground w-full">
              <ChevronDown className={`w-4 h-4 transition-transform ${evaluatedOpen ? '' : '-rotate-90'}`} />
              Evaluados ({completedPlayers.length})
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1.5">
              {completedPlayers.length === 0 ? (
                <p className="text-xs text-muted-foreground pl-6">Ninguno evaluado aún</p>
              ) : (
                completedPlayers.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-2.5 bg-muted/40 rounded-lg ml-6">
                    <span className="text-sm font-medium">{p.player?.full_name}</span>
                    <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20 gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Evaluado
                    </Badge>
                  </div>
                ))
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Close event */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 mt-2">
                <Lock className="w-4 h-4" /> Cerrar Evento
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Cerrar evento de evaluación?</AlertDialogTitle>
                <AlertDialogDescription>
                  {pendingPlayers.length > 0
                    ? `Aún quedan ${pendingPlayers.length} jugadores pendientes de evaluar. ¿Deseas cerrar de todos modos?`
                    : 'Todos los jugadores han sido evaluados. El evento quedará cerrado.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => closeEvent.mutate()} disabled={closeEvent.isPending}>
                  {closeEvent.isPending ? 'Cerrando...' : 'Confirmar cierre'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Empty state */}
      {autoEvent && totalPlayers === 0 && (
        <div className="stryk-card p-8 text-center">
          <UserPlus className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            No hay jugadores en el evento de este mes. Usa el botón de arriba para agregar jugadores a evaluar.
          </p>
        </div>
      )}

      {/* Modal */}
      <CreateExternalPlayerModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSubmit={handleAddPlayer}
        isPending={isSubmitting}
      />
    </div>
  );
}
