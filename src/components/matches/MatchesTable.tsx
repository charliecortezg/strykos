import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Eye, Trophy, Calendar, MapPin, User } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Match, getMatchResult } from '@/types/matches';
import { cn } from '@/lib/utils';

interface MatchesTableProps {
  matches: Match[];
  isLoading: boolean;
  onViewMatch: (match: Match) => void;
}

const matchTypeLabels: Record<string, string> = {
  liga: 'Liga',
  torneo: 'Torneo',
  amistoso: 'Amistoso',
};

const statusLabels: Record<string, string> = {
  programado: 'Programado',
  terminado: 'Terminado',
  cancelado: 'Cancelado',
};

export function MatchesTable({ matches, isLoading, onViewMatch }: MatchesTableProps) {
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
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Fecha
              </div>
            </TableHead>
            <TableHead className="font-semibold">Rival</TableHead>
            <TableHead className="font-semibold">Categoría</TableHead>
            <TableHead className="font-semibold">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Entrenador
              </div>
            </TableHead>
            <TableHead className="font-semibold">Tipo</TableHead>
            <TableHead className="font-semibold">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Sede
              </div>
            </TableHead>
            <TableHead className="font-semibold text-center">Resultado</TableHead>
            <TableHead className="font-semibold">Estado</TableHead>
            <TableHead className="font-semibold text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matches.map((match) => {
            const result = getMatchResult(match.goals_for, match.goals_against);
            const isFinished = match.status === 'terminado';

            return (
              <TableRow key={match.id} className="hover:bg-muted/30 transition-colors">
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {format(new Date(match.match_date), 'dd MMM yyyy', { locale: es })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(match.match_date), 'HH:mm', { locale: es })}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{match.rival_name}</span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{match.category?.name || '—'}</span>
                    {match.category?.sports?.name && (
                      <Badge variant="outline" className="w-fit text-xs">
                        {match.category.sports.name}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{match.trainer?.full_name || '—'}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-normal">
                    {matchTypeLabels[match.match_type] || match.match_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{match.venue?.name || '—'}</span>
                </TableCell>
                <TableCell className="text-center">
                  {isFinished ? (
                    <div className="flex items-center justify-center gap-2">
                      <span className={cn(
                        "font-display font-bold text-lg px-3 py-1 rounded-md",
                        result === 'victoria' && "bg-success/10 text-success",
                        result === 'empate' && "bg-warning/10 text-warning",
                        result === 'derrota' && "bg-destructive/10 text-destructive"
                      )}>
                        {match.goals_for} – {match.goals_against}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={match.status === 'terminado' ? 'default' : 'outline'}
                    className={cn(
                      match.status === 'terminado' && "bg-success/10 text-success border-success/20",
                      match.status === 'programado' && "bg-primary/10 text-primary border-primary/20",
                      match.status === 'cancelado' && "bg-destructive/10 text-destructive border-destructive/20"
                    )}
                  >
                    {statusLabels[match.status] || match.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewMatch(match)}
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
  );
}
