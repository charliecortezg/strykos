// Feature profiles & per-flag resolution (Fase 2)
// Source of truth for which modules are available per organization.

export const FEATURE_KEYS = [
  'evaluations',
  'stryk_way',
  'idp',
  'membership_blocks',
  'matches',
  'uniforms',
  'cheer',
  'coach_training',
  'founder_copilot',
  'family_portal',
  'session_planner',
  'unified_owner_panel',
  'venues',
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];
export type FeatureProfile = 'basic' | 'full';

export const PROFILE_DEFAULTS: Record<FeatureProfile, Record<FeatureKey, boolean>> = {
  basic: {
    evaluations: false,
    stryk_way: false,
    idp: false,
    membership_blocks: false,
    matches: false,
    uniforms: false,
    cheer: false,
    coach_training: false,
    founder_copilot: false,
    family_portal: false,
    session_planner: false,
    unified_owner_panel: true,
    venues: false,
  },
  full: {
    evaluations: true,
    stryk_way: true,
    idp: true,
    membership_blocks: true,
    matches: true,
    uniforms: true,
    cheer: true,
    coach_training: true,
    founder_copilot: true,
    family_portal: true,
    session_planner: true,
    unified_owner_panel: false,
    venues: true,
  },
};

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  evaluations: 'Evaluaciones',
  stryk_way: 'STRYK Way',
  idp: 'IDP',
  membership_blocks: 'Bloques de Membresía',
  matches: 'Partidos',
  uniforms: 'Uniformes',
  cheer: 'Porra',
  coach_training: 'Capacitación',
  founder_copilot: 'Copilot del Fundador',
  family_portal: 'Portal Familiar',
  session_planner: 'Planificador de Sesión',
  unified_owner_panel: 'Panel Unificado del Dueño',
  venues: 'Sedes',
};

export interface OrgFeatureSource {
  feature_profile?: FeatureProfile | string | null;
  features?: Record<string, boolean> | null;
  // Legacy column kept as fallback only for stryk_way
  feature_stryk_way_enabled?: boolean | null;
}

/**
 * Resolve a single feature flag with precedence:
 *   1. organizations.features[key] override (if defined)
 *   2. (stryk_way only) legacy column feature_stryk_way_enabled if not null
 *   3. PROFILE_DEFAULTS[feature_profile][key]
 */
export function resolveFeature(org: OrgFeatureSource | null | undefined, key: FeatureKey): boolean {
  if (!org) return false;

  const overrides = org.features ?? {};
  if (Object.prototype.hasOwnProperty.call(overrides, key)) {
    return Boolean(overrides[key]);
  }

  if (key === 'stryk_way' && org.feature_stryk_way_enabled !== null && org.feature_stryk_way_enabled !== undefined) {
    return Boolean(org.feature_stryk_way_enabled);
  }

  const profile: FeatureProfile = org.feature_profile === 'full' ? 'full' : 'basic';
  return PROFILE_DEFAULTS[profile][key];
}

export function resolveProfile(org: OrgFeatureSource | null | undefined): FeatureProfile {
  return org?.feature_profile === 'full' ? 'full' : 'basic';
}
