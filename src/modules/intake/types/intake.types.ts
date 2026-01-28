// STRYK Intake Module Types

export interface IntakeRequest {
  id: string;
  organization_id: string;
  idempotency_key: string;
  
  // Player data
  player_name: string;
  player_name_normalized: string;
  player_birth_date: string;
  player_age: number | null;
  
  // Guardian data
  guardian_name: string;
  guardian_email: string | null;
  guardian_phone: string;
  guardian_phone_normalized: string;
  guardian_occupation: string | null;
  
  // Assignment
  sport_id: string | null;
  category_id: string | null;
  venue_id: string | null;
  plan_id: string | null;
  
  // Payment
  registration_fee: number;
  monthly_fee: number;
  total_amount: number;
  payment_method: string;
  promo_applied: boolean;
  promo_code: string | null;
  
  // References (filled by processor)
  player_id: string | null;
  guardian_id: string | null;
  payment_id: string | null;
  
  // Status
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  processing_error: string | null;
  receipt_status: 'pending' | 'sent' | 'failed' | 'no_email';
  receipt_sent_at: string | null;
  receipt_error: string | null;
  
  // Tracking
  created_by: string;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgIntakeSettings {
  id: string;
  organization_id: string;
  enabled: boolean;
  require_evidence: boolean;
  require_guardian_email: boolean;
  allow_promo_codes: boolean;
  default_registration_fee: number;
  default_monthly_fee: number;
  promo_fee: number;
  promo_active: boolean;
  welcome_message: string | null;
  receipt_footer_text: string | null;
  whatsapp_group_url: string | null;
  parents_guide_url: string | null;
}

export interface IntakeFormData {
  sport_id: string;
  category_id?: string;
  venue_id?: string;
  plan_id?: string;
  player_name: string;
  player_birth_date: Date;
  guardian_name: string;
  guardian_email?: string;
  guardian_phone: string;
  guardian_occupation?: string;
  payment_method: 'efectivo' | 'transferencia';
  promo_applied: boolean;
  promo_code?: string;
}

export interface IntakeRequestWithRelations extends IntakeRequest {
  sports: { name: string } | null;
  categories: { name: string } | null;
  venues: { name: string } | null;
  plans: { name: string } | null;
}
