import { supabase } from './supabase';

/**
 * Utility function to debug the admin status of the current user.
 * This can be called from the browser console to help diagnose issues.
 */
export async function debugAdminStatus() {
  try {
    console.log('---- ADMIN STATUS DEBUG ----');
    
    // Get current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Error getting session:', sessionError);
      return { success: false, error: sessionError };
    }
    
    if (!sessionData.session) {
      console.log('No active session found. User is not logged in.');
      return { success: false, message: 'No active session' };
    }
    
    const userId = sessionData.session.user.id;
    console.log('Current user ID:', userId);
    console.log('User email:', sessionData.session.user.email);
    
    // Check profile and role
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      console.error('Error fetching profile:', profileError);
      
      // Check if profile exists directly using the verify_admin_access function
      const { data: adminCheckData, error: adminCheckError } = await supabase.rpc(
        'verify_admin_access',
        { user_id: userId }
      );
      
      if (adminCheckError) {
        console.error('Error checking admin access via RPC:', adminCheckError);
      } else if (adminCheckData && adminCheckData.length > 0) {
        console.log('Admin access check result:', adminCheckData[0]);
        console.log('User exists:', adminCheckData[0].user_exists);
        console.log('Is admin:', adminCheckData[0].is_admin);
        console.log('User role:', adminCheckData[0].user_role);
        
        if (adminCheckData[0].user_exists && !adminCheckData[0].is_admin) {
          console.log('User exists but is not an admin. Consider using fixAdminStatus() to update the role.');
        } else if (!adminCheckData[0].user_exists) {
          console.log('Profile does not exist. A profile will be created on the next login attempt.');
        }
      }
      
      return { 
        success: false, 
        error: profileError,
        adminCheck: adminCheckData
      };
    }
    
    if (!profileData) {
      console.log('No profile found for this user.');
      return { success: false, message: 'No profile found' };
    }
    
    console.log('Profile data:', profileData);
    console.log('User role:', profileData.role);
    console.log('Is admin?', profileData.role === 'admin');
    
    // Double-check with verify_admin_access RPC function
    const { data: adminCheckData, error: adminCheckError } = await supabase.rpc(
      'verify_admin_access',
      { user_id: userId }
    );
    
    if (adminCheckError) {
      console.error('Error checking admin access via RPC:', adminCheckError);
    } else if (adminCheckData && adminCheckData.length > 0) {
      console.log('Admin access check result:', adminCheckData[0]);
      
      // Check for inconsistencies
      if (adminCheckData[0].is_admin !== (profileData.role === 'admin')) {
        console.warn('⚠️ Inconsistency detected: Profile role and admin check do not match!');
        console.log('Profile says admin:', profileData.role === 'admin');
        console.log('Admin check says admin:', adminCheckData[0].is_admin);
      }
    }
    
    // Session expiry time
    if (sessionData.session.expires_at) {
      const expiryDate = new Date(sessionData.session.expires_at);
      console.log('Session expires at:', expiryDate.toLocaleString());
      const timeLeft = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60));
      console.log(`Session expires in approximately ${timeLeft} hours`);
    }
    
    console.log('---- END DEBUG ----');
    
    return { 
      success: true, 
      isAdmin: profileData.role === 'admin',
      profile: profileData,
      session: sessionData.session,
      userId,
      adminCheck: adminCheckData?.[0]
    };
  } catch (error) {
    console.error('Error in debugAdminStatus:', error);
    return { success: false, error };
  }
}

/**
 * Utility function to fix admin status by setting the role to admin.
 * This should only be used for development/debugging purposes.
 */
export async function fixAdminStatus() {
  try {
    console.log('---- ATTEMPTING TO FIX ADMIN STATUS ----');
    
    // Get current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !sessionData.session) {
      console.error('No active session:', sessionError);
      return { success: false, message: 'You must be logged in' };
    }
    
    const userId = sessionData.session.user.id;
    console.log('Updating role for user ID:', userId);
    
    // Update profile to admin
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', userId);
    
    if (error) {
      console.error('Error updating profile:', error);
      return { success: false, error };
    }
    
    console.log('Profile updated successfully. User role is now admin.');
    console.log('---- FIX COMPLETE ----');
    
    return { success: true, message: 'Admin status updated successfully' };
  } catch (error) {
    console.error('Error in fixAdminStatus:', error);
    return { success: false, error };
  }
}

