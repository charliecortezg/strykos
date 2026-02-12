import { Trophy, Medal, Star, Flame, Target, Award, Crown, Zap, Heart, Shield, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StrykBadge, BadgeRarity, RARITY_COLORS } from '@/types/stryk-way';

interface EarnedBadge {
  id: string;
  badge: StrykBadge;
  earned_at: string;
}

interface BadgesGridProps {
  earnedBadges: EarnedBadge[];
  lockedBadges: StrykBadge[];
  showLocked?: boolean;
  blockDateRange?: { start: string; end: string } | null;
}

const ICON_MAP: Record<string, typeof Trophy> = {
  trophy: Trophy,
  medal: Medal,
  star: Star,
  flame: Flame,
  target: Target,
  award: Award,
  crown: Crown,
  zap: Zap,
  heart: Heart,
  shield: Shield,
};

const RARITY_STYLES: Record<BadgeRarity, string> = {
  common: 'bg-slate-100 border-slate-300 text-slate-700',
  rare: 'bg-blue-100 border-blue-300 text-blue-700',
  epic: 'bg-purple-100 border-purple-300 text-purple-700',
  legendary: 'bg-amber-100 border-amber-300 text-amber-700',
};

const RARITY_GLOW: Record<BadgeRarity, string> = {
  common: '',
  rare: 'shadow-blue-200/50',
  epic: 'shadow-purple-200/50',
  legendary: 'shadow-amber-200/50 shadow-lg',
};

export function BadgesGrid({ earnedBadges, lockedBadges, showLocked = true, blockDateRange }: BadgesGridProps) {
  // Separate badges by block date range if provided
  const blockBadges = blockDateRange
    ? earnedBadges.filter(eb => eb.earned_at >= blockDateRange.start && eb.earned_at <= blockDateRange.end)
    : [];
  const otherBadges = blockDateRange
    ? earnedBadges.filter(eb => eb.earned_at < blockDateRange.start || eb.earned_at > blockDateRange.end)
    : earnedBadges;

  return (
    <div className="space-y-4">
      {/* Block badges */}
      {blockDateRange && blockBadges.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Logros del bloque actual ({blockBadges.length})
          </h3>
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
            {blockBadges.map(({ id, badge, earned_at }) => (
              <BadgeItem key={id} badge={badge} earnedAt={earned_at} />
            ))}
          </div>
        </div>
      )}

      {/* All / other earned badges */}
      {otherBadges.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            {blockDateRange ? `Logros anteriores (${otherBadges.length})` : `Logros desbloqueados (${otherBadges.length})`}
          </h3>
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
            {otherBadges.map(({ id, badge, earned_at }) => (
              <BadgeItem key={id} badge={badge} earnedAt={earned_at} />
            ))}
          </div>
        </div>
      )}

      {/* Locked Badges */}
      {showLocked && lockedBadges.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Por desbloquear ({lockedBadges.length})
          </h3>
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
            {lockedBadges.map(badge => (
              <BadgeItem key={badge.id} badge={badge} locked />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {earnedBadges.length === 0 && lockedBadges.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Trophy className="w-12 h-12 mx-auto mb-2 opacity-20" />
          <p>No hay badges configurados aún</p>
        </div>
      )}
    </div>
  );
}

function BadgeItem({ 
  badge, 
  locked = false,
  earnedAt,
}: { 
  badge: StrykBadge; 
  locked?: boolean;
  earnedAt?: string;
}) {
  const Icon = ICON_MAP[badge.icon || 'trophy'] || Trophy;
  const rarity = badge.rarity as BadgeRarity;

  return (
    <div 
      className={cn(
        'relative flex flex-col items-center p-2 rounded-lg border transition-all',
        locked 
          ? 'bg-muted/30 border-muted opacity-50 grayscale' 
          : cn(RARITY_STYLES[rarity], RARITY_GLOW[rarity], 'shadow-sm')
      )}
      title={`${badge.name}${badge.description ? `: ${badge.description}` : ''}`}
    >
      <div className="relative">
        <Icon className={cn(
          'w-8 h-8',
          locked ? 'text-muted-foreground' : ''
        )} />
        {locked && (
          <Lock className="absolute -bottom-1 -right-1 w-3 h-3 text-muted-foreground" />
        )}
      </div>
      <span className="text-[10px] font-medium text-center mt-1 line-clamp-2">
        {badge.name}
      </span>
    </div>
  );
}
