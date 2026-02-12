import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useMembershipBlocks, usePlayersWithBlocks } from '@/hooks/useMembershipBlocks';
import { Users, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

const BLOCK_COLORS: Record<string, string> = {
  FOUNDATION: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
  DEVELOPMENT: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  PROJECTION: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
  CONSOLIDATION: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30',
};

const BLOCK_ICONS: Record<string, string> = {
  FOUNDATION: '🏗️',
  DEVELOPMENT: '📈',
  PROJECTION: '🚀',
  CONSOLIDATION: '🏆',
};

export function MembershipOverview() {
  const { blocks, isLoading: blocksLoading } = useMembershipBlocks();
  const { data: players, isLoading: playersLoading } = usePlayersWithBlocks();

  const isLoading = blocksLoading || playersLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const playersByBlock = blocks.map(block => ({
    block,
    players: (players || []).filter(p => p.block_code === block.code),
    noneCount: block.sequence_order === 1
      ? (players || []).filter(p => p.membership_stage === 'none').length
      : 0,
  }));

  const notEligible = (players || []).filter(p => 
    p.block_id && p.days_remaining === 0 && 
    (p.eval_count < p.min_evaluations || p.attendance_pct < p.min_attendance_pct)
  );

  return (
    <div className="space-y-6">
      {/* Block distribution cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {playersByBlock.map(({ block, players: blockPlayers, noneCount }) => (
          <Card key={block.id} className={`border ${BLOCK_COLORS[block.code] || ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{BLOCK_ICONS[block.code]}</span>
                  <div>
                    <p className="font-semibold text-sm">{block.name}</p>
                    <p className="text-xs text-muted-foreground">{block.duration_months} meses</p>
                  </div>
                </div>
                <span className="text-2xl font-bold">{blockPlayers.length}</span>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Min. {block.min_evaluations} evaluaciones</p>
                <p>Min. {block.min_attendance_pct}% asistencia</p>
              </div>
              {noneCount > 0 && (
                <Badge variant="outline" className="mt-2 text-xs">
                  +{noneCount} sin asignar
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Not eligible players */}
      {notEligible.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              No elegibles para progresión ({notEligible.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notEligible.map(player => {
                const evalMissing = Math.max(0, player.min_evaluations - player.eval_count);
                const attendanceLow = player.attendance_pct < player.min_attendance_pct;

                return (
                  <div key={player.player_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-sm">{player.full_name}</p>
                      <p className="text-xs text-muted-foreground">{player.block_name}</p>
                    </div>
                    <div className="flex gap-2">
                      {evalMissing > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          Faltan {evalMissing} eval
                        </Badge>
                      )}
                      {attendanceLow && (
                        <Badge variant="secondary" className="text-xs">
                          Asistencia {player.attendance_pct}%
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All players by block */}
      {playersByBlock.map(({ block, players: blockPlayers }) => (
        blockPlayers.length > 0 && (
          <Card key={block.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <span>{BLOCK_ICONS[block.code]}</span>
                {block.name}
                <Badge variant="outline">{blockPlayers.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {blockPlayers.map(player => (
                  <div key={player.player_id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{player.full_name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          {player.eval_count}/{player.min_evaluations} eval
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {player.attendance_pct}% asist.
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {player.days_remaining}d restantes
                        </span>
                      </div>
                    </div>
                    <div className="w-24">
                      <Progress 
                        value={Math.min(100, (player.eval_count / Math.max(1, player.min_evaluations)) * 100)} 
                        className="h-2" 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      ))}
    </div>
  );
}
