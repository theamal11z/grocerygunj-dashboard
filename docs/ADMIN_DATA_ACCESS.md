# Admin Data Access Guide

This document explains how to ensure admin users can view all data in the application, including user profiles, orders, wishlists, and other data from all users in the system.

## Problem: Admin Users Cannot See All Data

The issue occurs because of Row Level Security (RLS) policies in the Supabase database that restrict users to only seeing their own data. While these policies are essential for customer privacy, they can prevent administrators from properly managing the application.

### Two Ways to Solve This Problem

There are two ways to grant administrators access to all data:

1. **Service Role Key Method (Recommended)**: Use the Supabase service role key to bypass RLS for admin users
2. **Admin RLS Policies Method**: Add specific RLS policies that allow users with the admin role to see all data

We've implemented both approaches to ensure maximum flexibility.

## Method 1: Service Role Key Setup (Quick & Recommended)

We've updated the `DataContext.tsx` file to use the Supabase admin client with service role key when the current user has the admin role. This allows the admin to bypass RLS completely.

To enable this:

1. Log into your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to Project Settings > API
4. Find and copy the "service_role key" (This is different from the anon/public key!)
5. Open your `.env` file in the project root
6. Update the `VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-goes-here` line with your actual service role key
7. Restart your application

```bash
# .env file example
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

⚠️ **SECURITY WARNING**: The service role key has full access to your database, bypassing all RLS policies. Make sure this key is:
- Never exposed in client-side code in production
- Not checked into public repositories
- Properly secured in your deployment environment

## Method 2: Admin RLS Policies (Alternative)

We've created a migration file that adds admin-specific RLS policies to all tables. These policies allow users with the admin role to view all data.

This migration is in: `/supabase/migrations/20250315025000_add_admin_rls_policies.sql`

To apply these policies manually:

1. Log into your Supabase Dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of the migration file
4. Run the SQL

Alternatively, if using the Supabase CLI, you can run:

```bash
supabase db push
```

## Verifying Admin Access

After setting up either method:

1. Log in with an admin user
2. Navigate to the Users, Orders, and Wishlists pages
3. You should now see data from all users, not just your own

## Troubleshooting

If you're still not seeing all data:

1. **Check Admin Role**: Make sure your user has the admin role set in the profiles table
2. **Verify Service Role Key**: Ensure your service role key is correct and properly set in the .env file
3. **Inspect Console Logs**: Open the browser developer console and look for any error messages
4. **Check Browser Storage**: Clear your browser's local storage to ensure you're starting with a fresh session

## Understanding How It Works

The admin data access system works through these components:

1. **AuthContext.tsx**: Determines if a user has admin role by checking the profiles table
2. **DataContext.tsx**: Uses either the regular supabase client or the adminSupabase client based on the user's role
3. **RLS Policies**: Database policies that control what data each user can access

Remember that admin users should always be properly authenticated and authorized. The admin role should only be granted to trusted users who need full access to the application data. 