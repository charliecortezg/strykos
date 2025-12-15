// STRYK Categories, Players, Payments & Venues Types

export type PaymentStatus = 'al_dia' | 'pendiente' | 'atrasado';
export type AttendanceStatus = 'presente' | 'ausente' | 'justificado';
export type PaymentMethod = 'efectivo' | 'transferencia' | 'tarjeta' | 'otro';

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  al_dia: 'Al día',
  pendiente: 'Pendiente',
  atrasado: 'Atrasado',
};

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  presente: 'Presente',
  ausente: 'Ausente',
  justificado: 'Justificado',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  otro: 'Otro',
};

export const DAYS_OF_WEEK = [
  { value: 'lunes', label: 'Lun' },
  { value: 'martes', label: 'Mar' },
  { value: 'miercoles', label: 'Mié' },
  { value: 'jueves', label: 'Jue' },
  { value: 'viernes', label: 'Vie' },
  { value: 'sabado', label: 'Sáb' },
  { value: 'domingo', label: 'Dom' },
] as const;

export interface Venue {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  organization_id: string;
  name: string;
  sport_id: string | null;
  venue_id: string | null;
  trainer_id: string | null;
  start_time: string | null;
  end_time: string | null;
  days_of_week: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  sport?: { id: string; name: string } | null;
  venue?: { id: string; name: string } | null;
  trainer?: { id: string; full_name: string } | null;
}

export interface Player {
  id: string;
  organization_id: string;
  category_id: string | null;
  sport_id: string | null;
  plan_id: string | null;
  full_name: string;
  phone: string | null;
  tutor_name: string | null;
  position: string | null;
  plan: string | null;
  monthly_fee: number | null;
  payment_status: PaymentStatus;
  is_scholarship: boolean;
  is_active: boolean;
  is_trial: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  category?: { id: string; name: string } | null;
  sport?: { id: string; name: string } | null;
  plan_data?: { id: string; name: string; price: number } | null;
}

export interface Attendance {
  id: string;
  organization_id: string;
  player_id: string;
  category_id: string;
  date: string;
  status: AttendanceStatus;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  category?: { id: string; name: string } | null;
}

export interface Payment {
  id: string;
  organization_id: string;
  player_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_month: string;
  concept: string;
  notes: string | null;
  evidence_url: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  player?: { id: string; full_name: string; category?: { name: string } | null } | null;
}

export interface CreateCategoryData {
  name: string;
  sport_id?: string;
  venue_id?: string;
  trainer_id?: string;
  start_time?: string;
  end_time?: string;
  days_of_week?: string[];
}

export interface CreatePlayerData {
  full_name: string;
  category_id?: string;
  sport_id?: string;
  plan_id?: string;
  phone?: string;
  tutor_name?: string;
  position?: string;
  plan?: string;
  monthly_fee?: number;
  is_scholarship?: boolean;
}

export interface CreatePaymentData {
  player_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_month: string;
  concept?: string;
  notes?: string;
}

export interface CreateVenueData {
  name: string;
  address?: string;
}
