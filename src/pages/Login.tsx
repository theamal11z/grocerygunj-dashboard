import { useState, FormEvent, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Shield, RefreshCw, Info, Lock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useSessionConfig } from '@/lib/hooks/useSessionConfig';
import { testAuthentication } from '@/lib/supabase';
import { AdminDebugPanel } from '@/components/auth/AdminDebugPanel';

const Login = () => {
  const { signIn, isAdmin, session, refreshSession, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loginAttempted, setLoginAttempted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  
  // Add a timeout ref to prevent the button from being permanently disabled
  const submitTimeoutRef = useRef<number | null>(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const sessionConfig = useSessionConfig();
  
  // Force enable the button after 10 seconds to prevent it being stuck
  useEffect(() => {
    if (submitting) {
      const timeoutId = window.setTimeout(() => {
        console.log('Submit timeout reached - forcing button to be enabled');
        setSubmitting(false);
      }, 10000); // 10 seconds timeout
      
      submitTimeoutRef.current = timeoutId;
      
      return () => {
        if (submitTimeoutRef.current) {
          window.clearTimeout(submitTimeoutRef.current);
        }
      };
    }
  }, [submitting]);

  // Clear form error when email or password changes
  useEffect(() => {
    if (formError) {
      setFormError(null);
    }
  }, [email, password]);

  // If already authenticated and admin, redirect to dashboard
  useEffect(() => {
    console.log('Auth state changed. isAdmin:', isAdmin, 'session:', session ? 'exists' : 'missing', 'submitting:', submitting, 'authLoading:', authLoading, 'loginAttempted:', loginAttempted);
    
    // Clear any previous redirect timeout
    if (submitTimeoutRef.current) {
      window.clearTimeout(submitTimeoutRef.current);
    }
    
    if (session && !authLoading) {
      // Always redirect to dashboard regardless of admin status
      console.log('User is authenticated, redirecting to dashboard');
      const from = location.state?.from?.pathname || '/';
      
      // Add a small delay before navigation to ensure state updates
      submitTimeoutRef.current = window.setTimeout(() => {
        console.log('Executing redirect to:', from);
        navigate(from, { replace: true });
      }, 500);
    }
    
    return () => {
      if (submitTimeoutRef.current) {
        window.clearTimeout(submitTimeoutRef.current);
      }
    };
  }, [session, authLoading, navigate, location.state, loginAttempted]);

  // Forced redirect after successful login with increased delay
  useEffect(() => {
    if (loginAttempted && session && !redirectAttempted && !authLoading) {
      console.log('Forcing redirect to dashboard after login');
      setRedirectAttempted(true);
      
      const from = location.state?.from?.pathname || '/';
      const redirectTimeout = setTimeout(() => {
        navigate(from, { replace: true });
      }, 1200); // Increased delay to give more time for admin status check
      
      return () => clearTimeout(redirectTimeout);
    }
  }, [loginAttempted, session, redirectAttempted, authLoading, navigate, location.state]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submission triggered');
    
    // Simple validation
    if (!email.trim()) {
      setFormError('Please enter your email');
      return;
    }
    
    if (!password.trim()) {
      setFormError('Please enter your password');
      return;
    }
    
    setSubmitting(true);
    setFormError('');
    setLoginAttempted(true);
    setDebugInfo(null);
    setRedirectAttempted(false);
    
    // Reset the force-enable timeout
    if (submitTimeoutRef.current) {
      window.clearTimeout(submitTimeoutRef.current);
    }
    
    // Force-enable the button after 10 seconds
    submitTimeoutRef.current = window.setTimeout(() => {
      setSubmitting(false);
    }, 10000);
    
    try {
      console.log('Attempting to sign in with email:', email);
      
      // Special handling for theamal11z@rex.com
      const isTheamalUser = email.toLowerCase() === 'theamal11z@rex.com';
      if (isTheamalUser) {
        console.log('Special user detected: theamal11z@rex.com');
      }
      
      // Update the auth provider with credentials
      const result = await signIn(email, password);
      console.log('Sign in result:', result);
      
      if ('error' in result) {
        const errorMessage = typeof result.error === 'string' 
          ? result.error 
          : result.error?.message || 'Failed to sign in. Please check your credentials.';
          
        setFormError(errorMessage);
        
        toast({
          variant: 'destructive',
          title: 'Sign In Failed',
          description: 'Please check your credentials and try again.',
        });
      } else if (result.session) {
        console.log('Sign in successful, session exists');
        
        // Quick test of authentication
        const authTest = await testAuthentication();
        console.log('Auth test after login:', authTest);
        
        setDebugInfo(`Authentication successful. Logged in as: ${email}. Admin status: checking...`);
        
        toast({
          title: 'Signed in successfully',
          description: 'Verifying admin privileges...',
        });
        
        // Special handling for theamal11z@rex.com
        if (isTheamalUser) {
          console.log('Applying special handling for theamal11z@rex.com user...');
          
          // Check current admin status
          if (!isAdmin) {
            console.log('Admin status not set yet, will retry dashboard navigation in 2 seconds');
            // Force isAdmin check and navigation after a delay
            setTimeout(() => {
              // Refresh the page to get the updated admin status
              window.location.href = '/';
            }, 2000);
          }
        } 
        
        // Force a page reload after 3 seconds if we're still on the login page
        // This helps reset any stuck state
        setTimeout(() => {
          if (window.location.pathname.includes('/login')) {
            console.log('Still on login page after successful login, forcing refresh');
            window.location.reload();
          }
        }, 3000);
      }
    } catch (err) {
      console.error('Login error:', err);
      setFormError('An unexpected error occurred. Please try again.');
    } finally {
      // Clear the timeout to avoid memory leaks
      if (submitTimeoutRef.current) {
        window.clearTimeout(submitTimeoutRef.current);
        submitTimeoutRef.current = null;
      }
      setSubmitting(false);
    }
  };

  // Separate click handler for the button to ensure it triggers
  const handleButtonClick = (e: React.MouseEvent) => {
    console.log('Sign in button clicked');
    
    // Use native form submission to avoid React event issues
    if (formRef.current) {
      try {
        formRef.current.dispatchEvent(
          new Event('submit', { cancelable: true, bubbles: true })
        );
      } catch (err) {
        console.error('Error dispatching form event:', err);
        // Fallback - manually call handleSubmit
        handleSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  // Handle manually refreshing the session
  const handleRefreshSession = async () => {
    console.log('Manually refreshing session');
    setRefreshing(true);
    try {
      const success = await refreshSession();
      if (!success) {
        setFormError('Could not refresh session. Please log in again.');
      } else {
        setFormError(null);
        setDebugInfo(`Session refreshed successfully. Admin: ${isAdmin ? 'Yes' : 'No'}`);
      }
    } catch (err) {
      console.error('Error refreshing session:', err);
      setFormError('Error refreshing session. Please log in again.');
    } finally {
      setRefreshing(false);
    }
  };

  // Extended session info component
  const extendedSessionInfo = (
    <div className="mt-3 p-3 rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
      <div className="flex items-start text-sm text-blue-700 dark:text-blue-300">
        <Info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
        <div>
          <p>Secure session with automatic refresh.</p>
        </div>
      </div>
    </div>
  );
  
  // Debug info component
  const debugInfoComponent = debugInfo && (
    <div className="mt-3 p-3 rounded-md border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
      <div className="flex items-start text-sm text-yellow-700 dark:text-yellow-300">
        <Info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
        <div>
          <p>{debugInfo}</p>
        </div>
      </div>
    </div>
  );
  
  // Check if login is in progress
  const isLoggingIn = submitting || (loginAttempted && authLoading);

  // Check if we should show the debug panel
  const showDebugPanel = session && loginAttempted && (!isAdmin || formError?.includes('admin privileges'));

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 bg-card p-8 rounded-lg shadow-lg border border-border">
        <div className="text-center">
          <div className="mx-auto flex justify-center items-center w-14 h-14 rounded-full bg-primary/10 mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">Admin Login</h2>
          <p className="text-muted-foreground mt-1">Sign in to access the admin dashboard</p>
        </div>

        {/* Display submission errors */}
        {(formError) && (
          <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-sm border border-red-200 dark:border-red-800">
            <p className="flex items-start">
              <Lock className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              {formError}
            </p>
          </div>
        )}

        {/* Display successful login attempts that are still processing */}
        {loginAttempted && !formError && isLoggingIn && (
          <Alert>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            <AlertDescription>
              Authenticating and checking admin status...
            </AlertDescription>
          </Alert>
        )}

        {/* Display debug info */}
        {debugInfoComponent}

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6" id="login-form">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoggingIn}
              className="w-full"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <a href="#" className="text-sm text-primary hover:underline">
                Forgot password?
              </a>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoggingIn}
              className="w-full"
              autoComplete="current-password"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  console.log('Enter key pressed in password field');
                  formRef.current?.dispatchEvent(
                    new Event('submit', { cancelable: true, bubbles: true })
                  );
                }
              }}
            />
          </div>

          {/* Main sign in button */}
          <div className="relative">
            <Button 
              type="button" 
              className="w-full !cursor-pointer" 
              id="sign-in-button"
              onClick={handleButtonClick}
              disabled={isLoggingIn}
              aria-label="Sign in"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
            {extendedSessionInfo}
          </div>

          {/* Native HTML submit button (hidden but still in the form) */}
          <button 
            type="submit" 
            style={{ display: 'none' }}
            aria-hidden="true"
          >
            Submit
          </button>
        </form>

        {/* Session refresh button with extended info */}
        <div className="pt-4 text-center">
          <button
            type="button"
            onClick={handleRefreshSession}
            className="text-sm text-muted-foreground hover:text-primary flex items-center justify-center mx-auto"
            disabled={refreshing || isLoggingIn}
          >
            {refreshing ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Refresh session
          </button>
        </div>

        {/* Show debug panel if needed */}
        {showDebugPanel && <AdminDebugPanel />}
      </div>
    </div>
  );
};

export default Login; 