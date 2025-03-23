# Admin Access Troubleshooting Guide

This guide provides solutions for common admin access issues in the Modern Admin Suite.

## Understanding Admin Access

In the Modern Admin Suite, admin access is determined by the user's role in the `profiles` table. A user with the role set to `admin` has full administrative access to the dashboard.

## Common Issues

### 1. "You do not have admin privileges" Message

If you see this message after successfully logging in, it means your user account exists in the authentication system but doesn't have admin privileges in the `profiles` table.

### 2. Unable to Redirect After Login

If you're stuck on the login page even after a successful login, the admin verification process might be failing.

### 3. Profile Record Not Found

Sometimes a user might exist in the authentication system but not have a corresponding record in the `profiles` table.

## Built-in Troubleshooting Tools

### Browser Debugging Tools

When logged in but encountering admin access issues, the login page provides an **Admin Access Troubleshooter** panel with two options:

1. **Diagnose Admin Status**: Checks your current authentication status and admin role
2. **Fix Admin Access**: Attempts to set your role to 'admin' in the profiles table

### Command Line Tool

For server-side troubleshooting, use the provided script:

```bash
# Set required environment variables
export SUPABASE_URL=https://your-project-url.supabase.co
export SUPABASE_SERVICE_KEY=your-service-role-key

# Run the troubleshooting script
node scripts/fix-admin-access.js
```

This interactive tool allows you to:
- List all users in the system
- Check admin status for a specific user
- Grant admin access to a user
- List all admin users

## Manual Solutions

### Solution 1: Update User Role in Database

Run the following SQL query in the Supabase SQL editor:

```sql
-- Replace 'user@example.com' with the actual email
UPDATE profiles
SET role = 'admin'
FROM auth.users
WHERE profiles.id = auth.users.id
AND auth.users.email = 'user@example.com';

-- If the profile doesn't exist, create it
INSERT INTO profiles (id, role, email, created_at, updated_at)
SELECT id, 'admin', email, NOW(), NOW()
FROM auth.users
WHERE email = 'user@example.com'
AND NOT EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = auth.users.id
);
```

### Solution 2: Verify Email Consistency

Ensure the email in the `profiles` table matches the one in `auth.users`:

```sql
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id;
```

### Solution 3: Check Database Schema

If the `profiles` table doesn't have an `email` column, add it:

```sql
-- Add email column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email TEXT;
  END IF;
END $$;
```

## Security Considerations

- Never set `FORCE_ADMIN_ACCESS` to `true` in production environments
- Always use the service role key with caution
- Consider implementing more robust role-based access control for production

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Troubleshooting Profiles](https://supabase.com/docs/guides/auth/managing-user-data) 