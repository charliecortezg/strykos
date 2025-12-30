import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { UserProfile, Organization, OrgRole } from '@/types/auth';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

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
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setActiveRole: (role: OrgRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACTIVE_ROLE_KEY = 'stryk_active_role';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [roles, setRoles] = useState<OrgRole[]>([]);
  const [activeRole, setActiveRoleState] = useState<OrgRole | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  
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

      // Fetch organization with onboarding status
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .maybeSingle();

      if (orgError || !org) {
        console.error('Error fetching organization:', orgError);
        return false;
      }

      setOrganization(org as Organization);
      setOnboardingCompleted(org.onboarding_completed ?? false);

      // Fetch ALL roles for this user in this organization
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_org_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('organization_id', profile.organization_id);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        return false;
      }

      const userRoles = (rolesData || []).map(r => r.role as OrgRole);
      setRoles(userRoles);

      // Set active role from localStorage or default to first role (prioritize org_owner)
      const savedRole = localStorage.getItem(ACTIVE_ROLE_KEY) as OrgRole | null;
      if (savedRole && userRoles.includes(savedRole)) {
        setActiveRoleState(savedRole);
      } else if (userRoles.includes('org_owner')) {
        setActiveRoleState('org_owner');
        localStorage.setItem(ACTIVE_ROLE_KEY, 'org_owner');
      } else if (userRoles.length > 0) {
        setActiveRoleState(userRoles[0]);
        localStorage.setItem(ACTIVE_ROLE_KEY, userRoles[0]);
      }

      return true;
    } catch (error) {
      console.error('Error in fetchUserData:', error);
      return false;
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    // Prevent multiple initializations
    if (initializingRef.current || hasInitializedRef.current) return;
    initializingRef.current = true;

    const initializeAuth = async () => {
      // Set up auth state listener FIRST
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, newSession) => {
          // Handle sign out
          if (event === 'SIGNED_OUT' || !newSession) {
            setSession(null);
            clearState();
            setStatus('unauthenticated');
            return;
          }

          // Handle sign in or token refresh
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
            setSession(newSession);
            
            if (newSession?.user) {
              // Use setTimeout to avoid Supabase deadlock
              setTimeout(async () => {
                const success = await fetchUserData(newSession.user.id);
                setStatus(success ? 'authenticated' : 'unauthenticated');
              }, 0);
            }
          }
        }
      );

      // THEN check for existing session
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

      // Listen for storage events (multi-tab sync)
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'sb-ounhzchuuvziyqriyjdb-auth-token' && !e.newValue) {
          // Token was removed in another tab - sign out here too
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
    signOut,
    refreshProfile,
    setActiveRole,
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
