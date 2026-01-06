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

  const checkPlatformAdmin = async (): Promise<boolean> => {
    console.log('[PlatformAuth] Checking admin status via RPC...');
    
    const { data, error } = await supabase.rpc('is_platform_admin');
    
    console.log('[PlatformAuth] Admin check result:', { data, error });
    
    if (error) {
      console.error('[PlatformAuth] Error checking admin status:', error);
      return false;
    }
    
    return data === true;
  };

  const initialize = async () => {
    if (initializingRef.current) return;
    initializingRef.current = true;

    console.log('[PlatformAuth] Starting initialization...');

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log('[PlatformAuth] Session check:', { 
        hasSession: !!session, 
        userId: session?.user?.id,
        email: session?.user?.email,
        error: sessionError 
      });
      
      if (!session?.user) {
        console.log('[PlatformAuth] No session - setting unauthorized');
        setState({ user: null, status: 'unauthorized', isPlatformAdmin: false });
        return;
      }

      const isPlatformAdmin = await checkPlatformAdmin();
      console.log('[PlatformAuth] Final admin status:', isPlatformAdmin);

      setState({
        user: session.user,
        status: isPlatformAdmin ? 'authenticated' : 'unauthorized',
        isPlatformAdmin,
      });
    } catch (error) {
      console.error('[PlatformAuth] Initialization error:', error);
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
        const isPlatformAdmin = await checkPlatformAdmin();
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
