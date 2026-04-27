import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { TrainerCategory } from '@/hooks/useTrainerCategories';
import { useMatches, useMatchPlayers } from '@/hooks/useMatches';
import { CreateMatchFlow } from './CreateMatchFlow';
import { LoadResultsModal } from './LoadResultsModal';
import { MatchCard } from './MatchCard';
import { Match } from '@/types/matches';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface TrainerMatchesModuleProps {
  categories: TrainerCategory[];
}

export function TrainerMatchesModule({ categories }: TrainerMatchesModuleProps) {
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [matchForResults, setMatchForResults] = useState<Match | null>(null);
  const [matchToDelete, setMatchToDelete] = useState<Match | null>(null);
  
  // Get matches for this trainer's categories
  const categoryIds = categories.map(c => c.id);
  const { matches, isLoading, updateMatch, deleteMatch } = useMatches();
  const { updateMatchPlayers } = useMatchPlayers(matchForResults?.id || null);
  
  // Filter to only show matches from trainer's categories
  const trainerMatches = matches.filter(m => categoryIds.includes(m.category_id));

  // Separate scheduled vs finished
  const scheduledMatches = trainerMatches.filter(m => m.status === 'programado');
  const finishedMatches = trainerMatches.filter(m => m.status === 'terminado');

  const handleUpdateMatch = (matchId: string, updates: Partial<Match>, userId: string) => {
    updateMatch.mutate({ matchId, updates, userId });
  };

  const handleUpdatePlayers = (players: any[]) => {
    updateMatchPlayers.mutate(players);
  };

  return (
    <div className="space-y-4">
      {/* Header - Compact for mobile */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-display font-semibold">
            Mis Partidos
          </h2>
          <Badge variant="outline">{trainerMatches.length}</Badge>
        </div>
        <Button 
          onClick={() => setIsCreateOpen(true)} 
          className="h-12 px-4 gap-2"
          size="lg"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Registrar</span>
        </Button>
      </div>

      {/* Matches List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : trainerMatches.length === 0 ? (
        <Card className="p-8 text-center">
          <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Sin partidos</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Registra tu primer partido
          </p>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2 h-12">
            <Plus className="w-4 h-4" />
            Registrar Partido
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Scheduled Matches - Show prominently */}
          {scheduledMatches.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Próximos ({scheduledMatches.length})
              </h3>
              <div className="space-y-2">
                {scheduledMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    onView={() => navigate(`/partidos/${match.id}`)}
                    onLoadResults={() => setMatchForResults(match)}
                    onDelete={() => setMatchToDelete(match)}
                    canLoadResults={true}
                    canDelete={true}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Finished Matches */}
          {finishedMatches.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Terminados ({finishedMatches.length})
              </h3>
              <div className="space-y-2">
                {finishedMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    onView={() => navigate(`/partidos/${match.id}`)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Match Flow (Drawer) */}
      <CreateMatchFlow
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        categories={categories}
      />

      {/* Load Results Modal (Drawer) */}
      <LoadResultsModal
        match={matchForResults}
        isOpen={!!matchForResults}
        onClose={() => setMatchForResults(null)}
        onUpdate={handleUpdateMatch}
        onUpdatePlayers={handleUpdatePlayers}
      />

      {/* Match detail now opens as a full page at /partidos/:id */}
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!matchToDelete} onOpenChange={(open) => !open && setMatchToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar partido programado?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el partido
              {matchToDelete && (
                <span className="font-medium"> vs {matchToDelete.rival_name}</span>
              )}
              . Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (matchToDelete) {
                  deleteMatch.mutate(matchToDelete.id);
                  setMatchToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
