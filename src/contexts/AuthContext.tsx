import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { UserProfile, Organization, OrgRole, AuthState } from '@/types/auth';

interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setActiveRole: (role: OrgRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACTIVE_ROLE_KEY = 'stryk_active_role';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [roles, setRoles] = useState<OrgRole[]>([]);
  const [activeRole, setActiveRoleState] = useState<OrgRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setActiveRole = useCallback((role: OrgRole) => {
    if (roles.includes(role)) {
      setActiveRoleState(role);
      localStorage.setItem(ACTIVE_ROLE_KEY, role);
    }
  }, [roles]);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError || !profile) {
        console.error('Error fetching profile:', profileError);
        return;
      }

      setUser(profile as UserProfile);

      // Fetch organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .maybeSingle();

      if (orgError || !org) {
        console.error('Error fetching organization:', orgError);
        return;
      }

      setOrganization(org as Organization);

      // Fetch ALL roles for this user in this organization
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_org_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('organization_id', profile.organization_id);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        return;
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
    } catch (error) {
      console.error('Error in fetchUserData:', error);
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        
        if (session?.user) {
          // Defer Supabase calls with setTimeout
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setUser(null);
          setOrganization(null);
          setRoles([]);
          setActiveRoleState(null);
          localStorage.removeItem(ACTIVE_ROLE_KEY);
        }
        
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setOrganization(null);
    setRoles([]);
    setActiveRoleState(null);
    setSession(null);
    localStorage.removeItem(ACTIVE_ROLE_KEY);
  };

  const refreshProfile = async () => {
    if (session?.user) {
      await fetchUserData(session.user.id);
    }
  };

  const value: AuthContextType = {
    user,
    organization,
    roles,
    activeRole,
    isLoading,
    isAuthenticated: !!session && !!user,
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
