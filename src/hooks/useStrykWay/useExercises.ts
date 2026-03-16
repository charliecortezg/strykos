import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Exercise {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  coach_tip: string | null;
  category: string;
  skill_tags: string[];
  age_min: number;
  age_max: number;
  duration_minutes: number | null;
  difficulty: string;
  equipment_needed: string | null;
  partner_required: boolean;
  video_source: string;
  video_url: string;
  thumbnail_url: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface ExerciseFormData {
  title: string;
  category: string;
  description: string;
  coach_tip: string;
  age_min: number;
  age_max: number;
  duration_minutes: number | null;
  equipment_needed: string;
  partner_required: boolean;
  difficulty: string;
  video_source: string;
  video_url: string;
  is_active: boolean;
}

export function useExercises() {
  const { organization, user } = useAuth();
  const queryClient = useQueryClient();
  const orgId = organization?.id;

  const { data: exercises, isLoading } = useQuery({
    queryKey: ['exercises', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('exercise_library')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as Exercise[];
    },
    enabled: !!orgId,
  });

  const createExercise = useMutation({
    mutationFn: async (formData: ExerciseFormData) => {
      if (!orgId || !user?.id) throw new Error('Missing required data');
      const thumbnailUrl = formData.video_source === 'youtube'
        ? getYouTubeThumbnail(formData.video_url)
        : null;

      const { error } = await supabase.from('exercise_library').insert({
        organization_id: orgId,
        title: formData.title,
        description: formData.description || null,
        coach_tip: formData.coach_tip || null,
        category: formData.category,
        age_min: formData.age_min,
        age_max: formData.age_max,
        duration_minutes: formData.duration_minutes,
        difficulty: formData.difficulty,
        equipment_needed: formData.equipment_needed || null,
        partner_required: formData.partner_required,
        video_source: formData.video_source,
        video_url: formData.video_url,
        thumbnail_url: thumbnailUrl,
        is_active: formData.is_active,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises', orgId] });
      toast.success('Ejercicio creado correctamente');
    },
    onError: (error) => toast.error('Error: ' + error.message),
  });

  const updateExercise = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: ExerciseFormData }) => {
      if (!orgId) throw new Error('Missing org');
      const thumbnailUrl = formData.video_source === 'youtube'
        ? getYouTubeThumbnail(formData.video_url)
        : null;

      const { error } = await supabase
        .from('exercise_library')
        .update({
          title: formData.title,
          description: formData.description || null,
          coach_tip: formData.coach_tip || null,
          category: formData.category,
          age_min: formData.age_min,
          age_max: formData.age_max,
          duration_minutes: formData.duration_minutes,
          difficulty: formData.difficulty,
          equipment_needed: formData.equipment_needed || null,
          partner_required: formData.partner_required,
          video_source: formData.video_source,
          video_url: formData.video_url,
          thumbnail_url: thumbnailUrl,
          is_active: formData.is_active,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises', orgId] });
      toast.success('Ejercicio actualizado');
    },
    onError: (error) => toast.error('Error: ' + error.message),
  });

  const deleteExercise = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exercise_library').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises', orgId] });
      toast.success('Ejercicio eliminado');
    },
    onError: (error) => toast.error('Error: ' + error.message),
  });

  return {
    exercises: exercises ?? [],
    isLoading,
    createExercise: createExercise.mutate,
    updateExercise: updateExercise.mutate,
    deleteExercise: deleteExercise.mutate,
    isCreating: createExercise.isPending,
    isUpdating: updateExercise.isPending,
    isDeleting: deleteExercise.isPending,
  };
}

export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function getYouTubeThumbnail(url: string): string | null {
  const id = extractYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

export const EXERCISE_CATEGORIES = [
  { value: 'control', label: 'Control', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'pase', label: 'Pase', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'conduccion', label: 'Conducción', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'decision', label: 'Decisión', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: 'coordinacion', label: 'Coordinación', color: 'bg-teal-100 text-teal-700 border-teal-300' },
  { value: 'fisico', label: 'Físico', color: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'actitud', label: 'Actitud', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
] as const;

export const DIFFICULTY_OPTIONS = [
  { value: 'beginner', label: 'Principiante', emoji: '🟢' },
  { value: 'intermediate', label: 'Intermedio', emoji: '🟡' },
  { value: 'advanced', label: 'Avanzado', emoji: '🔴' },
] as const;

export function getCategoryConfig(category: string) {
  return EXERCISE_CATEGORIES.find(c => c.value === category) || EXERCISE_CATEGORIES[0];
}
