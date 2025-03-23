# Modern Admin Dashboard

A modern, responsive admin dashboard built with React, TypeScript, and Supabase.

## Features

- Secure admin authentication
- Dashboard with key metrics
- Product, category, order, and offer management
- Modern UI with responsive design
- Type-safe development with TypeScript
- Supabase integration for backend services

## Development Mode

For local development, admin authentication verification has been bypassed to make testing easier. See [Local Development Configuration](docs/LOCAL_DEVELOPMENT.md) for details on how this works and how to restore proper admin verification for production.

## Admin Authentication System

The admin dashboard is secured with a comprehensive authentication system:

### Security Features

- Email and password-based authentication
- Role-based access control (admin role required)
- Protected routes for authorized access only
- Session management
- Secure token handling
- Logout functionality

### Setting Up Admin Users

1. **Create an Admin User in Supabase**:
   - Navigate to your Supabase dashboard > Authentication > Users
   - Create a new user with email and password authentication
   - Set the user's role to 'admin' in the user metadata
   - Or update the 'role' field in the 'profiles' table to 'admin'

2. **Environment Configuration**:
   - Configure authentication settings in the `.env` file
   - Set `VITE_AUTH_REMEMBER_SESSION` to control session persistence
   - Set `VITE_AUTH_SESSION_EXPIRY` to define session duration

3. **Security Note**:
   - No default or emergency login credentials are present in the system
   - All users must be properly authenticated with valid credentials
   - Only users with the 'admin' role can access the dashboard

### Authentication Flow

1. User navigates to `/login`
2. User enters their admin credentials
3. System validates credentials against Supabase auth
4. System checks if user has the 'admin' role
5. If authenticated as admin, user is redirected to the dashboard
6. If not admin, access is denied with an error message
7. Protected routes redirect unauthenticated users to login

### RLS Policies

The application leverages Supabase Row-Level Security (RLS) policies for data protection:

- Products are viewable by authenticated users
- Orders are only viewable by the users who created them or admin users
- Offers can be created, updated, and deleted only by admins

To bypass RLS for admin users, you can add a service role key to the `.env` file:
```
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Warning**: Never expose the service role key in client-side code in a production environment.

## Running the Application

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables in `.env`
4. Run the development server: `npm run dev`
5. Visit the login page at `/login`

## License

This project is licensed under the MIT License.

## Real Data Implementation

The application now fetches real data from the Supabase database for all screens. This includes:

- Users management (profiles)
- Products and categories
- Orders and order items
- Wishlists
- Settings
- Notifications
- Payment methods
- Addresses and more

## Database Migrations

To set up your database with the latest schema:

1. Make sure you have the Supabase CLI installed:
   ```bash
   npm install -g supabase
   ```

2. Log in to your Supabase account:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. Apply the refactored migrations:
   ```bash
   cd supabase/newmigration
   for file in $(ls -v *.sql); do psql YOUR_SUPABASE_CONNECTION_STRING -f "$file"; done
   ```

The refactored migration files in `supabase/newmigration` provide a more organized approach:

1. `01_schema_setup.sql` - Core tables and basic RLS policies
2. `02_features.sql` - Extended features (offers, cart, notifications)
3. `03_admin_policies.sql` - Admin-specific policies for all tables
4. `04_storage_and_settings.sql` - Storage buckets and app settings
5. `05_seed_data.sql` - Sample data for categories, products, offers, and admin users
6. `06_fix_recursion_issues.sql` - Fixes for infinite recursion in RLS policies
7. `07_admin_seeding.sql` - Admin user utilities and verification

These files should be applied in sequential order to ensure proper dependency resolution.

### Data Context

The application uses a central DataContext provider that fetches and manages all data from the Supabase database. This context is used throughout the application to provide real-time data to all components.

To refresh data manually, you can call:

```tsx
const { refreshData } = useData();
// ... later in your code
await refreshData();
```

## Documentation

- [Admin Authentication System](docs/ADMIN_AUTH.md) - Details on the authentication flow, roles, and security
- [Admin Data Access Guide](docs/ADMIN_DATA_ACCESS.md) - How to configure admin access to all data in the system
- [Component Architecture](docs/COMPONENT_ARCHITECTURE.md) - Overview of the component structure
- [Deployment Guide](docs/DEPLOYMENT.md) - Instructions for deploying the application.
- [Database Migrations](docs/MIGRATIONS.md) - Information about database schema and migrations.
- [Admin Access Troubleshooting](docs/ADMIN-ACCESS.md) - Guide for resolving admin access issues.
