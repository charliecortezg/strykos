import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Trophy, Plus, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-semibold text-foreground flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary" />
            Mis Partidos
          </h2>
          <p className="text-sm text-muted-foreground">
            Registra y visualiza los partidos de tus categorías
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Registrar Partido
        </Button>
      </div>

      {/* Matches List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : trainerMatches.length === 0 ? (
        <div className="stryk-card p-12 text-center">
          <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No hay partidos registrados</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Comienza registrando tu primer partido
          </p>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Registrar Partido
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Fecha</TableHead>
                <TableHead>Rival</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-center">Resultado</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trainerMatches.map((match) => {
                const result = getMatchResult(match.goals_for, match.goals_against);
                const isFinished = match.status === 'terminado';

                return (
                  <TableRow key={match.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {format(new Date(match.match_date), 'dd MMM', { locale: es })}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(match.match_date), 'HH:mm')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{match.rival_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{match.category?.name}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {match.match_type === 'liga' ? 'Liga' : match.match_type === 'torneo' ? 'Torneo' : 'Amistoso'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {isFinished ? (
                        <span className={cn(
                          "font-display font-bold px-3 py-1 rounded-md",
                          result === 'victoria' && "bg-success/10 text-success",
                          result === 'empate' && "bg-warning/10 text-warning",
                          result === 'derrota' && "bg-destructive/10 text-destructive"
                        )}>
                          {match.goals_for} – {match.goals_against}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline"
                        className={cn(
                          match.status === 'terminado' && "bg-success/10 text-success border-success/20",
                          match.status === 'programado' && "bg-primary/10 text-primary border-primary/20"
                        )}
                      >
                        {match.status === 'terminado' ? 'Terminado' : 'Programado'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedMatch(match)}
                        className="gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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
