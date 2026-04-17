import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type {
  TrainingModule,
  TrainingComponent,
  TrainingExamQuestion,
  TrainerModuleProgress,
  TrainerComponentProgress,
  TrainerExamAttempt,
  TrainerCertification,
  CertificationLevel,
  ModuleType,
} from '@/types/training';

// ====== CATÁLOGO ======

export function useTrainingModules(
  level?: CertificationLevel | 'categoria',
  moduleType?: ModuleType
) {
  return useQuery({
    queryKey: ['training-modules', level ?? 'all', moduleType ?? 'all'],
    queryFn: async () => {
      let q = supabase
        .from('training_modules')
        .select('*')
        .eq('is_active', true)
        .order('certification_level')
        .order('module_order');
      if (level) q = q.eq('certification_level', level);
      if (moduleType) q = q.eq('module_type', moduleType);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as TrainingModule[];
    },
  });
}

export function useTrainingComponents(moduleId: string | undefined) {
  return useQuery({
    queryKey: ['training-components', moduleId],
    queryFn: async () => {
      if (!moduleId) return [];
      const { data, error } = await supabase
        .from('training_components')
        .select('*')
        .eq('module_id', moduleId)
        .eq('is_active', true)
        .order('component_order');
      if (error) throw error;
      return (data || []) as TrainingComponent[];
    },
    enabled: !!moduleId,
  });
}

export function useExamQuestions(componentId: string | undefined) {
  return useQuery({
    queryKey: ['training-exam-questions', componentId],
    queryFn: async () => {
      if (!componentId) return [];
      const { data, error } = await supabase
        .from('training_exam_questions')
        .select('*')
        .eq('component_id', componentId)
        .order('question_order');
      if (error) throw error;
      return (data || []) as unknown as TrainingExamQuestion[];
    },
    enabled: !!componentId,
  });
}

// ====== PROGRESO ======

