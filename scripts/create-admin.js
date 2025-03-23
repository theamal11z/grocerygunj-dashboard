// Script to create an admin user
import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase URL and service role key
// WARNING: This script should only be run in a secure environment by authorized personnel
// The service role key has full access to your database without any RLS restrictions
const supabaseUrl = process.env.SUPABASE_URL || 'https://hgddybhgcawokycncvgn.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('This script must be run with admin privileges.');
  process.exit(1);
}

// Create a Supabase client with the service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// User information
const email = 'theamal11z@rex.com';
const password = '11pmatwork';
const userData = { email, password };

async function createAdminUser() {
  try {
    console.log(`Creating user with email: ${email}`);
    
    // Step 1: Check if user already exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      throw new Error(`Error checking existing users: ${listError.message}`);
    }
    
    const existingUser = existingUsers.users.find(u => u.email === email);
    
    let userId;
    
    if (existingUser) {
      console.log(`User already exists with ID: ${existingUser.id}`);
      userId = existingUser.id;
      
      // Update the user's password if they already exist
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        { password }
      );
      
      if (updateError) {
        throw new Error(`Error updating user password: ${updateError.message}`);
      }
      
      console.log('User password updated successfully');
    } else {
      // Create a new user
      const { data, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
      });
      
      if (createError) {
        throw new Error(`Error creating user: ${createError.message}`);
      }
      
      console.log(`User created successfully with ID: ${data.user.id}`);
      userId = data.user.id;
    }
    
    // Step 2: Check if profile exists and set admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
      throw new Error(`Error checking profile: ${profileError.message}`);
    }
    
    if (profile) {
      // Update existing profile
      console.log('Updating existing profile to admin role');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'admin', updated_at: new Date() })
        .eq('id', userId);
      
      if (updateError) {
        throw new Error(`Error updating profile role: ${updateError.message}`);
      }
    } else {
      // Create new profile
      console.log('Creating new profile with admin role');
      const { error: insertError } = await supabase
        .from('profiles')
        .insert([
          { 
            id: userId, 
            role: 'admin',
            created_at: new Date(),
            updated_at: new Date()
          }
        ]);
      
      if (insertError) {
        throw new Error(`Error creating profile: ${insertError.message}`);
      }
    }
    
    console.log('SUCCESS: Admin user created successfully');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('You can now log in with these credentials');
    
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
}

createAdminUser(); 