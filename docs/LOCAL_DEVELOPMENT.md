# Local Development Configuration

This document explains the local development configuration for the Modern Admin Suite, particularly regarding authentication and admin access.

## Bypassing Admin Verification for Local Testing

For easier local development and testing, admin verification has been bypassed in the following ways:

1. The `FORCE_ADMIN_ACCESS` flag in `src/lib/AuthContext.tsx` has been set to `true`. This forces all authenticated users to be treated as admins.

2. The `ProtectedRoute` component in `src/components/auth/ProtectedRoute.tsx` has been modified to allow access to protected routes as long as a user is authenticated, regardless of their admin status.

3. The `Login` component in `src/pages/Login.tsx` has been updated to redirect to the dashboard upon successful authentication, without checking for admin privileges.

4. A utility function `forceAdminAccessForTesting()` has been added to `src/lib/debugUtils.ts` that you can call from the browser console to force admin access during a session.

## Usage Notes

- These changes are intended for **local development only** and should not be deployed to production.
- When testing actual admin verification logic, you should set `FORCE_ADMIN_ACCESS` back to `false` in `src/lib/AuthContext.tsx`.
- You can still use the `debugAdminStatus()` function in the browser console to check your actual admin status.

## SQL Schema

The SQL schema related to admin login includes:

1. The `profiles` table with a `role` column that determines admin status.
2. Several SQL functions like `is_admin()`, `is_admin_direct()`, and `verify_admin_access()` that check if a user has admin privileges.
3. Row-Level Security (RLS) policies that use these functions to restrict access to data.

**Note**: Even though admin verification is bypassed in the frontend, the SQL schema for admin users remains unchanged.

## Restoring Admin Verification

To restore proper admin verification for production:

1. Set `FORCE_ADMIN_ACCESS` to `false` in `src/lib/AuthContext.tsx`
2. Revert the changes in `ProtectedRoute.tsx` to check for both authentication and admin status
3. Revert the changes in `Login.tsx` to only redirect admin users to the dashboard

## Database Changes

No database schema changes were made as part of bypassing admin verification. All SQL functions and tables remain intact to ensure compatibility with the production environment. 