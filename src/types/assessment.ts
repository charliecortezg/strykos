// Assessment Lab Types

export type EventStatus = 'draft' | 'active' | 'closed';
export type EventPlayerStatus = 'pending' | 'completed';
export type DeliveryStatus = 'pending' | 'sent' | 'failed';
export type AgeGroup = '6-7' | '8-9' | '10-11';

export const AGE_GROUPS: { value: AgeGroup; label: string }[] = [
  { value: '6-7', label: '6-7 años' },
  { value: '8-9', label: '8-9 años' },
  { value: '10-11', label: '10-11 años' },
];

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  draft: 'Borrador',
  active: 'Activo',
  closed: 'Cerrado',
};

export interface EvaluationEvent {
  id: string;
  organization_id: string;
  title: string;
  event_date: string | null;
  status: EventStatus;
  created_by: string | null;
  closed_by: string | null;
  closed_at: string | null;
  created_at: string;
}

export interface EvaluationEventPlayer {
  id: string;
  event_id: string;
  player_id: string;
  organization_id: string;
  status: EventPlayerStatus;
  evaluated_by: string | null;
  evaluated_at: string | null;
  created_at: string;
  // Joined
  player?: {
    id: string;
    full_name: string;
    parent_email: string | null;
    parent_phone: string | null;
    date_of_birth: string | null;
  } | null;
}

export interface EvaluationDelivery {
  id: string;
  evaluation_id: string;
  organization_id: string;
  delivery_status: DeliveryStatus;
  recipient_email: string | null;
  last_attempt_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface CreateExternalPlayerData {
  full_name: string;
  age_group: AgeGroup;
  parent_email: string;
  parent_phone?: string;
}
