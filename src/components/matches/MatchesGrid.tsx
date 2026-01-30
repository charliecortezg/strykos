import { Trophy } from 'lucide-react';
import { Match } from '@/types/matches';
import { MatchCard } from './MatchCard';

interface MatchesGridProps {
  matches: Match[];
  isLoading: boolean;
  onViewMatch: (match: Match) => void;
  onDeleteMatch?: (match: Match) => void;
  canDelete?: boolean;
}

export function MatchesGrid({ 
  matches, 
  isLoading, 
  onViewMatch, 
  onDeleteMatch,
  canDelete 
}: MatchesGridProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No hay partidos registrados</h3>
        <p className="text-sm text-muted-foreground">
          Los entrenadores pueden registrar partidos desde su dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {matches.map((match) => (
        <MatchCard 
          key={match.id} 
          match={match} 
          variant="full"
          onView={() => onViewMatch(match)}
          onDelete={onDeleteMatch ? () => onDeleteMatch(match) : undefined}
          canDelete={canDelete}
        />
      ))}
    </div>
  );
}
