import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import supabase, { signInWithExtendedSession, testAuthentication } from './supabase';
import { useSessionConfig } from './hooks/useSessionConfig';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any } | { session: Session }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const sessionConfig = useSessionConfig();

  // DEVELOPMENT ONLY: Force all users to be admins for easier testing
  // IMPORTANT: Set this to false before deployment
  const FORCE_ADMIN_ACCESS = true;

  // Check if user has admin role
  const checkAdminStatus = async (user: User) => {
    try {
      setLoadingProfile(true);
      console.log('Checking admin status for user:', user.id);
      
      // For development: Force admin status for all users
      if (FORCE_ADMIN_ACCESS) {
        console.log('DEVELOPMENT MODE: Force setting admin status to TRUE for all users');
        setIsAdmin(true);
        setLoadingProfile(false);
        return;
      }
      
      // First, directly use the verify_admin_access RPC function for reliable admin check
      console.log('Checking admin status via RPC function...');
      const { data: adminCheck, error: adminCheckError } = await supabase.rpc(
        'verify_admin_access',
        { user_id: user.id }
      );
      
      if (!adminCheckError && adminCheck && adminCheck.length > 0) {
        console.log('Direct admin check result:', adminCheck[0]);
        
        // If admin status is confirmed by the RPC function, trust this result
        if (adminCheck[0].is_admin) {
          console.log('User confirmed as admin via direct check');
          setIsAdmin(true);
          
          // Ensure profile has admin role (might be out of sync)
          if (!adminCheck[0].user_exists || adminCheck[0].user_role !== 'admin') {
            console.log('Ensuring profile has admin role...');
            const { error: updateError } = await supabase
              .from('profiles')
              .upsert({
                id: user.id,
                email: user.email,
                role: 'admin',
                updated_at: new Date()
              });
              
            if (updateError) {
              console.error('Error updating profile role:', updateError);
            } else {
              console.log('Profile updated with admin role');
            }
          }
          
          setLoadingProfile(false);
          return;
        }
      } else if (adminCheckError) {
        console.error('Error with direct admin check:', adminCheckError);
      }
      
      // Get profile with role information as backup
      const { data, error } = await supabase
        .from('profiles')
        .select('role, email, full_name')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        // Try to create a profile for the user if it doesn't exist
        if (error.code === 'PGRST116') { // Record not found
          console.log('Profile not found, attempting to create one...');
          
          // Check if this user is supposed to be an admin (e.g., specific email)
          // This can use the email to determine if an admin (for the theamal11z@rex.com user)
          const isTheamal = user.email === 'theamal11z@rex.com';
          const shouldBeAdmin = isTheamal; // Add other conditions as needed
          
          console.log(`User ${user.email} should be admin: ${shouldBeAdmin}`);
          
          const newRole = shouldBeAdmin ? 'admin' : 'user';
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([
              { 
                id: user.id,
                email: user.email || '',
                full_name: user.email ? user.email.split('@')[0] : 'User',
                role: newRole,
                created_at: new Date(),
                updated_at: new Date()
              }
            ])
            .select();
            
          if (createError) {
            console.error('Error creating profile:', createError);
            setIsAdmin(false);
          } else {
            console.log('Created new profile:', newProfile);
            setIsAdmin(shouldBeAdmin);
          }
          setLoadingProfile(false);
          return;
        }
        
        setIsAdmin(false);
        setLoadingProfile(false);
        return;
      }

      console.log('User profile data:', data);
      
      // Check if user has admin role
      const hasAdminRole = data?.role === 'admin';
      console.log('User has admin role:', hasAdminRole);
      setIsAdmin(hasAdminRole);
      
      // Special handling for theamal11z@rex.com - ensure admin
      if (user.email === 'theamal11z@rex.com' && !hasAdminRole) {
        console.log('Special user detected, checking admin authorization via secure method...');
        // Instead of hardcoding email, use a secure RPC function to check if user should be admin
        const { data: adminAuthCheck, error: adminAuthError } = await supabase.rpc(
          'verify_admin_authorization',
          { email: user.email }
        );
        
        if (!adminAuthError && adminAuthCheck && adminAuthCheck.is_authorized) {
          console.log('User authorized as admin via secure verification');
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', user.id);
            
          if (updateError) {
            console.error('Error updating special user role:', updateError);
          } else {
            console.log('Updated user to admin role based on secure verification');
            setIsAdmin(true);
          }
        } else {
          console.log('User not authorized for special admin access');
        }
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Sign out user
  const signOut = async () => {
    try {
      console.log('Signing out user');
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Sign in user with extended session
  const signIn = async (email: string, password: string) => {
    try {
      setLoadingAuth(true);
      console.log('Attempting to sign in with email:', email);
      
      // First, try to sign out to ensure we have a clean state
      await supabase.auth.signOut();
      
      const result = await signInWithExtendedSession(email, password);
      
      if (result.error) {
        console.error('Error signing in:', result.error);
        return { error: result.error };
      }

      console.log('Sign in successful, session:', result.data.session ? 'exists' : 'missing');
      console.log('User:', result.data.user?.email);
      
      setUser(result.data.user);
      setSession(result.data.session);
      
      if (result.data.user) {
        // For faster login experience, immediately set admin status for development
        if (FORCE_ADMIN_ACCESS) {
          setIsAdmin(true);
        }
        
        // Still check in the background for proper operation
        await checkAdminStatus(result.data.user);
      }
      
      // Test if we're actually authenticated
      const authTest = await testAuthentication();
      console.log('Authentication test result:', authTest);
      
      return { session: result.data.session };
    } catch (error) {
      console.error('Error in sign in function:', error);
      return { error };
    } finally {
      setLoadingAuth(false);
    }
  };

  // Refresh the session
  const refreshSession = async (): Promise<boolean> => {
    const now = Date.now();
    
    // Don't refresh if we've refreshed recently
    if (now - lastRefreshTime < sessionConfig.MIN_REFRESH_INTERVAL) {
      console.log('Skipping refresh - performed recently');
      return !!session;
    }
    
    try {
      setLoadingAuth(true);
      // Log existing session info if available
      if (session?.expires_at) {
        const expiresAt = new Date(session.expires_at);
        console.log(`Current session expires at: ${expiresAt.toLocaleString()}`);
      }
      
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error('Error refreshing session:', error);
        // Try to recover by checking if we still have a valid session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (!sessionError && sessionData?.session) {
          console.log('Found existing valid session despite refresh error');
          setSession(sessionData.session);
          setUser(sessionData.user);
          setLastRefreshTime(now);
          return true;
        }
        return false;
      }
      
      if (data.session) {
        setSession(data.session);
        setUser(data.user);
        
        // Record when we last refreshed
        setLastRefreshTime(now);
        
        if (data.user) {
          if (FORCE_ADMIN_ACCESS) {
            setIsAdmin(true);
          } else {
            await checkAdminStatus(data.user);
          }
        }
        
        // Log new expiry time
        if (data.session.expires_at) {
          const expiresAt = new Date(data.session.expires_at);
          console.log(`Refreshed session expires at: ${expiresAt.toLocaleString()}`);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error in refresh session function:', error);
      return false;
    } finally {
      setLoadingAuth(false);
    }
  };

  // Listen for auth changes
  useEffect(() => {
    const fetchSession = async () => {
      try {
        setLoadingAuth(true);
        console.log('Fetching initial session');
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        } else {
          console.log('Initial session:', data.session ? 'exists' : 'missing');
          setSession(data.session);
          setUser(data.user);
          
          if (data.user) {
            console.log('Initial user:', data.user.email);
            if (FORCE_ADMIN_ACCESS) {
              setIsAdmin(true);
              setLoadingProfile(false);
            } else {
              await checkAdminStatus(data.user);
            }
          } else {
            console.log('No user in initial session');
            setLoadingProfile(false);
          }
        }
      } catch (error) {
        console.error('Error in fetch session:', error);
        setLoadingProfile(false);
      } finally {
        setLoadingAuth(false);
      }
    };

    fetchSession();

    // Subscribe to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state change:', event);
      
      // Set loading to true during auth state changes
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setLoadingAuth(true);
        }
      
          setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user) {
          console.log('User in auth state change:', newSession.user.email);
          if (FORCE_ADMIN_ACCESS) {
            setIsAdmin(true);
            setLoadingProfile(false);
          } else {
            await checkAdminStatus(newSession.user);
          }
        } else {
          console.log('No user in auth state change');
          setIsAdmin(false);
          setLoadingProfile(false);
        }
        
        // Ensure we're not stuck in loading state
        setLoadingAuth(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Add a timeout to prevent loading state from getting stuck
  useEffect(() => {
    // Force loading to be false after 5 seconds (reduced from 10 seconds)
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.log('Loading timeout reached, forcing loading state to false');
        setLoadingAuth(false);
        setLoadingProfile(false);
      }
    }, 5000);
    
    return () => clearTimeout(loadingTimeout);
  }, [loading]);

  // Set up periodic session refresh
  useEffect(() => {
    // We only want to refresh if we have a session
    if (!session) return;
    
    console.log('Setting up periodic session refresh');
    
    // Refresh every 24 hours instead of 48 hours
    const intervalId = setInterval(async () => {
      console.log('Performing scheduled session refresh');
      await refreshSession();
    }, 24 * 60 * 60 * 1000); // 24 hours
    
    return () => clearInterval(intervalId);
  }, [session]);

  // Update loading state
  useEffect(() => {
    console.log(`Loading state: auth=${loadingAuth}, profile=${loadingProfile}`);
    setLoading(loadingAuth || loadingProfile);
  }, [loadingAuth, loadingProfile]);

  // Auth context value
  const value: AuthContextType = {
    session,
    user,
    isAdmin,
    loading,
    signIn,
    signOut,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 