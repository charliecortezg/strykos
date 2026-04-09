import type { Json } from '@/integrations/supabase/types';

export interface SessionPlan {
  id: string;
  organization_id: string;
  trainer_id: string;
  category_id: string;
  session_date: string;

  macrocycle_month: string;
  macrocycle_period: string;
  period_color: string | null;

  fundamento_mes: string;
  fundamento_nivel: 'intro' | 'desar' | 'cons';
  restriccion_rondo: string | null;
  juego_posicional: string | null;
  foco_partido: string | null;
  pregunta_cierre: string | null;

  partido_iniciado_at: string | null;
  partido_finalizado_at: string | null;
  observaciones_partido: Json;
  sincronizado_stryk: boolean;

  autoevaluacion: Json | null;
  notas_entrenador: string | null;

  status: 'borrador' | 'activa' | 'completada';
  created_at: string;
  updated_at: string;
}

export interface SessionPlanWithRelations extends SessionPlan {
  trainer?: { id: string; full_name: string } | null;
  category?: { id: string; name: string } | null;
}

export interface CreateSessionPlanData {
  category_id: string;
  session_date: string;
  macrocycle_month: string;
  macrocycle_period: string;
  period_color?: string;
  fundamento_mes: string;
  fundamento_nivel: 'intro' | 'desar' | 'cons';
  restriccion_rondo?: string;
  juego_posicional?: string;
  foco_partido?: string;
  pregunta_cierre?: string;
  notas_entrenador?: string;
  status?: 'borrador' | 'activa' | 'completada';
}

export interface UpdateSessionPlanData {
  restriccion_rondo?: string;
  juego_posicional?: string;
  foco_partido?: string;
  pregunta_cierre?: string;
  partido_iniciado_at?: string;
  partido_finalizado_at?: string;
  observaciones_partido?: Json;
  sincronizado_stryk?: boolean;
  autoevaluacion?: Json;
  notas_entrenador?: string;
  status?: 'borrador' | 'activa' | 'completada';
}

export interface RestrictionBankItem {
  id: string;
  organization_id: string | null;
  fundamento: string;
  age_group: string;
  restriccion: string;
  descripcion: string | null;
  es_recomendada: boolean;
  created_at: string;
}
