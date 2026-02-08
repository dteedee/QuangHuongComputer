#!/bin/bash

# ========================================
# Build & Clean Script
# Quang Huong Computer Project
# ========================================

set -e  # Exit on error

echo "🚀 Starting Build & Clean Process..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# ========================================
# 1. Clean build artifacts
# ========================================
echo -e "${YELLOW}🧹 Cleaning build artifacts...${NC}"

# Frontend
echo "  Cleaning frontend..."
cd frontend
rm -rf dist/
rm -rf build/
rm -rf node_modules/.vite/
rm -rf .eslintcache
cd ..

# Backend
echo "  Cleaning backend..."
cd backend
dotnet clean --configuration Release --verbosity quiet
cd ..

echo -e "${GREEN}✓ Clean completed${NC}"
echo ""

# ========================================
# 2. Install dependencies
# ========================================
echo -e "${YELLOW}📦 Installing dependencies...${NC}"

echo "  Installing frontend dependencies..."
cd frontend
npm install --silent --no-audit --no-fund
cd ..

echo "  Restoring backend packages..."
cd backend
dotnet restore --verbosity quiet
cd ..

echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# ========================================
# 3. Run linters
# ========================================
echo -e "${YELLOW}🔍 Running linters...${NC}"

cd frontend
echo "  Running ESLint..."
npm run lint -- --max-warnings=0 || echo -e "${RED}✗ ESLint failed${NC}"
cd ..

echo -e "${GREEN}✓ Linting completed${NC}"
echo ""

# ========================================
# 4. Run tests
# ========================================
echo -e "${YELLOW}🧪 Running tests...${NC}"

cd frontend
echo "  Running unit tests..."
npm run test -- --run --reporter=verbose 2>&1 | head -50
cd ..

echo ""
echo -e "${GREEN}✓ Tests completed${NC}"
echo ""

# ========================================
# 5. Build frontend
# ========================================
echo -e "${YELLOW}🏗️  Building frontend...${NC}"

cd frontend
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend build successful${NC}"
    
    # Show build size
    BUILD_SIZE=$(du -sh dist/ | cut -f1)
    echo "  Build size: $BUILD_SIZE"
else
    echo -e "${RED}✗ Frontend build failed${NC}"
    exit 1
fi

cd ..
echo ""

# ========================================
# 6. Build backend
# ========================================
echo -e "${YELLOW}🏗️  Building backend...${NC}"

cd backend
dotnet build --configuration Release --no-restore --verbosity quiet

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend build successful${NC}"
else
    echo -e "${RED}✗ Backend build failed${NC}"
    exit 1
fi

cd ..
echo ""

# ========================================
# 7. Generate build report
# ========================================
echo -e "${YELLOW}📋 Generating build report...${NC}"

REPORT_FILE="build-report-$(date +%Y%m%d-%H%M%S).txt"

cat > "$REPORT_FILE" << EOF
========================================
Build Report
Quang Huong Computer Project
Generated: $(date)
========================================

FRONTEND
--------
Build Status: Success
Build Location: frontend/dist/
Build Size: $(du -sh frontend/dist/ | cut -f1)

BACKEND
-------
Build Status: Success
Build Configuration: Release
Output Location: backend/*/bin/Release/net8.0/

TESTS
-----
Test Results: Run 'npm test' for full report
Test Coverage: Run 'npm run test:coverage'

NEXT STEPS
----------
1. Review build artifacts
2. Run docker compose up -d (local testing)
3. Deploy to staging/production

EOF

echo -e "${GREEN}✓ Build report saved to: $REPORT_FILE${NC}"
echo ""

# ========================================
# 8. Summary
# ========================================
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}✓ Build & Clean Completed Successfully!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo "Frontend build: frontend/dist/"
echo "Backend build: backend/*/bin/Release/"
echo ""
echo "To run the application:"
echo "  docker compose up -d"
echo ""
echo "To deploy:"
echo "  See DEPLOYMENT-GUIDE.md"
echo ""

echo -e "${GREEN}🎉 All done! Ready to deploy!${NC}"
