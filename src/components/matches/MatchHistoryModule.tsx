import { useState } from 'react';
import { Trophy, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MatchFilters } from '@/types/matches';
import { MatchFiltersPanel } from './MatchFiltersPanel';
import { MatchesTable } from './MatchesTable';
import { MatchDetailModal } from './MatchDetailModal';
import { useMatches, useMatchPlayers } from '@/hooks/useMatches';
import { Match, MatchPlayer } from '@/types/matches';

interface MatchHistoryModuleProps {
  canEdit?: boolean;
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

export function MatchHistoryModule({ canEdit = false }: MatchHistoryModuleProps) {
  const [filters, setFilters] = useState<MatchFilters>(emptyFilters);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  
  const { matches, totalCount, isLoading, updateMatch } = useMatches(filters);
  const { updateMatchPlayers } = useMatchPlayers(selectedMatch?.id || null);

  const handleClearFilters = () => {
    setFilters(emptyFilters);
  };

  const handleViewMatch = (match: Match) => {
    setSelectedMatch(match);
  };

  const handleCloseModal = () => {
    setSelectedMatch(null);
  };

  const handleUpdateMatch = (matchId: string, updates: Partial<Match>, userId: string) => {
    updateMatch.mutate({ matchId, updates, userId });
  };

  const handleUpdatePlayers = (players: Partial<MatchPlayer>[]) => {
    updateMatchPlayers.mutate(players);
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

      {/* Table */}
      <MatchesTable
        matches={matches}
        isLoading={isLoading}
        onViewMatch={handleViewMatch}
      />

      {/* Detail Modal */}
      <MatchDetailModal
        match={selectedMatch}
        isOpen={!!selectedMatch}
        onClose={handleCloseModal}
        onUpdate={handleUpdateMatch}
        onUpdatePlayers={handleUpdatePlayers}
        canEdit={canEdit}
      />
    </div>
  );
}
