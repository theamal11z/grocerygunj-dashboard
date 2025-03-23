#!/usr/bin/env node

/**
 * Admin Access Troubleshooter
 * 
 * This script helps diagnose and fix admin access issues in the Modern Admin Suite.
 * 
 * Usage:
 *   node scripts/fix-admin-access.js
 * 
 * Required environment variables:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SERVICE_KEY - Your Supabase service role key (NOT the anon key)
 */

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Helper function to ask questions
function question(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

// Initialize Supabase client
function initializeSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error(`${colors.red}${colors.bold}Error:${colors.reset} Missing environment variables.`);
    console.error(`Please set ${colors.yellow}SUPABASE_URL${colors.reset} and ${colors.yellow}SUPABASE_SERVICE_KEY${colors.reset}`);
    console.error(`These can be found in your Supabase dashboard under Project Settings > API`);
    process.exit(1);
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// Main function
async function main() {
  console.log(`\n${colors.bold}${colors.cyan}Modern Admin Suite - Admin Access Troubleshooter${colors.reset}\n`);
  
  try {
    const supabase = initializeSupabase();
    
    console.log(`${colors.blue}Connecting to Supabase...${colors.reset}`);
    
    // Check connection by listing users
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error(`${colors.red}${colors.bold}Error connecting to Supabase:${colors.reset}`, userError.message);
      console.error(`Make sure your ${colors.yellow}SUPABASE_SERVICE_KEY${colors.reset} has admin permissions.`);
      process.exit(1);
    }
    
    console.log(`${colors.green}Connected successfully!${colors.reset}`);
    console.log(`Found ${users.users.length} users in the system.\n`);
    
    // Show options
    console.log(`${colors.bold}Available Actions:${colors.reset}`);
    console.log(`${colors.yellow}1.${colors.reset} List all users`);
    console.log(`${colors.yellow}2.${colors.reset} Check admin status for a user (by email)`);
    console.log(`${colors.yellow}3.${colors.reset} Grant admin access to a user (by email)`);
    console.log(`${colors.yellow}4.${colors.reset} List all admin users`);
    console.log(`${colors.yellow}5.${colors.reset} Exit\n`);
    
    const choice = await question(`${colors.blue}Enter your choice (1-5):${colors.reset} `);
    
    switch (choice.trim()) {
      case '1': // List all users
        console.log(`\n${colors.bold}All Users:${colors.reset}`);
        users.users.forEach((user, index) => {
          console.log(`${index + 1}. ${colors.cyan}${user.email}${colors.reset} (ID: ${user.id})`);
        });
        break;
        
      case '2': // Check admin status
        const checkEmail = await question(`\nEnter the email address to check: `);
        const userId = users.users.find(u => u.email.toLowerCase() === checkEmail.toLowerCase())?.id;
        
        if (!userId) {
          console.error(`\n${colors.red}User not found with email: ${checkEmail}${colors.reset}`);
          break;
        }
        
        const { data: adminStatus, error: statusError } = await supabase.rpc('verify_admin_access', {
          user_id: userId
        });
        
        if (statusError) {
          console.error(`\n${colors.red}Error checking admin status:${colors.reset}`, statusError.message);
          break;
        }
        
        if (!adminStatus || adminStatus.length === 0) {
          console.log(`\n${colors.yellow}Unable to verify admin status${colors.reset}`);
          break;
        }
        
        const status = adminStatus[0];
        console.log(`\n${colors.bold}Admin Status for ${checkEmail}:${colors.reset}`);
        console.log(`User exists: ${status.user_exists ? colors.green + 'Yes' + colors.reset : colors.red + 'No' + colors.reset}`);
        console.log(`Admin role: ${status.is_admin ? colors.green + 'Yes' + colors.reset : colors.red + 'No' + colors.reset}`);
        console.log(`Role: ${status.user_role || 'None'}`);
        console.log(`Email in auth.users: ${status.email || 'None'}`);
        console.log(`Email in profiles: ${status.email_in_profile || 'None'}`);
        break;
        
      case '3': // Grant admin access
        const grantEmail = await question(`\nEnter the email address to grant admin access: `);
        const user = users.users.find(u => u.email.toLowerCase() === grantEmail.toLowerCase());
        
        if (!user) {
          console.error(`\n${colors.red}User not found with email: ${grantEmail}${colors.reset}`);
          break;
        }
        
        const confirm = await question(`\nAre you sure you want to grant admin access to ${colors.cyan}${grantEmail}${colors.reset}? (y/n): `);
        
        if (confirm.toLowerCase() !== 'y') {
          console.log(`\n${colors.yellow}Operation cancelled.${colors.reset}`);
          break;
        }
        
        const { data: granted, error: grantError } = await supabase.rpc('grant_admin_access', {
          target_email: grantEmail
        });
        
        if (grantError) {
          console.error(`\n${colors.red}Error granting admin access:${colors.reset}`, grantError.message);
          break;
        }
        
        if (granted) {
          console.log(`\n${colors.green}${colors.bold}Successfully granted admin access to ${grantEmail}${colors.reset}`);
        } else {
          console.log(`\n${colors.red}Failed to grant admin access.${colors.reset}`);
        }
        break;
        
      case '4': // List admin users
        const { data: adminUsers, error: adminError } = await supabase.rpc('list_admin_users');
        
        if (adminError) {
          console.error(`\n${colors.red}Error listing admin users:${colors.reset}`, adminError.message);
          break;
        }
        
        if (!adminUsers || adminUsers.length === 0) {
          console.log(`\n${colors.yellow}No admin users found${colors.reset}`);
          break;
        }
        
        console.log(`\n${colors.bold}Admin Users:${colors.reset}`);
        adminUsers.forEach((admin, index) => {
          console.log(`${index + 1}. ${colors.cyan}${admin.email}${colors.reset} (${admin.full_name || 'Unnamed'})`);
          if (admin.profile_email && admin.profile_email !== admin.email) {
            console.log(`   ${colors.yellow}Warning:${colors.reset} Email mismatch in profile: ${admin.profile_email}`);
          }
        });
        break;
        
      case '5': // Exit
        console.log(`\n${colors.green}Exiting. Goodbye!${colors.reset}`);
        break;
        
      default:
        console.log(`\n${colors.red}Invalid choice. Please enter a number between 1 and 5.${colors.reset}`);
    }
  } catch (error) {
    console.error(`\n${colors.red}${colors.bold}Unexpected error:${colors.reset}`, error.message);
  } finally {
    rl.close();
  }
}

// Run the script
main(); 