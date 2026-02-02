import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type PortalAuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

interface Guardian {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
}

interface LinkedPlayer {
  id: string;
  full_name: string;
  category_name: string | null;
  sport_name: string | null;
}

interface PortalAuthState {
  status: PortalAuthStatus;
  guardian: Guardian | null;
  organizationId: string | null;
  organizationName: string | null;
  linkedPlayers: LinkedPlayer[];
  error: string | null;
}

interface PortalAuthContextType extends PortalAuthState {
  login: (orgCode: string, phone: string, pin: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const PortalAuthContext = createContext<PortalAuthContextType | null>(null);

const PORTAL_SESSION_KEY = 'stryk_portal_session';

interface PortalSession {
  guardianId: string;
  organizationId: string;
  expiresAt: number;
}

export function PortalAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PortalAuthState>({
    status: 'loading',
    guardian: null,
    organizationId: null,
    organizationName: null,
    linkedPlayers: [],
    error: null,
  });

  // Check for existing session on mount
  React.useEffect(() => {
    const checkSession = async () => {
      const stored = localStorage.getItem(PORTAL_SESSION_KEY);
      if (!stored) {
        setState(prev => ({ ...prev, status: 'unauthenticated' }));
        return;
      }

      try {
        const session: PortalSession = JSON.parse(stored);
        
        // Check if expired
        if (Date.now() > session.expiresAt) {
          localStorage.removeItem(PORTAL_SESSION_KEY);
          setState(prev => ({ ...prev, status: 'unauthenticated' }));
          return;
        }

        // Fetch guardian data
        const { data: guardian, error: guardianError } = await supabase
          .from('guardians')
          .select('id, full_name, phone, email')
          .eq('id', session.guardianId)
          .eq('organization_id', session.organizationId)
          .maybeSingle();

        if (guardianError || !guardian) {
          localStorage.removeItem(PORTAL_SESSION_KEY);
          setState(prev => ({ ...prev, status: 'unauthenticated' }));
          return;
        }

        // Fetch organization name
        const { data: org } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', session.organizationId)
          .maybeSingle();

        // Fetch linked players
        const { data: links } = await supabase
          .from('player_guardians')
          .select(`
            player:players(
              id,
              full_name,
              category:categories(name),
              sport:sports(name)
            )
          `)
          .eq('guardian_id', session.guardianId);

        const linkedPlayers: LinkedPlayer[] = (links || [])
          .filter(l => l.player)
          .map(l => ({
            id: (l.player as any).id,
            full_name: (l.player as any).full_name,
            category_name: (l.player as any).category?.name || null,
            sport_name: (l.player as any).sport?.name || null,
          }));

        setState({
          status: 'authenticated',
          guardian: guardian as Guardian,
          organizationId: session.organizationId,
          organizationName: org?.name || null,
          linkedPlayers,
          error: null,
        });
      } catch (err) {
        console.error('Portal session check error:', err);
        localStorage.removeItem(PORTAL_SESSION_KEY);
        setState(prev => ({ ...prev, status: 'unauthenticated' }));
      }
    };

    checkSession();
  }, []);

  const login = useCallback(async (orgCode: string, phone: string, pin: string): Promise<boolean> => {
    setState(prev => ({ ...prev, status: 'loading', error: null }));

    try {
      // Find organization by code
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, feature_portal_familiar_enabled')
        .eq('org_code', orgCode.toLowerCase().trim())
        .eq('is_active', true)
        .maybeSingle();

      if (orgError || !org) {
        setState(prev => ({ 
          ...prev, 
          status: 'unauthenticated', 
          error: 'Código de academia no encontrado' 
        }));
        return false;
      }

      if (!org.feature_portal_familiar_enabled) {
        setState(prev => ({ 
          ...prev, 
          status: 'unauthenticated', 
          error: 'El Portal Familiar no está habilitado para esta academia' 
        }));
        return false;
      }

      // Normalize phone (last 10 digits)
      const normalizedPhone = phone.replace(/\D/g, '').slice(-10);

      // Find guardian by phone in this organization
      const { data: guardian, error: guardianError } = await supabase
        .from('guardians')
        .select('id, full_name, phone, email, phone_normalized')
        .eq('organization_id', org.id)
        .eq('phone_normalized', normalizedPhone)
        .maybeSingle();

      if (guardianError || !guardian) {
        setState(prev => ({ 
          ...prev, 
          status: 'unauthenticated', 
          error: 'Teléfono no registrado en esta academia' 
        }));
        return false;
      }

      // For MVP, use last 4 digits of phone as PIN
      // TODO: Implement proper PIN/OTP system
      const expectedPin = normalizedPhone.slice(-4);
      if (pin !== expectedPin) {
        setState(prev => ({ 
          ...prev, 
          status: 'unauthenticated', 
          error: 'PIN incorrecto' 
        }));
        return false;
      }

      // Fetch linked players
      const { data: links } = await supabase
        .from('player_guardians')
        .select(`
          player:players(
            id,
            full_name,
            category:categories(name),
            sport:sports(name)
          )
        `)
        .eq('guardian_id', guardian.id);

      const linkedPlayers: LinkedPlayer[] = (links || [])
        .filter(l => l.player)
        .map(l => ({
          id: (l.player as any).id,
          full_name: (l.player as any).full_name,
          category_name: (l.player as any).category?.name || null,
          sport_name: (l.player as any).sport?.name || null,
        }));

      // Create session (24 hours)
      const session: PortalSession = {
        guardianId: guardian.id,
        organizationId: org.id,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      };
      localStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify(session));

      setState({
        status: 'authenticated',
        guardian: guardian as Guardian,
        organizationId: org.id,
        organizationName: org.name,
        linkedPlayers,
        error: null,
      });

      return true;
    } catch (err) {
      console.error('Portal login error:', err);
      setState(prev => ({ 
        ...prev, 
        status: 'error', 
        error: 'Error al iniciar sesión' 
      }));
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(PORTAL_SESSION_KEY);
    setState({
      status: 'unauthenticated',
      guardian: null,
      organizationId: null,
      organizationName: null,
      linkedPlayers: [],
      error: null,
    });
  }, []);

  const value: PortalAuthContextType = {
    ...state,
    login,
    logout,
    isLoading: state.status === 'loading',
    isAuthenticated: state.status === 'authenticated',
  };

  return (
    <PortalAuthContext.Provider value={value}>
      {children}
    </PortalAuthContext.Provider>
  );
}

export function usePortalAuth() {
  const context = useContext(PortalAuthContext);
  if (!context) {
    throw new Error('usePortalAuth must be used within PortalAuthProvider');
  }
  return context;
}
