// Admin Setup Helper Script
// Run this with: node admin-setup.js

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');
const fs = require('fs');
require('dotenv').config();

// Create readline interface for input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Get Supabase URL and key from .env or use fallbacks
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hgddybhgcawokycncvgn.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnZGR5YmhnY2F3b2t5Y25jdmduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3MDgwMDMsImV4cCI6MjA1NzI4NDAwM30.Ko6MkWyjM1BqBeQ6_uDRh-miW8KFHPWAMuIxFqj5sOY';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false
  }
});

// Initialize admin client if service key is available
const adminClient = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: true, persistSession: false }
    })
  : null;

async function promptForCredentials() {
  return new Promise((resolve) => {
    rl.question('Enter your email: ', (email) => {
      rl.question('Enter your password: ', (password) => {
        resolve({ email, password });
      });
    });
  });
}

async function checkConnection() {
  console.log('Testing connection to Supabase...');
  
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      console.error('❌ Connection error:', error.message);
      return false;
    }
    
    console.log('✅ Connection successful');
    return true;
  } catch (err) {
    console.error('❌ Connection error:', err.message);
    return false;
  }
}

async function testAuth(email, password) {
  console.log(`Testing authentication for ${email}...`);
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('❌ Authentication error:', error.message);
      return null;
    }
    
    console.log('✅ Authentication successful');
    return data;
  } catch (err) {
    console.error('❌ Authentication error:', err.message);
    return null;
  }
}

async function checkAdminRole(userId) {
  console.log(`Checking admin role for user ${userId}...`);
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('❌ Error checking profile:', error.message);
      return null;
    }
    
    console.log('Profile found:', data);
    
    if (data.role === 'admin') {
      console.log('✅ User has admin role');
      return true;
    } else {
      console.log('❌ User does not have admin role (current role:', data.role, ')');
      return false;
    }
  } catch (err) {
    console.error('❌ Error checking profile:', err.message);
    return null;
  }
}

async function setAdminRole(userId) {
  if (!adminClient) {
    console.log('⚠️ Cannot set admin role: No service role key available');
    console.log('Please add VITE_SUPABASE_SERVICE_ROLE_KEY to your .env file');
    return false;
  }
  
  console.log(`Setting admin role for user ${userId}...`);
  
  try {
    const { data, error } = await adminClient
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', userId);
    
    if (error) {
      console.error('❌ Error setting admin role:', error.message);
      return false;
    }
    
    console.log('✅ Admin role set successfully');
    return true;
  } catch (err) {
    console.error('❌ Error setting admin role:', err.message);
    return false;
  }
}

async function main() {
  console.log('==================================');
  console.log('Admin Setup Helper');
  console.log('==================================');
  
  // Check connection
  const connected = await checkConnection();
  if (!connected) {
    console.log('Please check your Supabase configuration in .env file');
    rl.close();
    return;
  }
  
  // Get credentials
  const { email, password } = await promptForCredentials();
  
  // Test authentication
  const authData = await testAuth(email, password);
  if (!authData || !authData.user) {
    console.log('Authentication failed. Please check your credentials.');
    rl.close();
    return;
  }
  
  const userId = authData.user.id;
  
  // Check admin role
  const isAdmin = await checkAdminRole(userId);
  
  if (isAdmin === null) {
    console.log('Could not check admin status. The profile may not exist.');
    
    // Ask if user wants to create profile
    rl.question('Do you want to try to create a profile with admin role? (y/n) ', async (answer) => {
      if (answer.toLowerCase() === 'y') {
        if (adminClient) {
          const { data, error } = await adminClient
            .from('profiles')
            .insert([{
              id: userId,
              email: email,
              role: 'admin',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]);
          
          if (error) {
            console.error('❌ Error creating profile:', error.message);
          } else {
            console.log('✅ Admin profile created successfully');
          }
        } else {
          console.log('⚠️ Cannot create profile: No service role key available');
        }
      }
      
      rl.close();
    });
    return;
  }
  
  if (isAdmin === false) {
    // Ask if user wants to set admin role
    rl.question('Do you want to set the admin role for this user? (y/n) ', async (answer) => {
      if (answer.toLowerCase() === 'y') {
        await setAdminRole(userId);
      }
      
      rl.close();
    });
    return;
  }
  
  console.log('==================================');
  console.log('✅ Your account is correctly set up as an admin');
  console.log('You should now be able to login to the admin dashboard');
  console.log('==================================');
  
  rl.close();
}

main().catch(err => {
  console.error('Unhandled error:', err);
  rl.close();
}); 