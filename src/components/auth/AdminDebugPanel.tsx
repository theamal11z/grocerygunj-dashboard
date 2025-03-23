import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { debugAdminStatus, fixAdminStatus } from '@/lib/debugUtils';
import { Loader2, Bug, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

interface DebugResult {
  success: boolean;
  isAdmin?: boolean;
  message?: string;
  profile?: any;
  error?: any;
}

export function AdminDebugPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [result, setResult] = useState<DebugResult | null>(null);
  const { refreshSession } = useAuth();

  const runDiagnostic = async () => {
    setIsRunning(true);
    setResult(null);
    
    try {
      const debugResult = await debugAdminStatus();
      setResult(debugResult as DebugResult);
    } catch (error) {
      setResult({
        success: false,
        error: error
      });
    } finally {
      setIsRunning(false);
    }
  };

  const runFix = async () => {
    setIsFixing(true);
    setResult(null);
    
    try {
      const fixResult = await fixAdminStatus();
      setResult(fixResult as DebugResult);
      
      if (fixResult.success) {
        // Refresh session to apply the changes
        await refreshSession();
      }
    } catch (error) {
      setResult({
        success: false,
        error: error
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 mt-4 max-w-xl">
      <div className="flex items-center space-x-2 mb-4">
        <Bug className="h-5 w-5 text-amber-500" />
        <h3 className="text-lg font-medium">Admin Access Troubleshooter</h3>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        If you're having trouble accessing the admin panel, use these tools to diagnose and fix issues.
      </p>
      
      <div className="flex flex-col gap-3">
        <Button 
          variant="outline" 
          onClick={runDiagnostic} 
          disabled={isRunning || isFixing}
          className="flex justify-start"
        >
          {isRunning ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Bug className="h-4 w-4 mr-2" />
          )}
          Diagnose Admin Status
        </Button>
        
        <Button
          variant="outline"
          onClick={runFix}
          disabled={isRunning || isFixing}
          className="flex justify-start"
        >
          {isFixing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <AlertTriangle className="h-4 w-4 mr-2" />
          )}
          Fix Admin Access
        </Button>
      </div>
      
      {result && (
        <div className={`mt-4 p-3 rounded-md border ${
          result.success 
            ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800" 
            : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
        }`}>
          <div className="flex items-start gap-2">
            {result.success ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            )}
            
            <div className="text-sm">
              <p className={result.success ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}>
                {result.success ? 'Diagnosis complete' : 'Error encountered'}
              </p>
              
              {result.message && (
                <p className="mt-1">{result.message}</p>
              )}
              
              {result.isAdmin !== undefined && (
                <p className="mt-1">
                  Admin status: <span className={result.isAdmin ? "font-medium text-green-600 dark:text-green-400" : "font-medium text-red-600 dark:text-red-400"}>
                    {result.isAdmin ? 'Yes' : 'No'}
                  </span>
                </p>
              )}
              
              {result.error && (
                <p className="mt-1 text-red-600 dark:text-red-400">
                  {typeof result.error === 'string' 
                    ? result.error 
                    : result.error.message || 'An unknown error occurred'}
                </p>
              )}
              
              {result.success && result.isAdmin && (
                <p className="mt-2">You have admin access. Try refreshing the page or logging in again.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 