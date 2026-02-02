import { Users, Zap, Trophy, Target, TrendingUp, Flame, Star } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useStrykAnalytics } from '@/hooks/useStrykWay/useStrykAnalytics';

export function AnalyticsDashboard() {
  const { analytics, isLoading } = useStrykAnalytics();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  const adoptionRate = analytics.totalPlayers > 0 
    ? Math.round((analytics.activePlayers / analytics.totalPlayers) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Jugadores Activos"
          value={analytics.activePlayers}
          subtext={`de ${analytics.totalPlayers} totales`}
        />
        <StatCard
          icon={Zap}
          label="XP Total"
          value={analytics.totalXp.toLocaleString()}
          subtext="acumulado"
        />
        <StatCard
          icon={Star}
          label="Nivel Promedio"
          value={analytics.averageLevel.toFixed(1)}
          subtext="por jugador"
        />
        <StatCard
          icon={Flame}
          label="Racha Promedio"
          value={`${analytics.averageStreak.toFixed(1)}d`}
          subtext="días consecutivos"
        />
      </div>

      {/* Adoption Rate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Adopción de STRYK Way
          </CardTitle>
          <CardDescription>
            Porcentaje de jugadores con progreso registrado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{adoptionRate}%</span>
              <span className="text-sm text-muted-foreground">
                {analytics.activePlayers} de {analytics.totalPlayers} jugadores
              </span>
            </div>
            <Progress value={adoptionRate} className="h-3" />
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Achievements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Logros y Retos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium">Badges Desbloqueados</span>
              </div>
              <span className="text-2xl font-bold">{analytics.badgesEarned}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium">Retos Completados</span>
              </div>
              <span className="text-2xl font-bold">{analytics.challengesCompleted}</span>
            </div>
          </CardContent>
        </Card>

        {/* Top Players */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              Top Jugadores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.topPlayers.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Sin datos aún
              </p>
            ) : (
              <div className="space-y-3">
                {analytics.topPlayers.map((player, index) => (
                  <div 
                    key={player.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? 'bg-amber-100 text-amber-700' :
                        index === 1 ? 'bg-slate-100 text-slate-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{player.name}</p>
                        <p className="text-xs text-muted-foreground">Nivel {player.level}</p>
                      </div>
                    </div>
                    <span className="font-semibold text-primary">{player.xp} XP</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Level Distribution */}
      {analytics.levelDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Nivel</CardTitle>
            <CardDescription>
              Cuántos jugadores hay en cada nivel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-2 h-32">
              {analytics.levelDistribution.map(({ level, count }) => {
                const maxCount = Math.max(...analytics.levelDistribution.map(d => d.count));
                const heightPercent = (count / maxCount) * 100;
                
                return (
                  <div key={level} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium">{count}</span>
                    <div 
                      className="w-full bg-primary rounded-t transition-all"
                      style={{ height: `${heightPercent}%`, minHeight: '4px' }}
                    />
                    <span className="text-xs text-muted-foreground">Lv{level}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subtext 
}: { 
  icon: typeof Users; 
  label: string; 
  value: string | number; 
  subtext: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
