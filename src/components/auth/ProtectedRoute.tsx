import { ReactNode, useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useSessionConfig } from "@/lib/hooks/useSessionConfig";
import { Loader2, RefreshCw, Clock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

  const [forceComplete, setForceComplete] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (loading || refreshing) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        console.log('Protected route loading timeout reached, forcing completion');
        setForceComplete(true);
        setRefreshing(false);
      }, 8000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [loading, refreshing]);

  const runDiagnostic = async () => {
    try {
      if (!session || !isAdmin) {
        const result = await refreshSession();
        if (result.error) {
          console.error('Session refresh failed:', result.error);
          setRefreshError(true);
          setRefreshing(false);
          return;
        }

        if (result.success) {
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      }
    } catch (err) {
      console.error('Error in admin fix:', err);
      setRefreshError(true);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    runDiagnostic();
  }, [session, isAdmin, refreshSession]);


  const handleManualRefresh = async () => {
    setRefreshing(true);
    setRefreshError(false);
    setForceComplete(false);
    try {
      const success = await refreshSession();
      if (success) {
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

  if (session && isAdmin) {
    return <>{children}</>;
  }

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

  return <Navigate to="/login" state={{ from: location }} replace />;
};

export default ProtectedRoute;