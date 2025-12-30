import type { OrgRole } from '@/types/auth';

interface RouteDecisionParams {
  isAuthenticated: boolean;
  mustChangePassword?: boolean;
  roles: OrgRole[];
  activeRole: OrgRole | null;
  onboardingCompleted: boolean;
  currentPath: string;
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
    return getDashboardPath(activeRole, roles);
  }

  // No redirect needed
  return null;
}

/**
 * Get the dashboard path for a given role
 */
export function getDashboardPath(activeRole: OrgRole | null, roles: OrgRole[]): string {
  const role = activeRole || (roles.includes('org_owner') ? 'org_owner' : roles[0]);
  if (!role) return '/login';
  return `/dashboard/${role.replace('_', '-')}`;
}
