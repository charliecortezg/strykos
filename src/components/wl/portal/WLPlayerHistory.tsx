import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Users, Target, Award } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useWLPlayerHistory } from '@/hooks/useWLPlayerHistory';

interface Props {
  playerId: string;
  playerName?: string;
}

function typeLabel(t: string | null | undefined): string {
  if (!t) return 'Partido';
  const m: Record<string, string> = {
    liga: 'Liga',
    torneo: 'Torneo',
    amistoso: 'Amistoso',
    copa: 'Copa',
  };
  return m[t.toLowerCase()] || t;
}

export function WLPlayerHistory({ playerId }: Props) {
  const { history, isLoading, hasData } = useWLPlayerHistory(playerId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="h-16 bg-muted animate-pulse rounded-lg" />
          <div className="h-16 bg-muted animate-pulse rounded-lg" />
        </div>
        <div className="h-24 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!hasData || !history) return null;

  const { show_stats, training, totals, matches } = history;
  const trainingAttended = training.presente + training.justificado;

  return (
    <div className="space-y-4">
      {/* Summary tiles */}
      <div className={`grid gap-2 ${show_stats ? 'grid-cols-2' : 'grid-cols-2'}`}>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <CalendarDays className="h-3.5 w-3.5" /> Entrenamientos
            </div>
            <p className="text-lg font-semibold leading-none">
              {trainingAttended}
              <span className="text-sm text-muted-foreground font-normal"> / {training.total}</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Asistió (incluye justificados)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Users className="h-3.5 w-3.5" /> Partidos jugados
            </div>
            <p className="text-lg font-semibold leading-none">
              {show_stats && totals ? totals.matches_played : matches.filter(m => m.played).length}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              De {matches.length} convocatorias
            </p>
          </CardContent>
        </Card>

        {show_stats && totals && (
          <>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Target className="h-3.5 w-3.5" /> Goles
                </div>
                <p className="text-lg font-semibold leading-none">{totals.goals}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Award className="h-3.5 w-3.5" /> Asistencias
                </div>
                <p className="text-lg font-semibold leading-none">{totals.assists}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Match list */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold px-1">Partidos</h3>
        {matches.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-4 text-center text-sm text-muted-foreground">
              Aún no hay partidos terminados.
            </CardContent>
          </Card>
        ) : (
          matches.map((m, i) => {
            const personal =
              show_stats && m.played
                ? [
                    (m.goals || 0) > 0 ? `${m.goals} gol${(m.goals || 0) === 1 ? '' : 'es'}` : null,
                    (m.assists || 0) > 0
                      ? `${m.assists} asistencia${(m.assists || 0) === 1 ? '' : 's'}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : '';

            return (
              <Card key={i}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        vs {m.rival || 'Rival'}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {format(parseISO(m.date), "d MMM yyyy", { locale: es })} · {typeLabel(m.type)}
                      </p>
                    </div>
                    {show_stats && m.played && (m.score_for != null || m.score_against != null) && (
                      <Badge variant="outline" className="shrink-0 text-xs font-mono">
                        {m.score_for ?? 0} - {m.score_against ?? 0}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-2">
                    {m.played ? (
                      show_stats ? (
                        <p className="text-xs text-muted-foreground">
                          {personal || 'Jugó'}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Jugó</p>
                      )
                    ) : (
                      <p className="text-xs text-muted-foreground">Convocado, no participó</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
