#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting deployment process for Modern Admin Suite...${NC}"

# Check if required environment variables are set
if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
  echo -e "${RED}Error: Missing required environment variables.${NC}"
  echo "Please ensure the following variables are set in your .env file:"
  echo "  - VITE_SUPABASE_URL"
  echo "  - VITE_SUPABASE_ANON_KEY"
  exit 1
fi

# Security Check for FORCE_ADMIN_ACCESS
echo -e "${YELLOW}Performing security checks...${NC}"
grep -q "const FORCE_ADMIN_ACCESS = false" src/lib/AuthContext.tsx
if [ $? -ne 0 ]; then
  echo -e "${RED}SECURITY WARNING: FORCE_ADMIN_ACCESS is not set to false!${NC}"
  echo "Please set FORCE_ADMIN_ACCESS to false in src/lib/AuthContext.tsx before deploying."
  exit 1
else
  echo -e "${GREEN}Security check passed: FORCE_ADMIN_ACCESS is set to false.${NC}"
fi

# Check for hardcoded API keys
grep -q "https://.*supabase.co" src/lib/supabase.ts
if [ $? -eq 0 ]; then
  echo -e "${RED}SECURITY WARNING: Possible hardcoded Supabase URL found in src/lib/supabase.ts${NC}"
  echo "Please remove any hardcoded API endpoints before deploying."
  exit 1
else
  echo -e "${GREEN}Security check passed: No hardcoded Supabase URL found.${NC}"
fi

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install
if [ $? -ne 0 ]; then
  echo -e "${RED}Error: Failed to install dependencies.${NC}"
  exit 1
fi

# Build for production
echo -e "${YELLOW}Building for production...${NC}"
npm run build
if [ $? -ne 0 ]; then
  echo -e "${RED}Error: Build failed.${NC}"
  exit 1
fi

echo -e "${GREEN}Build completed successfully!${NC}"
echo -e "The production build is available in the ${YELLOW}dist/${NC} directory."
echo -e "For deployment instructions, please refer to ${YELLOW}docs/DEPLOYMENT.md${NC}"

# Provide options for deployment
echo -e "\n${GREEN}Deployment options:${NC}"
echo "1. Deploy to static hosting (Netlify, Vercel, etc.)"
echo "2. Upload to traditional web hosting"
echo "3. Deploy with Docker"
echo "4. Exit without deploying"

read -p "Choose an option (1-4): " option

case $option in
  1)
    echo -e "${YELLOW}For static hosting deployment, follow these steps:${NC}"
    echo "1. Install the hosting service CLI (if needed)"
    echo "2. Run the appropriate deployment command (e.g., netlify deploy --prod --dir=dist)"
    ;;
  2)
    echo -e "${YELLOW}For traditional web hosting:${NC}"
    echo "Upload the contents of the dist/ directory to your web server."
    ;;
  3)
    echo -e "${YELLOW}For Docker deployment:${NC}"
    echo "1. Create a Dockerfile if you don't have one"
    echo "2. Run: docker build -t modern-admin-suite ."
    echo "3. Run: docker run -p 80:80 modern-admin-suite"
    ;;
  4)
    echo -e "${GREEN}Exiting without deployment. Your build is ready in the dist/ directory.${NC}"
    ;;
  *)
    echo -e "${RED}Invalid option. Exiting.${NC}"
    ;;
esac

echo -e "\n${GREEN}Deployment process completed!${NC}" 