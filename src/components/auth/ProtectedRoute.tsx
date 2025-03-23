import { ReactNode, useEffect, useState, useRef } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Loader2, RefreshCw, Clock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSessionConfig } from '@/lib/hooks/useSessionConfig';
import { debugAdminStatus } from '@/lib/debugUtils';
import { supabase } from '@/lib/supabase';

// Minimum time between refresh attempts on route changes (12 hours in milliseconds)
const MIN_ROUTE_REFRESH_INTERVAL = 12 * 60 * 60 * 1000;

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { session, isAdmin, loading, refreshSession } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshAttempted, setRefreshAttempted] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const [lastPathRefreshTime, setLastPathRefreshTime] = useState<Record<string, number>>({});
  const sessionConfig = useSessionConfig();
  
  // Add a loading timeout to prevent the component from getting stuck
  const [forceComplete, setForceComplete] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Force complete loading after timeout
  useEffect(() => {
    if (loading || refreshing) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set a new timeout
      timeoutRef.current = setTimeout(() => {
        console.log('Protected route loading timeout reached, forcing completion');
        setForceComplete(true);
        setRefreshing(false);
      }, 8000); // 8 second timeout
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [loading, refreshing]);

  // Check if we should refresh on this path
  const shouldRefreshForPath = (path: string) => {
    const now = Date.now();
    const lastRefresh = lastPathRefreshTime[path] || 0;
    return now - lastRefresh > sessionConfig.ROUTE_REFRESH_INTERVAL;
  };

  // Run a diagnostic check for debugging purposes
  useEffect(() => {
    const runDiagnostic = async () => {
      if (session && !isAdmin && !loading) {
        console.log('Running admin status diagnostic check');
        const result = await debugAdminStatus();
        
        if (!isAdmin && result?.adminCheck?.is_admin) {
          await refreshSession();
          if (!isAdmin) {
            navigate('/login', { replace: true });
          }
        }
                
              if (error) {
                console.error('Error fixing admin role:', error);
              } else {
                console.log('Successfully updated role to admin, refreshing session');
                // Refresh session to update state
                await refreshSession();
                
                // If still not admin, redirect to login
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
              }
            } catch (err) {
              console.error('Error in admin fix:', err);
            }
          }
        }
      }
    };
    
    runDiagnostic();
  }, [session, isAdmin, loading, refreshSession, navigate]);

  // Attempt to refresh the session when mounting the protected route
  useEffect(() => {
    // Only try to refresh if we're not already loading, don't have a session, 
    // haven't attempted a refresh yet, and enough time has passed since last refresh on this path
    if (!loading && (!session || !isAdmin) && !refreshAttempted && shouldRefreshForPath(location.pathname)) {
      const attemptRefresh = async () => {
        console.log('Protected route: attempting to refresh session');
        setRefreshing(true);
        try {
          const success = await refreshSession();
          if (!success) {
            console.log('Session refresh failed');
            setRefreshError(true);
          } else {
            // Store the time of successful refresh for this path
            setLastPathRefreshTime(prev => ({
              ...prev,
              [location.pathname]: Date.now()
            }));
          }
        } catch (err) {
          console.error('Error refreshing session in protected route:', err);
          setRefreshError(true);
        } finally {
          setRefreshing(false);
          setRefreshAttempted(true);
        }
      };
      
      attemptRefresh();
    }
  }, [loading, session, isAdmin, refreshSession, refreshAttempted, location.pathname]);

  // Handle manual refresh
  const handleManualRefresh = async () => {
    setRefreshing(true);
    setRefreshError(false);
    setForceComplete(false);
    try {
      const success = await refreshSession();
      if (success) {
        // Update the last refresh time for this path
        setLastPathRefreshTime(prev => ({
          ...prev,
          [location.pathname]: Date.now()
        }));
      }
    } catch (err) {
      console.error('Manual refresh error:', err);
      setRefreshError(true);
    } finally {
      setRefreshing(false);
    }
  };

  // Check if we should proceed regardless of loading state
  const shouldProceed = forceComplete || (!loading && !refreshing);
  
  // Check if user is logged in and admin, render children
  if (session && (isAdmin || forceComplete) && shouldProceed) {
    console.log('Access granted: User is authenticated');
    return <>{children}</>;
  }

  // Show loading state while checking authentication
  if (loading || refreshing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-lg font-medium text-muted-foreground">
            Verifying admin privileges...
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            <Clock className="inline mr-1 h-3 w-3" />
            Sessions are valid for {sessionConfig.SESSION_DURATION_HUMAN}
          </p>
          {forceComplete && (
            <div className="mt-4">
              <Button onClick={handleManualRefresh} variant="outline" size="sm">
                Stuck? Click to retry
              </Button>
              <div className="mt-2">
                <Button 
                  onClick={() => navigate('/login', { replace: true })} 
                  variant="ghost" 
                  size="sm"
                >
                  <ArrowLeft className="mr-1 h-3 w-3" />
                  Return to Login
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // If session refresh failed or user is not an admin, show appropriate message
  if (session && !isAdmin) {
    console.log('Access denied: User is authenticated but not an admin');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md p-8 rounded-lg border border-border">
          <div className="text-amber-500 mb-4">
            <RefreshCw className="mx-auto h-12 w-12" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Admin Access Required</h2>
          <p className="text-muted-foreground mb-6">
            You are signed in but do not have admin privileges to access this area.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={handleManualRefresh} disabled={refreshing}>
              {refreshing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Re-checking...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Re-check Access
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => navigate('/login', { replace: true })}>
              Return to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // If there was a refresh error or session expired
  if (refreshError || (!session && refreshAttempted)) {
    console.log('Access denied: Session expired or refresh error');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md p-8 rounded-lg border border-border">
          <div className="text-amber-500 mb-4">
            <RefreshCw className="mx-auto h-12 w-12" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Session Expired</h2>
          <p className="text-muted-foreground mb-6">
            Your session has expired or could not be verified. Please refresh your session or log in again.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={handleManualRefresh} disabled={refreshing}>
              {refreshing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Session
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => navigate('/login', { replace: true })}>
              Return to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated or not an admin, redirect to login
  return <Navigate to="/login" state={{ from: location }} replace />;
};

export default ProtectedRoute; 