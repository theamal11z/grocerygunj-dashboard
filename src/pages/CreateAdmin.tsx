import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, UserCheck, Lock, Key, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// This page is for development purposes only
const DEV_MODE = import.meta.env.DEV || false;

const CreateAdmin = () => {
  const [email, setEmail] = useState('theamal11z@rex.com');
  const [password, setPassword] = useState('11pmatwork');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    userId?: string;
  } | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!DEV_MODE) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'This feature is only available in development mode'
      });
      return;
    }
    
    setLoading(true);
    setResult(null);
    
    try {
      // Step 1: Create or get user
      let userId: string;
      
      // First try to create the user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          // User already exists, try to sign in to get the user ID
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (signInError) {
            throw new Error(`Error signing in as existing user: ${signInError.message}`);
          }
          
          userId = signInData.user.id;
          console.log('User already exists, signed in to get ID:', userId);
        } else {
          throw new Error(`Error creating user: ${signUpError.message}`);
        }
      } else {
        userId = signUpData.user?.id;
        console.log('New user created with ID:', userId);
        
        if (!userId) {
          throw new Error('User creation succeeded but no user ID was returned');
        }
      }
      
      // Step 2: Set user role to admin in profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (profileError && !profileError.message.includes('No rows found')) {
        throw new Error(`Error checking profile: ${profileError.message}`);
      }
      
      if (profileData) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role: 'admin' })
          .eq('id', userId);
        
        if (updateError) {
          throw new Error(`Error updating profile: ${updateError.message}`);
        }
        
        console.log('Existing profile updated to admin role');
      } else {
        // Create new profile (this is usually handled by database triggers,
        // but we'll handle it explicitly here as a fallback)
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([{ id: userId, role: 'admin' }]);
        
        if (insertError) {
          throw new Error(`Error creating profile: ${insertError.message}`);
        }
        
        console.log('New profile created with admin role');
      }
      
      setResult({
        success: true,
        message: 'Admin user created successfully!',
        userId,
      });
      
      toast({
        title: 'Success',
        description: 'Admin user created successfully!'
      });
    } catch (error) {
      console.error('Error:', error);
      setResult({
        success: false,
        message: error.message || 'An unexpected error occurred',
      });
      
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'An unexpected error occurred'
      });
    } finally {
      setLoading(false);
    }
  };
  
  if (!DEV_MODE) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-lg">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            This page is only available in development mode.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 bg-card p-8 rounded-lg shadow-lg border border-border">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Create Admin User</h1>
          <p className="text-muted-foreground">
            This tool is for development purposes only.
          </p>
          
          <div className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Development Mode Only
          </div>
        </div>
        
        {result && (
          <Alert variant={result.success ? "default" : "destructive"}>
            {result.success ? <UserCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <AlertTitle>{result.success ? "Success" : "Error"}</AlertTitle>
            <AlertDescription>
              {result.message}
              {result.userId && (
                <p className="mt-2 text-xs">User ID: {result.userId}</p>
              )}
            </AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@example.com"
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Strong password"
              disabled={loading}
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Admin...
              </>
            ) : (
              <>
                <Key className="mr-2 h-4 w-4" />
                Create Admin User
              </>
            )}
          </Button>
        </form>
        
        <div className="text-center text-xs text-muted-foreground mt-4">
          <p>This tool creates a user with admin privileges.</p>
          <p>Use it only in development environments.</p>
        </div>
      </div>
    </div>
  );
};

export default CreateAdmin; 