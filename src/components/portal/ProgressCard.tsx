import { Star, Flame, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ProgressCardProps {
  xpTotal: number;
  level: number;
  streak: number;
  xpProgress: number;
  xpNeeded: number;
  xpPercentage: number;
}

export function ProgressCard({
  xpTotal,
  level,
  streak,
  xpProgress,
  xpNeeded,
  xpPercentage,
}: ProgressCardProps) {
  return (
    <Card className="bg-gradient-to-br from-primary/10 via-background to-background border-primary/20">
      <CardContent className="p-4 space-y-4">
        {/* Level and XP */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-lg">
              {level}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Nivel</p>
              <p className="font-semibold">{xpTotal} XP total</p>
            </div>
          </div>
          
          {/* Streak */}
          {streak > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-600">
              <Flame className="w-4 h-4" />
              <span className="font-medium text-sm">{streak} días</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progreso al nivel {level + 1}</span>
            <span className="font-medium">{xpProgress} / {xpNeeded} XP</span>
          </div>
          <Progress value={xpPercentage} className="h-2" />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          <StatItem icon={Star} label="Nivel" value={level} />
          <StatItem icon={TrendingUp} label="XP Total" value={xpTotal} />
          <StatItem icon={Flame} label="Racha" value={`${streak}d`} />
        </div>
      </CardContent>
    </Card>
  );
}

function StatItem({ 
  icon: Icon, 
  label, 
  value 
}: { 
  icon: typeof Star; 
  label: string; 
  value: string | number;
}) {
  return (
    <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
      <Icon className="w-4 h-4 text-muted-foreground mb-1" />
      <span className="font-bold text-sm">{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
