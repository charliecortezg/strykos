import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

type PlatformAuthStatus = 'loading' | 'authenticated' | 'unauthorized';

interface PlatformAuthState {
  user: User | null;
  status: PlatformAuthStatus;
  isPlatformAdmin: boolean;
}

interface PlatformAuthContextType extends PlatformAuthState {
  signOut: () => Promise<void>;
  refetch: () => Promise<void>;
}

const PlatformAuthContext = createContext<PlatformAuthContextType | null>(null);

export function PlatformAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PlatformAuthState>({
    user: null,
    status: 'loading',
    isPlatformAdmin: false,
  });
  
  const initializingRef = useRef(false);

  const checkPlatformAdmin = async (userId: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('platform_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'platform_super_admin')
      .maybeSingle();

    return !error && !!data;
  };

  const initialize = async () => {
    if (initializingRef.current) return;
    initializingRef.current = true;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setState({ user: null, status: 'unauthorized', isPlatformAdmin: false });
        return;
      }

      const isPlatformAdmin = await checkPlatformAdmin(session.user.id);

      setState({
        user: session.user,
        status: isPlatformAdmin ? 'authenticated' : 'unauthorized',
        isPlatformAdmin,
      });
    } catch (error) {
      console.error('Platform auth initialization error:', error);
      setState({ user: null, status: 'unauthorized', isPlatformAdmin: false });
    } finally {
      initializingRef.current = false;
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setState({ user: null, status: 'unauthorized', isPlatformAdmin: false });
  };

  useEffect(() => {
    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setState({ user: null, status: 'unauthorized', isPlatformAdmin: false });
      } else if (event === 'SIGNED_IN' && session?.user) {
        const isPlatformAdmin = await checkPlatformAdmin(session.user.id);
        setState({
          user: session.user,
          status: isPlatformAdmin ? 'authenticated' : 'unauthorized',
          isPlatformAdmin,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <PlatformAuthContext.Provider value={{ ...state, signOut, refetch: initialize }}>
      {children}
    </PlatformAuthContext.Provider>
  );
}

export function usePlatformAuth() {
  const context = useContext(PlatformAuthContext);
  if (!context) {
    throw new Error('usePlatformAuth must be used within PlatformAuthProvider');
  }
  return context;
}
