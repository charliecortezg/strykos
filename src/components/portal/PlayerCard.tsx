import { User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RadarAttributes, StrykBadge, BadgeRarity } from '@/types/stryk-way';
import { RadarChart } from './RadarChart';
import { Trophy, Medal, Star, Flame, Target, Award, Crown, Zap, Heart, Shield } from 'lucide-react';

interface PlayerCardProps {
  playerName: string;
  categoryName: string | null;
  ovr: number;
  radar: RadarAttributes;
  topBadges?: StrykBadge[];
  compact?: boolean;
  jerseyNumber?: number | null;
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

const OVR_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  legendary: { bg: 'from-amber-400 to-orange-500', text: 'text-white', label: 'Legendario' },
  epic: { bg: 'from-purple-500 to-pink-500', text: 'text-white', label: 'Épico' },
  rare: { bg: 'from-blue-500 to-cyan-400', text: 'text-white', label: 'Destacado' },
  common: { bg: 'from-slate-400 to-slate-500', text: 'text-white', label: 'En desarrollo' },
};

function getOvrTier(ovr: number): keyof typeof OVR_COLORS {
  if (ovr >= 85) return 'legendary';
  if (ovr >= 70) return 'epic';
  if (ovr >= 55) return 'rare';
  return 'common';
}

export function PlayerCard({ 
  playerName, 
  categoryName, 
  ovr, 
  radar, 
  topBadges = [],
  compact = false,
}: PlayerCardProps) {
  const tier = getOvrTier(ovr);
  const tierStyle = OVR_COLORS[tier];

  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl border shadow-lg',
      'bg-gradient-to-br from-card via-card to-muted/20'
    )}>
      {/* Header with OVR */}
      <div className={cn(
        'relative p-4 bg-gradient-to-r',
        tierStyle.bg
      )}>
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-white rounded-full translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="relative flex items-center gap-4">
          {/* Avatar placeholder */}
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
            <User className="w-8 h-8 text-white/80" />
          </div>

          <div className="flex-1">
            <h2 className={cn('font-bold text-lg', tierStyle.text)}>
              {playerName}
            </h2>
            {categoryName && (
              <p className={cn('text-sm opacity-80', tierStyle.text)}>
                {categoryName}
              </p>
            )}
          </div>

          {/* OVR Badge */}
          <div className="flex flex-col items-center">
            <span className={cn('text-4xl font-black', tierStyle.text)}>
              {ovr}
            </span>
            <span className={cn('text-xs font-medium uppercase tracking-wider opacity-80', tierStyle.text)}>
              OVR
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className={cn('p-4', compact ? 'space-y-3' : 'space-y-4')}>
        {/* Radar Chart */}
        <div className="flex justify-center">
          <RadarChart data={radar} size={compact ? 160 : 200} />
        </div>

        {/* Top Badges */}
        {topBadges.length > 0 && (
          <div className="flex justify-center gap-2">
            {topBadges.slice(0, 3).map(badge => {
              const Icon = ICON_MAP[badge.icon || 'trophy'] || Trophy;
              return (
                <div 
                  key={badge.id}
                  className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"
                  title={badge.name}
                >
                  <Icon className="w-4 h-4 text-primary" />
                </div>
              );
            })}
          </div>
        )}

        {/* Tier label */}
        <div className="text-center">
          <span className={cn(
            'inline-block px-3 py-1 rounded-full text-xs font-medium',
            tier === 'legendary' && 'bg-amber-100 text-amber-700',
            tier === 'epic' && 'bg-purple-100 text-purple-700',
            tier === 'rare' && 'bg-blue-100 text-blue-700',
            tier === 'common' && 'bg-slate-100 text-slate-700',
          )}>
            {tierStyle.label}
          </span>
        </div>
      </div>
    </div>
  );
}
