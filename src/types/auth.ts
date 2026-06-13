// STRYK Auth Types

export type OrgRole = 'org_owner' | 'director_deportivo' | 'entrenador' | 'administrativo';
export type PlatformRole = 'platform_super_admin';
export type OrganizationType = 
  | 'profesional' 
  | 'recreativa' 
  | 'escolar' 
  | 'gubernamental'
  | 'universitaria'
  | 'comunitaria'
  | 'privada'
  | 'federativa'
  | 'club_social'
  | 'otro';
export type OrganizationMode = 'academy' | 'evaluation_only';
export type SubscriptionPlan = 'freemium' | 'starter' | 'professional' | 'enterprise';

export interface Organization {
  id: string;
  name: string;
  org_code: string;
  org_access_key: string;
  organization_type: OrganizationType;
  organization_mode: OrganizationMode;
  approximate_students: number;
  primary_sport: string;
  city: string;
  country: string;
  phone: string;
  plan: SubscriptionPlan;
  is_active: boolean;
  onboarding_completed?: boolean;
  created_at: string;
  updated_at: string;
  // Fase 2: feature profile + per-flag overrides
  feature_profile?: 'basic' | 'full';
  features?: Record<string, boolean>;
  feature_stryk_way_enabled?: boolean | null;
}

export interface UserProfile {
  id: string;
  organization_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserOrgRole {
  id: string;
  user_id: string;
  organization_id: string;
  role: OrgRole;
  created_at: string;
}

export interface AuthState {
  user: UserProfile | null;
  organization: Organization | null;
  roles: OrgRole[];
  activeRole: OrgRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface RegistrationData {
  // Academy data
  academyName: string;
  organizationType: OrganizationType;
  approximateStudents: number;
  primarySport: string;
  city: string;
  country: string;
  phone: string;
  // Founder data
  founderName: string;
  email: string;
  password: string;
  acceptTerms: boolean;
}

export interface LoginCredentials {
  orgCode: string;
  orgAccessKey: string;
  email: string;
  password: string;
}

export interface CreateUserData {
  fullName: string;
  email: string;
  password: string;
  role: OrgRole;
}

export const ORG_ROLE_LABELS: Record<OrgRole, string> = {
  org_owner: 'Fundador',
  director_deportivo: 'Director Deportivo',
  entrenador: 'Entrenador',
  administrativo: 'Administrativo',
};

export const ORG_ROLE_DESCRIPTIONS: Record<OrgRole, string[]> = {
  org_owner: [
    'Control total de la organización',
    'Gestión de usuarios y roles',
    'Configuración del sistema',
  ],
  director_deportivo: [
    'Gestión de jugadores y categorías',
    'Control deportivo completo',
    'Reportes y métricas',
  ],
  entrenador: [
    'Registro de asistencia',
    'Gestión de su categoría',
    'Operación en cancha',
  ],
  administrativo: [
    'Gestión de pagos',
    'Control financiero básico',
    'Seguimiento administrativo',
  ],
};

export const ORGANIZATION_TYPES: { value: OrganizationType; label: string }[] = [
  { value: 'profesional', label: 'Profesional' },
  { value: 'recreativa', label: 'Recreativa' },
  { value: 'escolar', label: 'Escolar' },
  { value: 'gubernamental', label: 'Gubernamental' },
  { value: 'universitaria', label: 'Universitaria' },
  { value: 'comunitaria', label: 'Comunitaria' },
  { value: 'privada', label: 'Privada' },
  { value: 'federativa', label: 'Federativa' },
  { value: 'club_social', label: 'Club Social' },
  { value: 'otro', label: 'Otro' },
];