export function useTrainerProgress(trainerId?: string) {
  const { user } = useAuth();
  const tid = trainerId ?? user?.id;
  return useQuery({
    queryKey: ['trainer-progress', tid],
    queryFn: async () => {
      if (!tid) return { modules: [], components: [] };
      const [{ data: modules, error: e1 }, { data: components, error: e2 }] = await Promise.all([
        supabase.from('trainer_module_progress').select('*').eq('trainer_id', tid),
        supabase.from('trainer_component_progress').select('*').eq('trainer_id', tid),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      return {
        modules: (modules || []) as TrainerModuleProgress[],
        components: (components || []) as TrainerComponentProgress[],
      };
    },
    enabled: !!tid,
  });
}

export function useCompleteComponent() {
  const qc = useQueryClient();
  const { user, organization } = useAuth();
  return useMutation({
    mutationFn: async ({ componentId, moduleId }: { componentId: string; moduleId: string }) => {
      if (!user || !organization) throw new Error('No auth context');

      // Upsert component progress
      const { error: ce } = await supabase
        .from('trainer_component_progress')
        .upsert(
          {
            organization_id: organization.id,
            trainer_id: user.id,
            component_id: componentId,
            completed: true,
            completed_at: new Date().toISOString(),
          },
          { onConflict: 'organization_id,trainer_id,component_id' }
        );
      if (ce) throw ce;

      // Ensure module progress exists / mark in_progress
      const { data: existing } = await supabase
        .from('trainer_module_progress')
        .select('*')
        .eq('trainer_id', user.id)
        .eq('module_id', moduleId)
        .maybeSingle();

      if (!existing) {
        const { error } = await supabase.from('trainer_module_progress').insert({
          organization_id: organization.id,
          trainer_id: user.id,
          module_id: moduleId,
          status: 'in_progress',
          started_at: new Date().toISOString(),
        });
        if (error) throw error;
      }

      // Auto-complete module if all components done
      const { data: comps } = await supabase
        .from('training_components')
        .select('id')
        .eq('module_id', moduleId)
        .eq('is_active', true);
      const { data: done } = await supabase
        .from('trainer_component_progress')
        .select('component_id')
        .eq('trainer_id', user.id)
        .eq('completed', true)
        .in('component_id', (comps || []).map((c) => c.id));

      if (comps && done && done.length >= comps.length && comps.length > 0) {
        await supabase
          .from('trainer_module_progress')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('trainer_id', user.id)
          .eq('module_id', moduleId);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainer-progress'] });
    },
  });
}

export function useSubmitExam() {
  const qc = useQueryClient();
  const { user, organization } = useAuth();
  return useMutation({
    mutationFn: async ({
      componentId,
      moduleId,
      answers,
    }: {
      componentId: string;
      moduleId: string;
      answers: Record<string, string>;
    }) => {
      if (!user || !organization) throw new Error('No auth context');

      const { data: questions, error: qe } = await supabase
        .from('training_exam_questions')
        .select('id, correct_option')
        .eq('component_id', componentId);
      if (qe) throw qe;

      const total = questions?.length ?? 0;
      let score = 0;
      (questions || []).forEach((q) => {
        if (answers[q.id] === q.correct_option) score += 1;
      });
      const percentage = total > 0 ? (score / total) * 100 : 0;

      const { data: comp } = await supabase
        .from('training_components')
        .select('passing_score')
        .eq('id', componentId)
        .maybeSingle();
      const passingScore = comp?.passing_score ?? 70;
      const passed = percentage >= passingScore;

      const { count } = await supabase
        .from('trainer_exam_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('trainer_id', user.id)
        .eq('component_id', componentId);
      const attemptNumber = (count ?? 0) + 1;

      const { data: attempt, error: ae } = await supabase
        .from('trainer_exam_attempts')
        .insert({
          organization_id: organization.id,
          trainer_id: user.id,
          component_id: componentId,
          attempt_number: attemptNumber,
          score,
          total_questions: total,
          percentage,
          passed,
          answers,
        })
        .select()
        .single();
      if (ae) throw ae;

      if (passed) {
        await supabase.from('trainer_component_progress').upsert(
          {
            organization_id: organization.id,
            trainer_id: user.id,
            component_id: componentId,
            completed: true,
            completed_at: new Date().toISOString(),
          },
          { onConflict: 'organization_id,trainer_id,component_id' }
        );
      }

      return { attempt: attempt as TrainerExamAttempt, passed, percentage, score, total, moduleId };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainer-progress'] });
      qc.invalidateQueries({ queryKey: ['trainer-exam-attempts'] });
    },
  });
}

// ====== CERTIFICACIONES ======

export function useTrainerCertifications(trainerId?: string) {
  const { user } = useAuth();
  const tid = trainerId ?? user?.id;
  return useQuery({
    queryKey: ['trainer-certifications', tid],
    queryFn: async () => {
      if (!tid) return [];
      const { data, error } = await supabase
        .from('trainer_certifications')
        .select('*')
        .eq('trainer_id', tid)
        .order('issued_at', { ascending: false });
      if (error) throw error;
      return (data || []) as TrainerCertification[];
    },
    enabled: !!tid,
  });
}

export function useIssueCertification() {
  const qc = useQueryClient();
  const { user, organization } = useAuth();
  return useMutation({
    mutationFn: async ({
      trainerId,
      level,
      notes,
    }: {
      trainerId: string;
      level: CertificationLevel;
      notes?: string;
    }) => {
      if (!user || !organization) throw new Error('No auth context');
      const { data, error } = await supabase
        .from('trainer_certifications')
        .insert({
          organization_id: organization.id,
          trainer_id: trainerId,
          certification_level: level,
          issued_by: user.id,
          notes: notes ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as TrainerCertification;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['trainer-certifications', vars.trainerId] });
      qc.invalidateQueries({ queryKey: ['all-trainers-progress'] });
    },
  });
}

// ====== VISTA DIRECTOR DEPORTIVO ======

export function useAllTrainersProgress() {
  const { organization } = useAuth();
  return useQuery({
    queryKey: ['all-trainers-progress', organization?.id],
    queryFn: async () => {
      if (!organization) return [];
      const { data: roles, error: re } = await supabase
        .from('user_org_roles')
        .select('user_id')
        .eq('organization_id', organization.id)
        .eq('role', 'entrenador');
      if (re) throw re;
      const trainerIds = (roles || []).map((r) => r.user_id);
      if (trainerIds.length === 0) return [];

      const [{ data: profiles }, { data: modProgress }, { data: certs }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email').in('id', trainerIds),
        supabase
          .from('trainer_module_progress')
          .select('*')
          .eq('organization_id', organization.id)
          .in('trainer_id', trainerIds),
        supabase
          .from('trainer_certifications')
          .select('*')
          .eq('organization_id', organization.id)
          .in('trainer_id', trainerIds),
      ]);

      return (profiles || []).map((p) => ({
        trainer: p,
        modules: (modProgress || []).filter((m) => m.trainer_id === p.id) as TrainerModuleProgress[],
        certifications: (certs || []).filter((c) => c.trainer_id === p.id) as TrainerCertification[],
      }));
    },
    enabled: !!organization,
  });
}
