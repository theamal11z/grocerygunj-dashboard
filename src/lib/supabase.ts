import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Environment variables for Supabase connection
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Ensure required environment variables are present
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required environment variables for Supabase connection');
  // We don't throw an error here to allow the app to load,
  // but authentication and data operations will fail
}

// Debug flag - only enabled in development
const DEBUG = import.meta.env.DEV || false;

if (DEBUG) {
  console.log('Supabase Configuration:');
  console.log('URL:', supabaseUrl ? supabaseUrl.substring(0, 8) + '...' : 'Missing');
  console.log('Key:', supabaseAnonKey ? 'Present (masked)' : 'Missing');
}

// 1 day in seconds
export const SESSION_DURATION_SECONDS = 1 * 24 * 60 * 60;

// Create client with standard session settings
export const supabase = createClient<Database>(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'admin-suite-auth',
      detectSessionInUrl: false,
      flowType: 'implicit',
      storage: localStorage,
    },
    global: {
      headers: {
        'x-admin-role': 'admin'
      }
    }
  }
);

// Test auth on startup in development
if (DEBUG) {
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.error('Error getting session:', error.message);
    } else if (data.session) {
      console.log('Session found for user:', data.session.user.email);
      // Log session expiry time
      const expiresAt = data.session.expires_at;
      if (expiresAt) {
        const expiryDate = new Date(expiresAt);
        console.log('Session expires at:', expiryDate.toLocaleString());
        const timeUntilExpiry = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        console.log(`Session expires in approximately ${timeUntilExpiry} days`);
      }
    } else {
      console.log('No active session found');
    }
  });
}

// Create an admin client that bypasses RLS if we have a service role key
// Note: Only use this for admin operations!
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
export const adminSupabase = supabaseServiceKey ? 
  createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false, // Don't persist service role sessions
    },
  }) : 
  null;

// Utility function to test if authentication is working
export async function testAuthentication() {
  const { data, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('Error getting session:', error.message);
    return { authenticated: false, error };
  }
  
  if (data.session) {
    console.log('Authenticated as:', data.session.user.email);
    // Calculate days until session expiry
    if (data.session.expires_at) {
      const expiryDate = new Date(data.session.expires_at);
      const timeUntilExpiry = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      console.log(`Session expires in approximately ${timeUntilExpiry} days`);
    }
    return { authenticated: true, user: data.session.user };
  }
  
  console.log('Not authenticated');
  return { authenticated: false };
}

// Create a helper function to sign in with standard session
export async function signInWithExtendedSession(email: string, password: string) {
  try {
    console.log('Attempting to sign in with standard session');
    
    // First, sign out to clear any existing sessions 
    await supabase.auth.signOut();
    
    // Sign in with standard session length (1 day)
    const result = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Log session information for debugging
    if (result.data.session) {
      const expiresAt = new Date(result.data.session.expires_at || '');
      console.log(`Session created, expires at: ${expiresAt.toLocaleString()}`);
      
      // Calculate and log duration in hours
      const now = new Date();
      const diffTime = expiresAt.getTime() - now.getTime();
      const diffHours = Math.round(diffTime / (1000 * 60 * 60));
      console.log(`Session will last approximately ${diffHours} hours`);
    } else if (result.error) {
      console.error('Failed to create session:', result.error.message);
    }

    return result;
  } catch (error) {
    console.error('Error in signInWithExtendedSession:', error);
    throw error;
  }
}

export default supabase; 