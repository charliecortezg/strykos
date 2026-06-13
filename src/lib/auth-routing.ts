import type { OrgRole } from '@/types/auth';

interface OrgLike {
  feature_profile?: string | null;
  features?: Record<string, boolean> | null;
}

interface RouteDecisionParams {
  isAuthenticated: boolean;
  mustChangePassword?: boolean;
  roles: OrgRole[];
  activeRole: OrgRole | null;
  onboardingCompleted: boolean;
  currentPath: string;
  organization?: OrgLike | null;
}

/**
 * Single source of truth for initial route decisions.
 * Returns the target route, or null if no redirect is needed.
 */
export function getTargetRoute(params: RouteDecisionParams): string | null {
  const {
    isAuthenticated,
    mustChangePassword,
    roles,
    activeRole,
    onboardingCompleted,
    currentPath,
  } = params;

  // Not authenticated - go to login
  if (!isAuthenticated) {
    if (currentPath === '/login' || currentPath === '/registro-academia' || currentPath === '/recuperar-password' || currentPath === '/') {
      return null; // Already on public route
    }
    return '/login';
  }

  // Must change password - go to password change
  if (mustChangePassword) {
    if (currentPath === '/cambiar-password') {
      return null; // Already there
    }
    return '/cambiar-password';
  }

  // Org owner needs onboarding
  if (roles.includes('org_owner') && !onboardingCompleted) {
    if (currentPath === '/onboarding') {
      return null; // Already there
    }
    return '/onboarding';
  }

  // Authenticated user on login page - redirect to dashboard
  if (currentPath === '/login' || currentPath === '/onboarding') {
    return getDashboardPath(activeRole, roles, params.organization);
  }

  // No redirect needed
  return null;
}

/**
 * Get the dashboard path for a given role.
 * If the org has the unified owner panel active (basic profile), org_owner
 * is routed to /dashboard/owner instead of /dashboard/org-owner.
 */
export function getDashboardPath(
  activeRole: OrgRole | null,
  roles: OrgRole[],
  organization?: OrgLike | null,
): string {
  const role = activeRole || (roles.includes('org_owner') ? 'org_owner' : roles[0]);
  if (!role) return '/login';
  if (role === 'org_owner') {
    const profile = organization?.feature_profile;
    const override = organization?.features?.unified_owner_panel;
    const unified = override !== undefined ? override : profile !== 'full';
    if (unified) return '/dashboard/owner';
  }
  return `/dashboard/${role.replace('_', '-')}`;
}
