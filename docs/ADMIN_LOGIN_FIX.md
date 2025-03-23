# Admin Login Issue Fixes

This guide addresses issues where admin users are unable to log in or authenticate properly despite having the correct credentials.

## Changes Already Made

We've made several improvements to the codebase to address authentication issues:

1. **Enhanced `AuthContext.tsx`**:
   - Improved admin role checking
   - Added automatic profile creation if missing
   - Better error handling and debugging logs
   - Fixed session management issues

2. **Improved `Login.tsx`**:
   - Added debugging information display
   - Enhanced error handling
   - Added forced redirect after successful login
   - Fixed form submission issues

3. **Created `seed_admin_user.sql`**:
   - SQL script to ensure admin users exist
   - Automatically sets the role column if missing
   - Updates existing users to admin role for testing

4. **Ensured Service Role Key Configuration**:
   - The `.env` file has been updated with the service role key line ready for your key

## Steps to Fix Admin Login

Follow these steps to ensure admin login works properly:

### 1. Add Your Supabase Service Role Key

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to Project Settings > API
4. Copy the "service_role key" (NOT the anon key)
5. Open your `.env` file in the project root
6. Update the `VITE_SUPABASE_SERVICE_ROLE_KEY` line with your actual key
7. Restart your development server

```
VITE_SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key
```

### 2. Run the Admin User SQL Script

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to the SQL Editor
4. Copy and paste the contents of `/supabase/seed_admin_user.sql`
5. Run the SQL script

This will:
- Ensure the `role` column exists in the profiles table
- Create or update an admin user in the profiles table
- Set all existing users to have the admin role for testing

### 3. Apply the Admin RLS Policies

To ensure admins can view all data, run the RLS policy migrations:

1. In your Supabase SQL Editor, paste and run the contents of:
   `/supabase/migrations/20250315025000_add_admin_rls_policies.sql`

This adds policies allowing admins to view all data in the database.

### 4. Clear Local Storage

Sometimes cached authentication information can cause issues:

1. Open your browser's developer tools (F12)
2. Go to Application > Storage > Local Storage
3. Find and clear the entry for your site or `admin-suite-auth`
4. Refresh the page

### 5. Log In with Test Account

For testing, use:
- Email: `admin@example.com`
- Password: `adminpassword`

Or use the account you created during Supabase setup.

## Troubleshooting

If you're still experiencing issues:

### Check Console Logs

1. Open browser developer tools (F12)
2. Go to the Console tab
3. Look for any error messages during login

### Verify Profiles Table

Run this SQL in the Supabase SQL Editor:

```sql
SELECT * FROM profiles;
```

Ensure:
- Your admin user exists
- The `role` column is set to `'admin'`

### Check Authentication in Supabase

1. Go to Authentication > Users in your Supabase dashboard
2. Verify your admin user exists and is not disabled

### Test with a New Admin User

If needed, create a new admin user with:

```sql
-- Create auth user (replace with your desired email/password)
SELECT supabase_auth.create_user(
  '{
    "email": "newadmin@example.com",
    "password": "newadminpassword",
    "email_confirm": true,
    "user_metadata": {"role": "admin"}
  }'::jsonb
);

-- Ensure profile exists with admin role
INSERT INTO profiles (id, email, full_name, role, created_at, updated_at)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'newadmin@example.com'),
  'newadmin@example.com',
  'New Admin User',
  'admin',
  NOW(),
  NOW()
)
ON CONFLICT (id) 
DO UPDATE SET 
  role = 'admin',
  updated_at = NOW();
```

## What's Happening Behind the Scenes

The admin login issues were likely caused by:

1. **Missing Profile Records**: The trigger to create profiles for new auth users might not be functioning correctly.

2. **Missing Role Column**: The `role` column might be missing or not set properly to 'admin'.

3. **RLS Policy Issues**: Row Level Security policies were preventing admins from accessing data.

4. **Missing Service Role Key**: Without this key, the admin client can't bypass RLS.

5. **Session Management Problems**: Session creation or validation issues in the authentication flow.

The changes we've made address all these potential causes, ensuring admin users can log in and access the dashboard properly.

## Still Having Issues?

If you're still experiencing problems after following all these steps, check the browser console for specific error messages and consider:

1. Restarting the Supabase local development server
2. Restarting your application development server
3. Checking network requests in the developer tools for specific API errors

Feel free to reach out for further assistance if needed. 