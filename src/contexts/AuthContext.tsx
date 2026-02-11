import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { UserProfile, Organization, OrgRole, OrganizationMode } from '@/types/auth';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface OrgWithRoles {
  organization: Organization;
  roles: OrgRole[];
}

interface AuthContextType {
  status: AuthStatus;
  isLoading: boolean;
  isAuthenticated: boolean;
  session: Session | null;
  user: UserProfile | null;
  organization: Organization | null;
  roles: OrgRole[];
  activeRole: OrgRole | null;
  onboardingCompleted: boolean;
  allOrganizations: OrgWithRoles[];
  isSwitchingOrg: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setActiveRole: (role: OrgRole) => void;
  switchOrganization: (orgId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACTIVE_ROLE_KEY = 'stryk_active_role';

function mapOrgRow(org: any): Organization {
  return {
    ...org,
    organization_mode: (org.organization_type as OrganizationMode) || 'academy',
  } as Organization;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [roles, setRoles] = useState<OrgRole[]>([]);
  const [activeRole, setActiveRoleState] = useState<OrgRole | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [allOrganizations, setAllOrganizations] = useState<OrgWithRoles[]>([]);
  const [isSwitchingOrg, setIsSwitchingOrg] = useState(false);
  
  // Prevent race conditions
  const initializingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  const setActiveRole = useCallback((role: OrgRole) => {
    if (roles.includes(role)) {
      setActiveRoleState(role);
      localStorage.setItem(ACTIVE_ROLE_KEY, role);
    }
  }, [roles]);

  const clearState = useCallback(() => {
    setUser(null);
    setOrganization(null);
    setRoles([]);
    setActiveRoleState(null);
    setOnboardingCompleted(false);
    setAllOrganizations([]);
    localStorage.removeItem(ACTIVE_ROLE_KEY);
  }, []);

  const fetchUserData = useCallback(async (userId: string): Promise<boolean> => {
    try {
      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError || !profile) {
        console.error('Error fetching profile:', profileError);
        return false;
      }

      setUser(profile as UserProfile);

      // Fetch ALL roles for this user across ALL organizations
      const { data: allRolesData, error: allRolesError } = await supabase
        .from('user_org_roles')
        .select('role, organization_id')
        .eq('user_id', userId);

      if (allRolesError) {
        console.error('Error fetching all roles:', allRolesError);
        return false;
      }

      // Group roles by org
      const orgIds = [...new Set((allRolesData || []).map(r => r.organization_id))];

      // Fetch all organizations the user belongs to
      let orgsMap: Record<string, Organization> = {};
      if (orgIds.length > 0) {
        const { data: orgsData, error: orgsError } = await supabase
          .from('organizations')
          .select('*')
          .in('id', orgIds);

        if (orgsError) {
          console.error('Error fetching organizations:', orgsError);
          return false;
        }

        (orgsData || []).forEach(o => {
          orgsMap[o.id] = mapOrgRow(o);
        });
      }

      // Build allOrganizations
      const orgRolesMap: Record<string, OrgRole[]> = {};
      (allRolesData || []).forEach(r => {
        if (!orgRolesMap[r.organization_id]) orgRolesMap[r.organization_id] = [];
        orgRolesMap[r.organization_id].push(r.role as OrgRole);
      });

      const allOrgs: OrgWithRoles[] = orgIds
        .filter(id => orgsMap[id])
        .map(id => ({ organization: orgsMap[id], roles: orgRolesMap[id] || [] }));

      setAllOrganizations(allOrgs);

      // Determine active org: use active_organization_id if set, else primary
      const activeOrgId = profile.active_organization_id || profile.organization_id;
      const activeOrg = orgsMap[activeOrgId] || orgsMap[profile.organization_id];

      if (!activeOrg) {
        console.error('No active organization found');
        return false;
      }

      setOrganization(activeOrg);
      setOnboardingCompleted(activeOrg.onboarding_completed ?? false);

      // Set roles for active org
      const activeOrgRoles = orgRolesMap[activeOrg.id] || [];
      setRoles(activeOrgRoles);

      // Set active role from localStorage or default
      const savedRole = localStorage.getItem(ACTIVE_ROLE_KEY) as OrgRole | null;
      if (savedRole && activeOrgRoles.includes(savedRole)) {
        setActiveRoleState(savedRole);
      } else if (activeOrgRoles.includes('org_owner')) {
        setActiveRoleState('org_owner');
        localStorage.setItem(ACTIVE_ROLE_KEY, 'org_owner');
      } else if (activeOrgRoles.length > 0) {
        setActiveRoleState(activeOrgRoles[0]);
        localStorage.setItem(ACTIVE_ROLE_KEY, activeOrgRoles[0]);
      }

      return true;
    } catch (error) {
      console.error('Error in fetchUserData:', error);
      return false;
    }
  }, []);

  const switchOrganization = useCallback(async (targetOrgId: string) => {
    if (!session?.user || isSwitchingOrg) return;
    setIsSwitchingOrg(true);
    try {
      const { error } = await supabase.rpc('switch_organization', { target_org_id: targetOrgId });
      if (error) throw error;
      await fetchUserData(session.user.id);
    } catch (error) {
      console.error('Error switching organization:', error);
    } finally {
      setIsSwitchingOrg(false);
    }
  }, [session, isSwitchingOrg, fetchUserData]);

  // Initialize auth state
  useEffect(() => {
    if (initializingRef.current || hasInitializedRef.current) return;
    initializingRef.current = true;

    const initializeAuth = async () => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, newSession) => {
          if (event === 'SIGNED_OUT' || !newSession) {
            setSession(null);
            clearState();
            setStatus('unauthenticated');
            return;
          }

          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
            setSession(newSession);
            
            if (newSession?.user) {
              setTimeout(async () => {
                const success = await fetchUserData(newSession.user.id);
                setStatus(success ? 'authenticated' : 'unauthenticated');
              }, 0);
            }
          }
        }
      );

      const { data: { session: existingSession } } = await supabase.auth.getSession();
      
      if (existingSession?.user) {
        setSession(existingSession);
        const success = await fetchUserData(existingSession.user.id);
        setStatus(success ? 'authenticated' : 'unauthenticated');
      } else {
        setStatus('unauthenticated');
      }

      hasInitializedRef.current = true;
      initializingRef.current = false;

      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'sb-ounhzchuuvziyqriyjdb-auth-token' && !e.newValue) {
          clearState();
          setSession(null);
          setStatus('unauthenticated');
        }
      };

      window.addEventListener('storage', handleStorageChange);

      return () => {
        subscription.unsubscribe();
        window.removeEventListener('storage', handleStorageChange);
      };
    };

    initializeAuth();
  }, [fetchUserData, clearState]);

  const signOut = async () => {
    // Reset active org before signing out
    try { await supabase.rpc('reset_active_organization'); } catch {}
    await supabase.auth.signOut();
    clearState();
    setSession(null);
    setStatus('unauthenticated');
  };

  const refreshProfile = async () => {
    if (session?.user) {
      await fetchUserData(session.user.id);
    }
  };

  const value: AuthContextType = {
    status,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated' && !!user,
    session,
    user,
    organization,
    roles,
    activeRole,
    onboardingCompleted,
    allOrganizations,
    isSwitchingOrg,
    signOut,
    refreshProfile,
    setActiveRole,
    switchOrganization,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
