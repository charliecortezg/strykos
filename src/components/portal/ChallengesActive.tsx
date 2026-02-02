import { Target, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { ChallengeCriteria } from '@/types/stryk-way';
import { CHALLENGE_CRITERIA_LABELS } from '@/types/stryk-way';

interface Challenge {
  id: string;
  name: string;
  description: string | null;
  xp_reward: number;
  criteria: ChallengeCriteria;
  progress: number;
  isCompleted: boolean;
}

interface ChallengesActiveProps {
  challenges: Challenge[];
}

export function ChallengesActive({ challenges }: ChallengesActiveProps) {
  if (challenges.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Target className="w-10 h-10 mx-auto mb-2 opacity-20" />
        <p className="text-sm">No hay retos activos</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {challenges.map(challenge => (
        <ChallengeCard key={challenge.id} challenge={challenge} />
      ))}
    </div>
  );
}

function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const threshold = challenge.criteria.threshold;
  const progress = Math.min(challenge.progress, threshold);
  const percentage = Math.round((progress / threshold) * 100);

  return (
    <div 
      className={cn(
        'p-4 rounded-lg border transition-all',
        challenge.isCompleted 
          ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' 
          : 'bg-card border-border'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn(
          'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
          challenge.isCompleted 
            ? 'bg-green-100 text-green-600 dark:bg-green-900/50' 
            : 'bg-primary/10 text-primary'
        )}>
          {challenge.isCompleted ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <Target className="w-5 h-5" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium truncate">{challenge.name}</h4>
            <span className={cn(
              'text-sm font-semibold whitespace-nowrap',
              challenge.isCompleted ? 'text-green-600' : 'text-primary'
            )}>
              +{challenge.xp_reward} XP
            </span>
          </div>

          {challenge.description && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {challenge.description}
            </p>
          )}

          {/* Progress */}
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {CHALLENGE_CRITERIA_LABELS[challenge.criteria.type] || 'Progreso'}
              </span>
              <span className="font-medium">
                {progress} / {threshold}
              </span>
            </div>
            <Progress 
              value={percentage} 
              className={cn(
                'h-1.5',
                challenge.isCompleted && '[&>div]:bg-green-500'
              )} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
