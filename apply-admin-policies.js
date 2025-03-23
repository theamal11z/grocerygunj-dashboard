// Script to apply admin RLS policies to the Supabase database
// Usage: node apply-admin-policies.js

// Import required modules
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Constants
const MIGRATION_FILE = path.join(__dirname, 'supabase/migrations/20250315025000_add_admin_rls_policies.sql');

// Function to apply migration
async function applyMigration() {
  console.log('Starting admin RLS policy migration application...');
  
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
    if (!fs.existsSync(MIGRATION_FILE)) {
      console.error(`❌ Migration file not found: ${MIGRATION_FILE}`);
      process.exit(1);
    }
    
    const sql = fs.readFileSync(MIGRATION_FILE, 'utf8');
    console.log('Migration SQL loaded successfully.');
    
    // Execute the SQL
    console.log('Applying migration to database...');
    const { error } = await supabase.rpc('pgmigrate', { query: sql });
    
    if (error) {
      console.error('❌ Error applying migration:', error.message);
      process.exit(1);
    }
    
    console.log('✅ Admin RLS policies applied successfully.');
    
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

// Run the migration
applyMigration().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
}); 