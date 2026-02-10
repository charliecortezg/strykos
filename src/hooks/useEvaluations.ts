import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { StatKey, Evaluation, EvaluationScore, EvaluationComment, EvaluationAchievement } from '@/types/evaluations';
import { calculateAgeGroup, calculateOverall, getPreviousPeriod, detectAchievements } from '@/lib/evaluation-utils';

export function useEvaluations(categoryId: string | null, period: string) {
  const { organization } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const orgId = organization?.id;

  // Fetch evaluations for category + period
  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: ['evaluations', orgId, categoryId, period],
    queryFn: async () => {
      if (!orgId || !categoryId) return [];
      const { data, error } = await supabase
        .from('evaluations')
        .select('*')
        .eq('organization_id', orgId)
        .eq('category_id', categoryId)
        .eq('period', period);
      if (error) throw error;
      return data as Evaluation[];
    },
    enabled: !!orgId && !!categoryId,
  });

  // Fetch scores for all evaluations in this batch
  const evaluationIds = evaluations.map(e => e.id);
  const { data: allScores = [] } = useQuery({
    queryKey: ['evaluation_scores', evaluationIds],
    queryFn: async () => {
      if (evaluationIds.length === 0) return [];
      const { data, error } = await supabase
        .from('evaluation_scores')
        .select('*')
        .in('evaluation_id', evaluationIds);
      if (error) throw error;
      return data as EvaluationScore[];
    },
    enabled: evaluationIds.length > 0,
  });

  // Fetch achievements
  const { data: allAchievements = [] } = useQuery({
    queryKey: ['evaluation_achievements', evaluationIds],
    queryFn: async () => {
      if (evaluationIds.length === 0) return [];
      const { data, error } = await supabase
        .from('evaluation_achievements')
        .select('*')
        .in('evaluation_id', evaluationIds);
      if (error) throw error;
      return data as EvaluationAchievement[];
    },
    enabled: evaluationIds.length > 0,
  });

  // Fetch comments
  const { data: allComments = [] } = useQuery({
    queryKey: ['evaluation_comments', evaluationIds],
    queryFn: async () => {
      if (evaluationIds.length === 0) return [];
      const { data, error } = await supabase
        .from('evaluation_comments')
        .select('*')
        .in('evaluation_id', evaluationIds);
      if (error) throw error;
      return data as EvaluationComment[];
    },
    enabled: evaluationIds.length > 0,
  });

  // Upsert evaluation + scores for a single player
  const saveEvaluation = useMutation({
    mutationFn: async ({
      playerId,
      scores,
      dateOfBirth,
    }: {
      playerId: string;
      scores: Record<StatKey, number>;
      dateOfBirth: string | null;
    }) => {
      if (!orgId || !categoryId) throw new Error('Missing org/category');

      const ageGroup = calculateAgeGroup(dateOfBirth);

      // Upsert evaluation
      const { data: evalData, error: evalError } = await supabase
        .from('evaluations')
        .upsert(
          {
            organization_id: orgId,
            category_id: categoryId,
            player_id: playerId,
            period,
            age_group: ageGroup,
            status: 'open',
            recorded_by: (await supabase.auth.getUser()).data.user?.id,
          },
          { onConflict: 'organization_id,player_id,period' }
        )
        .select('id')
        .single();

      if (evalError) throw evalError;

      // Upsert 6 scores
      const scoreRows = Object.entries(scores).map(([stat_key, score]) => ({
        evaluation_id: evalData.id,
        stat_key,
        score: Math.round(Math.min(20, Math.max(0, score))),
      }));

      const { error: scoresError } = await supabase
        .from('evaluation_scores')
        .upsert(scoreRows, { onConflict: 'evaluation_id,stat_key' });

      if (scoresError) throw scoresError;

      return evalData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      queryClient.invalidateQueries({ queryKey: ['evaluation_scores'] });
    },
    onError: (error) => {
      toast({ title: 'Error al guardar evaluación', description: error.message, variant: 'destructive' });
    },
  });

  // Close evaluations for the entire category (director action)
  const closeEvaluations = useMutation({
    mutationFn: async (weightsForAgeGroups: Record<string, { mentalidad: number; tecnica: number; juego: number }>) => {
      if (!orgId || !categoryId) throw new Error('Missing org/category');

      const userId = (await supabase.auth.getUser()).data.user?.id;
      const prevPeriod = getPreviousPeriod(period);

      // Get previous period evaluations for delta calculation
      const { data: prevEvals } = await supabase
        .from('evaluations')
        .select('id, player_id, overall_score')
        .eq('organization_id', orgId)
        .eq('category_id', categoryId)
        .eq('period', prevPeriod);

      const prevOverallMap = new Map<string, number>();
      prevEvals?.forEach(e => {
        if (e.overall_score != null) prevOverallMap.set(e.player_id, Number(e.overall_score));
      });

      // Get previous scores for achievement detection
      const prevEvalIds = prevEvals?.map(e => e.id) || [];
      let prevScoresMap = new Map<string, Record<StatKey, number>>();
      if (prevEvalIds.length > 0) {
        const { data: prevScoresData } = await supabase
          .from('evaluation_scores')
          .select('*')
          .in('evaluation_id', prevEvalIds);

        if (prevScoresData) {
          const evalPlayerMap = new Map(prevEvals?.map(e => [e.id, e.player_id]) || []);
          prevScoresData.forEach(s => {
            const pid = evalPlayerMap.get(s.evaluation_id);
            if (!pid) return;
            if (!prevScoresMap.has(pid)) prevScoresMap.set(pid, {} as Record<StatKey, number>);
            prevScoresMap.get(pid)![s.stat_key as StatKey] = s.score;
          });
        }
      }

      // Process each open evaluation
      for (const evaluation of evaluations.filter(e => e.status === 'open')) {
        const evalScores = allScores.filter(s => s.evaluation_id === evaluation.id);
        if (evalScores.length < 6) continue; // skip incomplete

        const scoresMap = {} as Record<StatKey, number>;
        evalScores.forEach(s => { scoresMap[s.stat_key as StatKey] = s.score; });

        const weights = weightsForAgeGroups[evaluation.age_group];
        const overall = calculateOverall(scoresMap, evaluation.age_group, weights ? { weights } as any : null);
        const prevOverall = prevOverallMap.get(evaluation.player_id) ?? null;

        // Update evaluation with overall + close
        await supabase
          .from('evaluations')
          .update({
            status: 'closed',
            overall_score: overall,
            previous_overall: prevOverall,
            closed_by: userId,
            closed_at: new Date().toISOString(),
          })
          .eq('id', evaluation.id);

        // Detect achievements
        const prevScores = prevScoresMap.get(evaluation.player_id) || null;
        const achievements = detectAchievements(scoresMap, prevScores);

        for (const ach of achievements) {
          await supabase.from('evaluation_achievements').insert({
            evaluation_id: evaluation.id,
            achievement_key: ach.key,
            xp_bonus: ach.xp_bonus,
          });
        }

        // Insert stryk_event for XP
        const totalXp = overall + achievements.reduce((sum, a) => sum + a.xp_bonus, 0);
        await supabase.from('stryk_events').insert({
          organization_id: orgId,
          player_id: evaluation.player_id,
          source_type: 'evaluation',
          source_id: evaluation.id,
          xp_delta: totalXp,
          created_by: userId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      queryClient.invalidateQueries({ queryKey: ['evaluation_scores'] });
      queryClient.invalidateQueries({ queryKey: ['evaluation_achievements'] });
      toast({ title: 'Evaluaciones cerradas', description: 'Se calcularon overalls, achievements y XP.' });
    },
    onError: (error) => {
      toast({ title: 'Error al cerrar evaluaciones', description: error.message, variant: 'destructive' });
    },
  });

  // Add comment
  const addComment = useMutation({
    mutationFn: async ({ evaluationId, comment }: { evaluationId: string; comment: string }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { error } = await supabase.from('evaluation_comments').insert({
        evaluation_id: evaluationId,
        comment,
        created_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation_comments'] });
    },
  });

  return {
    evaluations,
    allScores,
    allAchievements,
    allComments,
    isLoading,
    saveEvaluation,
    closeEvaluations,
    addComment,
  };
}
