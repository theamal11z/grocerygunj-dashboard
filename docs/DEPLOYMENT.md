# Deployment Guide

This application is a React/TypeScript admin dashboard built with:
- Vite for building
- ShadcnUI for components
- Supabase for backend
- TanStack Query for data fetching

## Build Commands
```bash
npm run build
```

## Environment Variables
Ensure these are set in production:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_API_URL

## Pre-Deployment Checklist
Before deploying to production, ensure these important checks are completed:

### 1. Security Configuration

- [ ] `FORCE_ADMIN_ACCESS` is set to `false` in `src/lib/AuthContext.tsx`
- [ ] No hardcoded API keys or sensitive credentials in the codebase
- [ ] Service role key is only used for admin operations
- [ ] Environment variables are properly configured (see above)

### 2. Database Migration

- [ ] Run migrations in a staging environment first
- [ ] Verify all tables and functions are created correctly
- [ ] Test admin user creation and access
- [ ] Confirm notifications and other features work with the correct field names

### 3. Build Testing

- [ ] Run a production build locally
- [ ] Test all features in the production build
- [ ] Verify authentication flows
- [ ] Check admin privileges and access control

## Deployment Options

You can deploy the built files to any static site hosting service such as Netlify, Vercel, GitHub Pages, Firebase Hosting, or Cloudflare Pages.  For more advanced deployments, consider using Docker.  Refer to the original documentation for more detailed instructions.


## Setting Up Admin Users

After deployment, follow these steps to create your first admin user:

1. Register a new user through the application
2. Connect to your Supabase project
3. Update the user's role in the profiles table:

```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'your-admin-email@example.com';
```

## Security Headers

For production deployments, configure these security headers:

```
Content-Security-Policy: default-src 'self'; connect-src 'self' https://*.supabase.co; img-src 'self' data: https://*.unsplash.com https://*.supabase.co; style-src 'self' 'unsafe-inline';
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## Troubleshooting

### Authentication Issues

If users cannot log in:
- Verify Supabase URL and anon key are correct
- Check that the profiles table has the correct structure
- Confirm RLS policies are properly configured

### Admin Access Issues

If admin users cannot access admin features:
- Verify the user's role is set to 'admin' in the profiles table
- Check that `FORCE_ADMIN_ACCESS` is set to `false`
- Confirm admin RLS policies are properly applied

### Database Connection Issues

If the application cannot connect to the database:
- Verify environment variables are correctly set
- Check Supabase project status
- Confirm network connectivity to Supabase

## Monitoring and Maintenance

- Set up error monitoring with a service like Sentry
- Configure performance monitoring
- Regularly backup your Supabase database
- Keep dependencies updated with `npm audit` and `npm update`