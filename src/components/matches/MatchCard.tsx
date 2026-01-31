import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MapPin, Eye, Target, Trash2, Calendar, User, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Match, getMatchResult } from '@/types/matches';
import { cn } from '@/lib/utils';

interface MatchCardProps {
  match: Match;
  onView: () => void;
  onLoadResults?: () => void;
  onDelete?: () => void;
  canLoadResults?: boolean;
  canDelete?: boolean;
  variant?: 'compact' | 'full';
}

const matchTypeLabels: Record<string, string> = {
  liga: 'Liga',
  torneo: 'Torneo',
  amistoso: 'Amistoso',
};

const statusConfig: Record<string, { label: string; className: string }> = {
  programado: { 
    label: 'Programado', 
    className: 'bg-primary/10 text-primary border-primary/20' 
  },
  terminado: { 
    label: 'Terminado', 
    className: 'bg-success/10 text-success border-success/20' 
  },
  cancelado: { 
    label: 'Cancelado', 
    className: 'bg-destructive/10 text-destructive border-destructive/20' 
  },
};

const resultConfig: Record<string, { label: string; icon: string; className: string }> = {
  victoria: { label: 'Victoria', icon: '🟢', className: 'text-success' },
  empate: { label: 'Empate', icon: '🟡', className: 'text-warning' },
  derrota: { label: 'Derrota', icon: '🔴', className: 'text-destructive' },
};

export function MatchCard({ 
  match, 
  onView, 
  onLoadResults, 
  onDelete,
  canLoadResults, 
  canDelete,
  variant = 'compact' 
}: MatchCardProps) {
  const result = getMatchResult(match.goals_for, match.goals_against);
  const isFinished = match.status === 'terminado';
  const isScheduled = match.status === 'programado';
  const statusInfo = statusConfig[match.status] || statusConfig.programado;
  const resultInfo = resultConfig[result];

  // Extract field name from notes
  const getFieldName = (notes: string | null) => {
    if (!notes) return null;
    const fieldMatch = notes.match(/^Campo: (.+?)(\n|$)/);
    return fieldMatch ? fieldMatch[1] : null;
  };
  
  const fieldName = getFieldName(match.notes);

  // Compact variant (original design for trainer dashboard)
  if (variant === 'compact') {
    return (
      <Card className="p-3 active:scale-[0.99] transition-transform">
        <div className="flex items-center gap-3">
          {/* Date Column */}
          <div className="flex flex-col items-center justify-center w-14 shrink-0">
            <span className="text-xs text-muted-foreground uppercase">
              {format(new Date(match.match_date), 'MMM', { locale: es })}
            </span>
            <span className="text-2xl font-display font-bold">
              {format(new Date(match.match_date), 'd')}
            </span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(match.match_date), 'HH:mm')}
            </span>
          </div>

          {/* Match Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm truncate">vs {match.rival_name}</span>
              <Badge 
                variant="secondary" 
                className="text-[10px] px-1.5 shrink-0"
              >
                {matchTypeLabels[match.match_type] || match.match_type}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="truncate">{match.category?.name}</span>
              {fieldName && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {fieldName}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Score/Status + Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {isFinished ? (
              <div className="flex items-center gap-2">
                <div className={cn(
                  "text-center px-3 py-1.5 rounded-lg font-display font-bold",
                  result === 'victoria' && "bg-success/10 text-success",
                  result === 'empate' && "bg-warning/10 text-warning",
                  result === 'derrota' && "bg-destructive/10 text-destructive"
                )}>
                  <span className="text-xl">{match.goals_for}</span>
                  <span className="mx-1 text-muted-foreground">-</span>
                  <span className="text-xl">{match.goals_against}</span>
                </div>
                <ShieldCheck className="w-4 h-4 text-success hidden sm:block" />
              </div>
            ) : isScheduled ? (
              <div className="flex items-center gap-1.5">
                <Badge 
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/20"
                >
                  Programado
                </Badge>
                {canLoadResults && onLoadResults && (
                  <Button
                    variant="default"
                    size="sm"
                    className="h-8 gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLoadResults();
                    }}
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Resultado</span>
                  </Button>
                )}
              </div>
            ) : (
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                Cancelado
              </Badge>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
            >
              <Eye className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Full variant (for history grid - more details, delete action)
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      {/* Header: Date, Type, Status */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 bg-muted/30 border-b border-border">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">
            {format(new Date(match.match_date), 'dd MMM yyyy', { locale: es })}
          </span>
          <span className="text-muted-foreground">
            {format(new Date(match.match_date), 'HH:mm', { locale: es })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {matchTypeLabels[match.match_type] || match.match_type}
          </Badge>
          <Badge variant="outline" className={cn("text-xs", statusInfo.className)}>
            {statusInfo.label}
          </Badge>
          {isFinished && (
            <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20 gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span className="hidden sm:inline">Registro oficial</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-3">
        {/* Rival */}
        <div>
          <span className="text-sm text-muted-foreground">vs</span>
          <h3 className="font-semibold text-lg">{match.rival_name}</h3>
        </div>

        {/* Category, Sport, Trainer */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {match.category?.name || 'Sin categoría'}
          </span>
          {match.category?.sports?.name && (
            <>
              <span>•</span>
              <span>{match.category.sports.name}</span>
            </>
          )}
          {match.trainer?.full_name && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {match.trainer.full_name}
              </span>
            </>
          )}
        </div>

        {/* Venue */}
        {(match.venue?.name || fieldName) && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            <span>{match.venue?.name || fieldName}</span>
          </div>
        )}

        {/* Score (only if finished) */}
        {isFinished && (
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Resultado:</span>
              <span className="font-display font-bold text-xl tracking-wide">
                {match.goals_for} – {match.goals_against}
              </span>
            </div>
            <div className={cn("flex items-center gap-1.5 font-medium", resultInfo.className)}>
              <span>{resultInfo.icon}</span>
              <span>{resultInfo.label}</span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/20 border-t border-border">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 gap-2"
          onClick={onView}
        >
          <Eye className="w-4 h-4" />
          Ver detalles
        </Button>
        {canDelete && onDelete && (
          <Button 
            variant="outline" 
            size="sm"
            className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </Card>
  );
}
