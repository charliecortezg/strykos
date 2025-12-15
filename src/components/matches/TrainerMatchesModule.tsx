import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Trophy, Plus, Eye, Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { TrainerCategory } from '@/hooks/useTrainerCategories';
import { useMatches } from '@/hooks/useMatches';
import { CreateMatchModal } from './CreateMatchModal';
import { MatchDetailModal } from './MatchDetailModal';
import { Match, getMatchResult } from '@/types/matches';
import { cn } from '@/lib/utils';

interface TrainerMatchesModuleProps {
  categories: TrainerCategory[];
}

export function TrainerMatchesModule({ categories }: TrainerMatchesModuleProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  
  // Get matches for this trainer's categories
  const categoryIds = categories.map(c => c.id);
  const { matches, isLoading } = useMatches();
  
  // Filter to only show matches from trainer's categories
  const trainerMatches = matches.filter(m => categoryIds.includes(m.category_id));

  // Extract field name from notes
  const getFieldName = (notes: string | null) => {
    if (!notes) return null;
    const match = notes.match(/^Campo: (.+?)(\n|$)/);
    return match ? match[1] : null;
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
        <div className="space-y-2">
          {trainerMatches.map((match) => {
            const result = getMatchResult(match.goals_for, match.goals_against);
            const isFinished = match.status === 'terminado';
            const fieldName = getFieldName(match.notes);

            return (
              <Card 
                key={match.id}
                className="p-3 cursor-pointer hover:bg-muted/30 transition-colors active:scale-[0.99]"
                onClick={() => setSelectedMatch(match)}
              >
                <div className="flex items-center gap-3">
                  {/* Date Column */}
                  <div className="flex flex-col items-center justify-center w-14 shrink-0">
                    <span className="text-xs text-muted-foreground uppercase">
                      {format(new Date(match.match_date), 'MMM', { locale: es })}
                    </span>
                    <span className="text-2xl font-display font-bold">
                      {format(new Date(match.match_date), 'd')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(match.match_date), 'HH:mm')}
                    </span>
                  </div>

                  {/* Match Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">vs {match.rival_name}</span>
                      <Badge 
                        variant="secondary" 
                        className="text-[10px] px-1.5 shrink-0"
                      >
                        {match.match_type === 'liga' ? 'Liga' : match.match_type === 'torneo' ? 'Torneo' : 'Amistoso'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{match.category?.name}</span>
                      {fieldName && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 shrink-0" />
                            {fieldName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Score/Status */}
                  <div className="shrink-0">
                    {isFinished ? (
                      <div className={cn(
                        "text-center px-3 py-1.5 rounded-lg font-display font-bold",
                        result === 'victoria' && "bg-success/10 text-success",
                        result === 'empate' && "bg-warning/10 text-warning",
                        result === 'derrota' && "bg-destructive/10 text-destructive"
                      )}>
                        <span className="text-xl">{match.goals_for}</span>
                        <span className="mx-1 text-muted-foreground">-</span>
                        <span className="text-xl">{match.goals_against}</span>
                      </div>
                    ) : (
                      <Badge 
                        variant="outline"
                        className="bg-primary/10 text-primary border-primary/20"
                      >
                        Programado
                      </Badge>
                    )}
                  </div>

                  {/* View Icon */}
                  <Eye className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <CreateMatchModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        categories={categories}
      />

      {/* Detail Modal (read-only for trainer) */}
      <MatchDetailModal
        match={selectedMatch}
        isOpen={!!selectedMatch}
        onClose={() => setSelectedMatch(null)}
        onUpdate={() => {}}
        onUpdatePlayers={() => {}}
        canEdit={false}
      />
    </div>
  );
}
