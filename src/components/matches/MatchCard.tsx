import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MapPin, Eye, Target } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Match, getMatchResult } from '@/types/matches';
import { cn } from '@/lib/utils';

interface MatchCardProps {
  match: Match;
  onView: () => void;
  onLoadResults?: () => void;
  canLoadResults?: boolean;
}

export function MatchCard({ match, onView, onLoadResults, canLoadResults }: MatchCardProps) {
  const result = getMatchResult(match.goals_for, match.goals_against);
  const isFinished = match.status === 'terminado';
  const isScheduled = match.status === 'programado';

  // Extract field name from notes
  const getFieldName = (notes: string | null) => {
    if (!notes) return null;
    const match = notes.match(/^Campo: (.+?)(\n|$)/);
    return match ? match[1] : null;
  };
  
  const fieldName = getFieldName(match.notes);

  return (
    <Card className="p-3 active:scale-[0.99] transition-transform">
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

        {/* Score/Status + Actions */}
        <div className="flex items-center gap-2 shrink-0">
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
          ) : isScheduled ? (
            <div className="flex items-center gap-1.5">
              <Badge 
                variant="outline"
                className="bg-primary/10 text-primary border-primary/20"
              >
                Programado
              </Badge>
              {canLoadResults && onLoadResults && (
                <Button
                  variant="default"
                  size="sm"
                  className="h-8 gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLoadResults();
                  }}
                >
                  <Target className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Resultado</span>
                </Button>
              )}
            </div>
          ) : (
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
              Cancelado
            </Badge>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
          >
            <Eye className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
