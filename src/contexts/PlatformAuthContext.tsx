import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

type PlatformAuthStatus = 'loading' | 'authenticated' | 'unauthorized' | 'error';

interface PlatformAuthState {
  user: User | null;
  status: PlatformAuthStatus;
  isPlatformAdmin: boolean;
  error: string | null;
}

interface PlatformAuthContextType extends PlatformAuthState {
  signOut: () => Promise<void>;
  refetch: () => Promise<void>;
}

const PlatformAuthContext = createContext<PlatformAuthContextType | null>(null);

const ADMIN_CHECK_TIMEOUT = 8000; // 8 seconds timeout

export function PlatformAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PlatformAuthState>({
    user: null,
    status: 'loading',
    isPlatformAdmin: false,
    error: null,
  });
  
  const initializingRef = useRef(false);
  const attemptIdRef = useRef(0);

  const checkPlatformAdminWithTimeout = async (userId: string): Promise<boolean> => {
    console.log('[PlatformAuth] Checking admin status for user:', userId);
    
    // Use Promise.race with timeout to prevent infinite waiting
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Admin check timeout')), ADMIN_CHECK_TIMEOUT);
    });

    const checkPromise = (async () => {
      // Yield to event loop first to prevent deadlock (like AuthContext pattern)
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Direct query instead of RPC to avoid potential issues
      const { data, error } = await supabase
        .from('platform_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'platform_super_admin')
        .maybeSingle();

      console.log('[PlatformAuth] Direct query result:', { data, error, userId });

      if (error) {
        console.error('[PlatformAuth] Error checking admin status:', error);
        return false;
      }

      return !!data;
    })();

    try {
      return await Promise.race([checkPromise, timeoutPromise]);
    } catch (error) {
      console.error('[PlatformAuth] Admin check failed:', error);
      return false;
    }
  };

  const initialize = async () => {
    if (initializingRef.current) return;
    initializingRef.current = true;
    
    const currentAttempt = ++attemptIdRef.current;
    console.log('[PlatformAuth] Starting initialization, attempt:', currentAttempt);

    try {
      // Yield first to prevent deadlock
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // Check if this attempt is still valid
      if (currentAttempt !== attemptIdRef.current) {
        console.log('[PlatformAuth] Stale attempt, ignoring:', currentAttempt);
        return;
      }
      
      console.log('[PlatformAuth] Session check:', { 
        hasSession: !!session, 
        userId: session?.user?.id,
        email: session?.user?.email,
        error: sessionError 
      });
      
      if (sessionError) {
        console.error('[PlatformAuth] Session error:', sessionError);
        setState({ user: null, status: 'error', isPlatformAdmin: false, error: sessionError.message });
        return;
      }
      
      if (!session?.user) {
        console.log('[PlatformAuth] No session - setting unauthorized');
        setState({ user: null, status: 'unauthorized', isPlatformAdmin: false, error: null });
        return;
      }

      const isPlatformAdmin = await checkPlatformAdminWithTimeout(session.user.id);
      
      // Check again if this attempt is still valid
      if (currentAttempt !== attemptIdRef.current) {
        console.log('[PlatformAuth] Stale attempt after admin check, ignoring:', currentAttempt);
        return;
      }
      
      console.log('[PlatformAuth] Final admin status:', isPlatformAdmin);

      setState({
        user: session.user,
        status: isPlatformAdmin ? 'authenticated' : 'unauthorized',
        isPlatformAdmin,
        error: null,
      });
    } catch (error) {
      console.error('[PlatformAuth] Initialization error:', error);
      if (currentAttempt === attemptIdRef.current) {
        setState({ 
          user: null, 
          status: 'error', 
          isPlatformAdmin: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    } finally {
      initializingRef.current = false;
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setState({ user: null, status: 'unauthorized', isPlatformAdmin: false, error: null });
  };

  const refetch = async () => {
    initializingRef.current = false;
    setState(prev => ({ ...prev, status: 'loading', error: null }));
    await initialize();
  };

  useEffect(() => {
    // Listener first pattern - subscribe before getting session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[PlatformAuth] Auth state change:', event, session?.user?.email);
      
      if (event === 'SIGNED_OUT') {
        setState({ user: null, status: 'unauthorized', isPlatformAdmin: false, error: null });
      } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        // Yield first
        await new Promise(resolve => setTimeout(resolve, 0));
        
        const isPlatformAdmin = await checkPlatformAdminWithTimeout(session.user.id);
        setState({
          user: session.user,
          status: isPlatformAdmin ? 'authenticated' : 'unauthorized',
          isPlatformAdmin,
          error: null,
        });
      }
    });

    // Then initialize
    initialize();

    return () => subscription.unsubscribe();
  }, []);

  return (
    <PlatformAuthContext.Provider value={{ ...state, signOut, refetch }}>
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
