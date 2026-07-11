import { Card, CardContent } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { useWLFamilyProfile } from '@/hooks/useWLFamilyProfile';

interface Props {
  playerId: string;
  playerName: string;
}

export function WLFamilyProfile({ playerId, playerName }: Props) {
  const { months, isLoading, hasData } = useWLFamilyProfile(playerId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        <div className="h-28 bg-muted animate-pulse rounded-lg" />
        <div className="h-28 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!hasData) return null;

  const firstName = playerName.split(' ')[0] || playerName;

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Perfil Formativo</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          El desarrollo de {firstName} mes a mes.
        </p>
      </header>

      <div className="space-y-3">
        {months.map(m => (
          <Card key={`${m.season}-${m.month_key}`} className="border-primary/10">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-semibold text-base">{m.month_label}</h3>
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Temporada {m.season}
                </span>
              </div>

              <div className="space-y-3">
                {m.indicators.map((ind, i) => (
                  <div key={i} className="space-y-1">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {ind.name}
                    </p>
                    <p className="text-[15px] leading-relaxed text-foreground">
                      {ind.frase}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
