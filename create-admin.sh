#!/bin/bash

# Check if SUPABASE_SERVICE_ROLE_KEY is provided
if [ -z "$1" ]; then
  echo "ERROR: Supabase service role key is required"
  echo "Usage: ./create-admin.sh YOUR_SUPABASE_SERVICE_ROLE_KEY"
  exit 1
fi

# Create admin user with provided service role key
SUPABASE_SERVICE_ROLE_KEY="$1" node scripts/create-admin.mjs

# Exit with the script's exit code
exit $? 