/**
 * Special utility function to ensure theamal11z@rex.com user has admin privileges
 * This is a targeted fix for the specific user that should have admin access
 */
export async function ensureTheamalAdmin() {
  try {
    console.log('---- ENSURING THEAMAL USER ADMIN STATUS ----');
    
    // Get current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Error getting session:', sessionError);
      return { success: false, error: sessionError };
    }
    
    if (!sessionData.session) {
      console.log('No active session found. Please log in first.');
      return { success: false, message: 'No active session' };
    }
    
    const userId = sessionData.session.user.id;
    const userEmail = sessionData.session.user.email;
    
    if (!userEmail || userEmail.toLowerCase() !== 'theamal11z@rex.com') {
      console.log(`Current user (${userEmail}) is not theamal11z@rex.com. No action taken.`);
      return { success: false, message: 'Not theamal user' };
    }
    
    console.log('Theamal user detected, ensuring admin role...');
    
    // First try directly via RPC function
    try {
      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        'grant_admin_access',
        { target_email: 'theamal11z@rex.com' }
      );
      
      if (rpcError) {
        console.error('Error with grant_admin_access RPC:', rpcError);
      } else {
        console.log('RPC grant_admin_access result:', rpcResult);
      }
    } catch (err) {
      console.error('Error calling grant_admin_access:', err);
    }
    
    // Update profile directly as backup approach
    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({ 
        id: userId,
        email: 'theamal11z@rex.com',
        role: 'admin',
        updated_at: new Date()
      });
    
    if (updateError) {
      console.error('Error updating profile:', updateError);
      return { success: false, error: updateError };
    }
    
    console.log('Profile updated successfully. User role is now admin.');
    
    // Verify if it worked
    const { data: verifyResult, error: verifyError } = await supabase.rpc(
      'verify_admin_access',
      { user_id: userId }
    );
    
    if (verifyError) {
      console.error('Error verifying update:', verifyError);
    } else if (verifyResult && verifyResult.length > 0) {
      console.log('Verification result:', verifyResult[0]);
      console.log('Is admin:', verifyResult[0].is_admin);
    }
    
    console.log('---- FIX COMPLETE ----');
    console.log('Please refresh the page or re-login to apply the changes.');
    
    return { success: true, message: 'Admin status updated successfully' };
  } catch (error) {
    console.error('Error in ensureTheamalAdmin:', error);
    return { success: false, error };
  }
}

/**
 * Forces admin access for local development by setting a session storage flag
 * This is a development-only utility for bypassing admin checks
 */
export function forceAdminAccessForTesting() {
  try {
    console.log('---- FORCING ADMIN ACCESS FOR TESTING ----');
    
    // Set a flag in session storage that our components can check
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('FORCE_ADMIN_ACCESS', 'true');
      console.log('Admin access flag set in session storage');
      console.log('You may need to refresh the page to see the changes take effect');
    }
    
    return { success: true, message: 'Admin access forced for testing' };
  } catch (error) {
    console.error('Error in forceAdminAccessForTesting:', error);
    return { success: false, error };
  }
}

/**
 * Checks if admin access is being forced for testing
 */
export function isAdminAccessForced() {
  if (typeof window !== 'undefined') {
    return window.sessionStorage.getItem('FORCE_ADMIN_ACCESS') === 'true';
  }
  return false;
}

// Add these functions to the window object for console access
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.debugAdminStatus = debugAdminStatus;
  // @ts-ignore
  window.fixAdminStatus = fixAdminStatus;
  // @ts-ignore
  window.ensureTheamalAdmin = ensureTheamalAdmin;
  // @ts-ignore
  window.forceAdminAccessForTesting = forceAdminAccessForTesting;
}

export default {
  debugAdminStatus,
  fixAdminStatus,
  ensureTheamalAdmin,
  forceAdminAccessForTesting,
  isAdminAccessForced
}; 