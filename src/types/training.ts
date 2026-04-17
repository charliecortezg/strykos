// STRYK — Training & Certification Types (WL)

export type CertificationLevel = 'WL-C1' | 'WL-C2' | 'WL-C3' | 'WL-C4' | 'WL-C5';

export type TrainingComponentType = 'lectura' | 'video' | 'examen' | 'tarea_campo';

export type ModuleProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface TrainingModule {
  id: string;
  certification_level: CertificationLevel;
  module_order: number;
  title: string;
  description: string | null;
  estimated_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainingComponent {
  id: string;
  module_id: string;
  component_order: number;
  component_type: TrainingComponentType;
  title: string;
  content: string | null;
  video_url: string | null;
  estimated_minutes: number;
  passing_score: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Documento institucional (PDF)
  document_url: string | null;
  document_sections: string | null;
  reading_guide: string | null;
}

export interface ExamQuestionOption {
  key: string;
  text: string;
}

export interface TrainingExamQuestion {
  id: string;
  component_id: string;
  question_order: number;
  question_text: string;
  options: ExamQuestionOption[];
  correct_option: string;
  explanation: string | null;
  created_at: string;
}

export interface TrainerModuleProgress {
  id: string;
  organization_id: string;
  trainer_id: string;
  module_id: string;
  status: ModuleProgressStatus;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainerComponentProgress {
  id: string;
  organization_id: string;
  trainer_id: string;
  component_id: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainerExamAttempt {
  id: string;
  organization_id: string;
  trainer_id: string;
  component_id: string;
  attempt_number: number;
  score: number;
  total_questions: number;
  percentage: number;
  passed: boolean;
  answers: Record<string, string> | null;
  created_at: string;
}

export interface TrainerCertification {
  id: string;
  organization_id: string;
  trainer_id: string;
  certification_level: CertificationLevel;
  issued_at: string;
  issued_by: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  notes: string | null;
  created_at: string;
}

export const CERTIFICATION_LEVEL_LABELS: Record<CertificationLevel, string> = {
  'WL-C1': 'WL-C1 — Entrenador Base',
  'WL-C2': 'WL-C2 — Entrenador Avanzado',
  'WL-C3': 'WL-C3 — Entrenador Senior',
  'WL-C4': 'WL-C4 — Mentor WL',
  'WL-C5': 'WL-C5 — Master WL',
};

export const COMPONENT_TYPE_LABELS: Record<TrainingComponentType, string> = {
  lectura: 'Lectura',
  video: 'Video',
  examen: 'Examen',
  tarea_campo: 'Tarea de campo',
};
