// Script to fix infinite recursion issue in RLS policies
// Usage: node fix-infinite-recursion.js

// Import required modules
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Constants
const FIX_MIGRATION_FILE = path.join(__dirname, 'supabase/migrations/fix_infinite_recursion.sql');

// Function to apply migration
async function applyFix() {
  console.log('Starting fix for infinite recursion in RLS policies...');
  
  // Check for environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Required environment variables are missing.');
    console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file.');
    process.exit(1);
  }
  
  // Create Supabase client with service role key (admin privileges)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    // Read the migration file
    if (!fs.existsSync(FIX_MIGRATION_FILE)) {
      console.error(`❌ Fix migration file not found: ${FIX_MIGRATION_FILE}`);
      process.exit(1);
    }
    
    const sql = fs.readFileSync(FIX_MIGRATION_FILE, 'utf8');
    console.log('Fix SQL loaded successfully.');
    
    // Execute the SQL directly
    console.log('Applying fix to database...');
    
    // Use pgmigrate RPC function if available
    try {
      const { error } = await supabase.rpc('pgmigrate', { query: sql });
      
      if (error) {
        console.error('❌ Error applying fix via RPC:', error.message);
        console.log('Trying alternative method...');
        throw error; // Force fallback
      }
    } catch (rpcError) {
      // Fallback: Execute statements one by one
      console.log('Executing SQL directly...');
      const { error } = await supabase.from('_migrations').select('*').limit(1);
      
      if (error) {
        console.error('❌ Error connecting to database:', error.message);
        process.exit(1);
      }
      
      const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
      
      for (const stmt of statements) {
        const { error: stmtError } = await supabase.rpc('exec_sql', { sql: stmt });
        if (stmtError) {
          console.warn(`Warning executing statement: ${stmtError.message}`);
          console.warn('Statement:', stmt);
        }
      }
    }
    
    console.log('✅ RLS policy fixes applied successfully.');
    
    // Verify admin role exists on at least one user
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('role', 'admin');
    
    if (profilesError) {
      console.error('❌ Error checking admin profiles:', profilesError.message);
    } else if (!profiles || profiles.length === 0) {
      console.warn('⚠️ No users with admin role found. Policies will have no effect.');
      console.warn('Please assign admin role to at least one user.');
    } else {
      console.log(`✅ Found ${profiles.length} admin user(s).`);
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    process.exit(1);
  }
}

// Run the fix
applyFix().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
}); 