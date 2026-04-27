import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMatches } from '@/hooks/useMatches';
import { MatchDetailModal } from '@/components/matches/MatchDetailModal';
import { getMatchResult } from '@/types/matches';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { matches, isLoading, updateMatch } = useMatches();

  const match = matches.find((m) => m.id === id) || null;

  const handleUpdate = (matchId: string, updates: any, userId: string) => {
    updateMatch.mutate({ matchId, updates, userId });
  };

  const isFinished = match?.status === 'terminado';
  const result = match ? getMatchResult(match.goals_for, match.goals_against) : null;

  return (
    <div className="w-full min-h-[100dvh] bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0 h-10 w-10"
            aria-label="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary shrink-0" />
              <h1 className="font-display font-semibold text-base truncate">
                {match ? `vs ${match.rival_name}` : 'Detalle del partido'}
              </h1>
            </div>
            {match && (
              <p className="text-xs text-muted-foreground truncate">
                {format(new Date(match.match_date), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
              </p>
            )}
          </div>
          {isFinished && result && (
            <Badge
              variant="outline"
              className={cn(
                'shrink-0',
                result === 'victoria' && 'bg-success/10 text-success border-success/20',
                result === 'empate' && 'bg-warning/10 text-warning border-warning/20',
                result === 'derrota' && 'bg-destructive/10 text-destructive border-destructive/20',
              )}
            >
              {result === 'victoria' ? 'Victoria' : result === 'empate' ? 'Empate' : 'Derrota'}
            </Badge>
          )}
        </div>
      </header>

      {/* Body */}
      <main className="px-4 py-4">
        {isLoading && !match ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !match ? (
          <div className="text-center py-12">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Partido no encontrado</p>
            <Button onClick={() => navigate(-1)} variant="outline" className="mt-4">
              Volver
            </Button>
          </div>
        ) : (
          // Reuse the existing modal content as a full-page panel.
          // The Dialog auto-renders inline content; we open it permanently and
          // strip its modal chrome via a wrapping container.
          <MatchDetailModal
            match={match}
            isOpen={true}
            onClose={() => navigate(-1)}
            onUpdate={handleUpdate}
            onUpdatePlayers={() => {}}
            canEdit={false}
          />
        )}
      </main>
    </div>
  );
}
