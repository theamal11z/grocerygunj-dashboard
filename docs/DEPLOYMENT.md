# Deployment Guide for Modern Admin Suite

This guide provides instructions for deploying the Modern Admin Suite to production environments.

## Prerequisites

- Node.js 18.x or later
- npm 9.x or later
- Supabase account with a project set up
- Environment variables properly configured

## Pre-Deployment Checklist

Before deploying to production, ensure these important checks are completed:

### 1. Security Configuration

- [ ] `FORCE_ADMIN_ACCESS` is set to `false` in `src/lib/AuthContext.tsx`
- [ ] No hardcoded API keys or sensitive credentials in the codebase
- [ ] Service role key is only used for admin operations
- [ ] Environment variables are properly configured (see below)

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

## Environment Variables

Create a `.env` file in the root of the project with these variables:

```
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Authentication Configuration
VITE_AUTH_REMEMBER_SESSION=true
VITE_AUTH_SESSION_EXPIRY=604800 # 7 days in seconds

# App Configuration
VITE_APP_NAME="Modern Admin"
```

For admin operations (only required for servers that need to bypass RLS):

```
# IMPORTANT: Only set this in secure server environments, never in client-side code
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Building for Production

Run the following commands to build for production:

```bash
# Install dependencies
npm install

# Build for production
npm run build
```

The built files will be in the `dist` directory.

## Deployment Options

### Option 1: Static Site Hosting (Recommended)

You can deploy the built files to any static site hosting service:

- Netlify
- Vercel
- GitHub Pages
- Firebase Hosting
- Cloudflare Pages

Example deployment to Netlify:

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy to Netlify
netlify deploy --prod --dir=dist
```

### Option 2: Traditional Web Hosting

Upload the contents of the `dist` directory to your web server.

### Option 3: Docker Deployment

```bash
# Build Docker image
docker build -t modern-admin-suite .

# Run Docker container
docker run -p 80:80 modern-admin-suite
```

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