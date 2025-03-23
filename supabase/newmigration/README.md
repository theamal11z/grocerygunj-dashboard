# Refactored SQL Schema for Modern Admin Suite

This directory contains the refactored SQL schema files for the Modern Admin Suite application. The schema has been reorganized into logical groups to improve maintainability and clarity.

## Migration Files

The schema is divided into the following files:

1. **01_schema_setup.sql**
   - Core database tables and their structure
   - Basic Row Level Security (RLS) policies
   - Base user-level access control
   - Database indexes for performance

2. **02_features.sql**
   - Offers and discounts system
   - Shopping cart functionality
   - Order notification functions
   - Update triggers for timestamps

3. **03_admin_policies.sql**
   - Admin-specific RLS policies for all tables
   - Admin-level access control
   - Special admin utilities

4. **04_storage_and_settings.sql**
   - Storage buckets for file uploads
   - Storage permissions and policies
   - Settings table and configuration
   - Application settings functions

5. **05_seed_data.sql**
   - Sample data for testing
   - Categories, products, and offers
   - Admin user setup

6. **06_fix_recursion_issues.sql**
   - Fixes for infinite recursion in RLS policies
   - Helper functions for admin access checks
   - Improved policy handling to prevent circular dependencies
   - Safe policy replacements for problematic policies

7. **07_admin_seeding.sql**
   - Admin user creation and verification
   - Helper functions for troubleshooting admin access
   - Utilities for testing admin roles
   - Functions to grant and verify admin permissions

## Migration Order

The files should be applied in sequential order (01 to 07) to ensure proper dependency resolution.

## Schema Design Principles

1. **Modularity**: Related functionality is grouped together
2. **Security**: All tables have Row Level Security enabled
3. **Performance**: Indexes are created for common query patterns
4. **Maintainability**: Clear comments and consistent naming conventions
5. **Error Handling**: Proper error handling with IF NOT EXISTS checks

## Improvements

This refactored schema offers several advantages over the original:

1. **Better Organization**: Related features are grouped logically
2. **Reduced Duplication**: Common patterns are consolidated
3. **Clearer Structure**: Each file has a clear purpose
4. **Easier Maintenance**: Simpler to update specific features
5. **Improved Readability**: Better comments and formatting
6. **Fixed Known Issues**: Recursion problems and other issues are addressed
7. **Enhanced Administration**: Better tools for managing admin access

## Usage

Apply these migrations in sequence using the Supabase CLI or dashboard. 