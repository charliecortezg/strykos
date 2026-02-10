import { useState } from 'react';
import { WLARadarChart } from './WLARadarChart';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { WLA_STATS, type StatKey, type EvaluationAchievement, type EvaluationComment } from '@/types/evaluations';
import { formatPeriod } from '@/lib/evaluation-utils';
import { Trophy, MessageSquarePlus, TrendingUp, TrendingDown, Minus, Star, Zap } from 'lucide-react';

interface PlayerEvaluationReportProps {
  playerName: string;
  ageGroup: string;
  scores: Record<StatKey, number>;
  previousScores: Record<StatKey, number> | null;
  overall: number | null;
  previousOverall: number | null;
  achievements: EvaluationAchievement[];
  comments: EvaluationComment[];
  evaluationId: string | null;
  onAddComment: (comment: string) => Promise<void>;
  period: string;
}

const ACHIEVEMENT_META: Record<string, { label: string; icon: typeof Star; color: string }> = {
  superacion: { label: 'Superación', icon: TrendingUp, color: 'text-success' },
  genio_creativo: { label: 'Genio Creativo', icon: Zap, color: 'text-amber-500' },
};

export function PlayerEvaluationReport({
  playerName, ageGroup, scores, previousScores, overall, previousOverall,
  achievements, comments, evaluationId, onAddComment, period,
}: PlayerEvaluationReportProps) {
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);

  const delta = overall != null && previousOverall != null ? overall - previousOverall : null;

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    setSending(true);
    await onAddComment(newComment.trim());
    setNewComment('');
    setSending(false);
  };

  return (
    <div className="space-y-6 py-4">
      {/* Header */}
      <div className="text-center space-y-1">
        <h3 className="text-xl font-display font-bold">{playerName}</h3>
        <div className="flex items-center justify-center gap-2">
          <Badge variant="outline">{ageGroup}</Badge>
          <span className="text-sm text-muted-foreground">{formatPeriod(period)}</span>
        </div>
        {overall != null && (
          <div className="mt-3">
            <div className="text-4xl font-display font-bold text-primary">{overall}</div>
            <p className="text-xs text-muted-foreground">Overall WLA</p>
            {delta != null && (
              <span className={`inline-flex items-center gap-0.5 text-sm font-medium mt-1 ${
                delta > 0 ? 'text-success' : delta < 0 ? 'text-destructive' : 'text-muted-foreground'
              }`}>
                {delta > 0 ? <TrendingUp className="w-4 h-4" /> : delta < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                {delta > 0 ? '+' : ''}{delta} vs mes anterior
              </span>
            )}
          </div>
        )}
      </div>

      {/* Radar */}
      <div className="flex justify-center">
        <WLARadarChart scores={scores} previousScores={previousScores} size={240} />
      </div>

      {/* Stats table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground text-xs">
              <th className="p-2 text-left">Stat</th>
              <th className="p-2 text-center">Actual</th>
              <th className="p-2 text-center">Anterior</th>
              <th className="p-2 text-center">Delta</th>
            </tr>
          </thead>
          <tbody>
            {WLA_STATS.map(stat => {
              const current = scores[stat.key] ?? 0;
              const prev = previousScores?.[stat.key];
              const d = prev != null ? current - prev : null;
              return (
                <tr key={stat.key} className="border-t">
                  <td className="p-2 text-xs font-medium">{stat.label}</td>
                  <td className="p-2 text-center font-bold tabular-nums">{current}</td>
                  <td className="p-2 text-center text-muted-foreground tabular-nums">{prev != null ? prev : '—'}</td>
                  <td className="p-2 text-center">
                    {d != null ? (
                      <span className={`text-xs font-medium ${d > 0 ? 'text-success' : d < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {d > 0 ? '+' : ''}{d}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Achievements */}
      {achievements.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-500" /> Logros
          </h4>
          <div className="flex flex-wrap gap-2">
            {achievements.map(a => {
              const meta = ACHIEVEMENT_META[a.achievement_key];
              const Icon = meta?.icon || Star;
              return (
                <Badge key={a.id} variant="outline" className="gap-1 text-xs">
                  <Icon className={`w-3 h-3 ${meta?.color || ''}`} />
                  {meta?.label || a.achievement_key}
                  <span className="text-muted-foreground">+{a.xp_bonus} XP</span>
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <MessageSquarePlus className="w-4 h-4" /> Comentarios
        </h4>
        {comments.length > 0 && (
          <div className="space-y-2">
            {comments.map(c => (
              <div key={c.id} className="bg-muted/30 rounded-lg p-3 text-sm">
                <p>{c.comment}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(c.created_at).toLocaleDateString('es-MX')}
                </p>
              </div>
            ))}
          </div>
        )}
        {evaluationId && (
          <div className="flex gap-2">
            <Textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Agregar comentario..."
              rows={2}
              className="text-sm"
            />
            <Button size="sm" onClick={handleSubmitComment} disabled={!newComment.trim() || sending}>
              Enviar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
