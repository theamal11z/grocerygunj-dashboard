# Settings Compatibility Guide

## Overview

This guide explains the settings compatibility system implemented in the Modern Admin Suite to ensure backward compatibility between the old and new settings table structures.

## The Problem

The settings table structure has changed between migrations:

### Old Structure (original)
```sql
CREATE TABLE public.settings (
    id UUID PRIMARY KEY,
    settings_data JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

### New Structure (key-value store)
```sql
CREATE TABLE settings (
    id UUID PRIMARY KEY,
    key TEXT UNIQUE,
    value JSONB,
    description TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

This change would break existing code that expected to find `settings_data` in a single row in the `public.settings` table.

## The Solution

We've implemented a comprehensive compatibility system that:

1. Recreates the original `public.settings` table alongside the new `settings` table
2. Synchronizes data bidirectionally between both tables automatically
3. Provides helper functions to manage settings in both formats
4. Includes diagnostic tools to troubleshoot any sync issues

## How It Works

### Data Storage

- **New Settings**: Stored as key-value pairs in the `settings` table (one row per setting)
- **Old Settings**: Aggregated into a single JSONB object in the `settings_data` column of the `public.settings` table

### Synchronization

- **When adding/updating a setting in the new format**: The system automatically updates the old format
- **When updating the settings_data JSONB in the old format**: The system automatically extracts and updates the key-value pairs in the new format

### Functions

1. **save_settings_with_compatibility(key, value, description)**
   - Saves a setting in both formats
   - This is the recommended function to use when adding or updating settings

2. **get_aggregated_settings()**
   - Returns all settings as a single JSONB object
   - Useful for debugging or compatibility with old code

3. **diagnose_settings_sync()**
   - Diagnostic function that shows the state of both tables
   - Automatically attempts to fix any synchronization issues

## Usage Examples

### Adding or Updating Settings

```sql
-- Use this function to ensure compatibility with both formats
SELECT save_settings_with_compatibility(
    'site_config',
    jsonb_build_object('site_name', 'New Site Name'),
    'Site configuration'
);
```

### Legacy Code (Reading)

```sql
-- Original code expecting the old format will continue to work
SELECT settings_data FROM public.settings LIMIT 1;
```

### New Code (Reading)

```sql
-- New code can use the key-value structure
SELECT value FROM settings WHERE key = 'site_config';
```

## Troubleshooting

If you encounter any issues with settings not being saved or accessed correctly:

1. Run the diagnostic function:
   ```sql
   SELECT * FROM diagnose_settings_sync();
   ```

2. Check the results to see if both tables are synchronized.

3. The function will automatically attempt to fix any synchronization issues it finds.

## Implementation Details

The compatibility layer is implemented in the `04_storage_and_settings.sql` file and includes:

- Table definitions for both old and new formats
- Trigger functions to keep the tables synchronized
- Helper functions for managing settings
- Row-level security policies for both tables

## Moving Forward

While this compatibility layer ensures existing code continues to work, we recommend gradually migrating to the new format for new features as it offers better organization and flexibility. 