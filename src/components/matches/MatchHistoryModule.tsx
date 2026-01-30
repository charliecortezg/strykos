import { useState } from 'react';
import { Trophy, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MatchFilters } from '@/types/matches';
import { MatchFiltersPanel } from './MatchFiltersPanel';
import { MatchesGrid } from './MatchesGrid';
import { MatchDetailDrawer } from './MatchDetailDrawer';
import { useMatches, useMatchPlayers } from '@/hooks/useMatches';
import { Match, MatchPlayer } from '@/types/matches';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface MatchHistoryModuleProps {
  canEdit?: boolean;
  canDelete?: boolean;
}

const emptyFilters: MatchFilters = {
  dateFrom: '',
  dateTo: '',
  rival: '',
  sportId: '',
  categoryId: '',
  trainerId: '',
  venueId: '',
  matchType: '',
  result: '',
};

export function MatchHistoryModule({ canEdit = false, canDelete = false }: MatchHistoryModuleProps) {
  const [filters, setFilters] = useState<MatchFilters>(emptyFilters);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [matchToDelete, setMatchToDelete] = useState<Match | null>(null);
  
  const { matches, totalCount, isLoading, updateMatch, deleteMatch } = useMatches(filters);
  const { updateMatchPlayers } = useMatchPlayers(selectedMatch?.id || null);

  const handleClearFilters = () => {
    setFilters(emptyFilters);
  };

  const handleViewMatch = (match: Match) => {
    setSelectedMatch(match);
  };

  const handleCloseDrawer = () => {
    setSelectedMatch(null);
  };

  const handleUpdateMatch = (matchId: string, updates: Partial<Match>, userId: string) => {
    updateMatch.mutate({ matchId, updates, userId });
  };

  const handleUpdatePlayers = (players: Partial<MatchPlayer>[]) => {
    updateMatchPlayers.mutate(players);
  };

  const handleDeleteMatch = (match: Match) => {
    setMatchToDelete(match);
  };

  const confirmDelete = () => {
    if (matchToDelete) {
      deleteMatch.mutate(matchToDelete.id);
      setMatchToDelete(null);
      setSelectedMatch(null);
    }
  };

  const handleDeleteFromDrawer = (matchId: string) => {
    deleteMatch.mutate(matchId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-primary" />
            <h2 className="text-2xl font-display font-semibold text-foreground">
              Historial de Partidos
            </h2>
            <Badge variant="outline" className="gap-1 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/30 text-amber-600">
              <Crown className="w-3 h-3" />
              Premium
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Visualiza y analiza todos los partidos registrados con filtros avanzados
          </p>
        </div>
      </div>

      {/* Filters */}
      <MatchFiltersPanel
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={handleClearFilters}
      />

      {/* Results indicator */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando <span className="font-medium text-foreground">{matches.length}</span> de{' '}
          <span className="font-medium text-foreground">{totalCount}</span> partidos
        </p>
      </div>

      {/* Grid (replacing Table) */}
      <MatchesGrid
        matches={matches}
        isLoading={isLoading}
        onViewMatch={handleViewMatch}
        onDeleteMatch={canDelete ? handleDeleteMatch : undefined}
        canDelete={canDelete}
      />

      {/* Detail Drawer (replacing Modal) */}
      <MatchDetailDrawer
        match={selectedMatch}
        isOpen={!!selectedMatch}
        onClose={handleCloseDrawer}
        onUpdate={handleUpdateMatch}
        onUpdatePlayers={handleUpdatePlayers}
        onDelete={canDelete ? handleDeleteFromDrawer : undefined}
        canEdit={canEdit}
        canDelete={canDelete}
      />

      {/* Delete Confirmation Dialog (for grid delete) */}
      <AlertDialog open={!!matchToDelete} onOpenChange={(open) => !open && setMatchToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar partido?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán todos los datos del partido 
              {matchToDelete && (
                <span className="font-medium"> vs {matchToDelete.rival_name}</span>
              )} 
              {' '}incluyendo estadísticas de jugadores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar partido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
