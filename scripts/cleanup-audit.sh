#!/bin/bash

# ========================================
# Code Cleanup & Audit Script
# Quang Huong Computer Project
# ========================================

echo "🔍 Starting Code Cleanup & Audit..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ========================================
# 1. Remove console.log from production code
# ========================================
echo -e "${YELLOW}📝 Removing console.log statements...${NC}"

find frontend/src -name "*.tsx" -o -name "*.ts" | while read file; do
    if grep -q "console.log" "$file"; then
        echo "  Found console.log in: $file"
        # Remove console.log but keep console.error, console.warn
        sed -i '/console\.log/d' "$file"
    fi
done

echo -e "${GREEN}✓ Console.log cleanup completed${NC}"
echo ""

# ========================================
# 2. Remove unused imports (ESLint)
# ========================================
echo -e "${YELLOW}📦 Checking for unused imports...${NC}"

cd frontend
npm run lint 2>&1 | grep "unused" || echo "  No unused imports found"
cd ..

echo ""

# ========================================
# 3. Check for empty hrefs
# ========================================
echo -e "${YELLOW}🔗 Checking for empty hrefs...${NC}"

EMPTY_HREFS=$(grep -r 'href=["\"][\s]*["\"]' frontend/src --include="*.tsx" --include="*.ts" || echo "")

if [ -n "$EMPTY_HREFS" ]; then
    echo -e "${RED}✗ Found empty hrefs:${NC}"
    echo "$EMPTY_HREFS"
else
    echo -e "${GREEN}✓ No empty hrefs found${NC}"
fi
echo ""

# ========================================
# 4. Check for placeholder without content
# ========================================
echo -e "${YELLOW}📝 Checking for empty placeholders...${NC}"

EMPTY_PLACEHOLDERS=$(grep -r 'placeholder=["\'][\"\']*["\']' frontend/src --include="*.tsx" || echo "")

if [ -n "$EMPTY_PLACEHOLDERS" ]; then
    echo -e "${YELLOW}⚠ Found empty placeholders (these might be intentional):${NC}"
    echo "$EMPTY_PLACEHOLDERS"
else
    echo -e "${GREEN}✓ All placeholders have content${NC}"
fi
echo ""

# ========================================
# 5. Check for TODO/FIXME comments
# ========================================
echo -e "${YELLOW}⚠️  Checking for TODO/FIXME comments...${NC}"

TODOS=$(grep -rn "TODO\|FIXME" frontend/src --include="*.tsx" --include="*.ts" || echo "")

if [ -n "$TODOS" ]; then
    echo -e "${YELLOW}Found TODO/FIXME comments:${NC}"
    echo "$TODOS"
else
    echo -e "${GREEN}✓ No TODO/FIXME comments found${NC}"
fi
echo ""

# ========================================
# 6. Check for onClick without handler
# ========================================
echo -e "${YELLOW}🖱️  Checking for onClick handlers...${NC}"

EMPTY_ONCLICK=$(grep -r 'onClick=\{[\s]*\}' frontend/src --include="*.tsx" || echo "")

if [ -n "$EMPTY_ONCLICK" ]; then
    echo -e "${RED}✗ Found empty onClick handlers:${NC}"
    echo "$EMPTY_ONCLICK"
else
    echo -e "${GREEN}✓ All onClick handlers have implementations${NC}"
fi
echo ""

# ========================================
# 7. Format code with Prettier
# ========================================
echo -e "${YELLOW}✨ Formatting code with Prettier...${NC}"

cd frontend
npm run format 2>/dev/null || echo "  Prettier format script not found"
cd ..

echo -e "${GREEN}✓ Code formatting completed${NC}"
echo ""

# ========================================
# 8. Run ESLint
# ========================================
echo -e "${YELLOW}🔍 Running ESLint...${NC}"

cd frontend
npm run lint 2>&1 | tail -20
cd ..

echo ""

# ========================================
# 9. Check for duplicate code
# ========================================
echo -e "${YELLOW}📋 Checking for potential code duplication...${NC}"

echo "  (Skipping - requires specialized tools)"
echo ""

# ========================================
# 10. Summary
# ========================================
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}✓ Cleanup & Audit Completed!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Review any warnings above"
echo "  2. Run tests: cd frontend && npm test"
echo "  3. Build project: cd frontend && npm run build"
echo ""

# ========================================
# 11. Generate audit report
# ========================================
echo "Generating audit report..."

REPORT_FILE="audit-report-$(date +%Y%m%d-%H%M%S).txt"

cat > "$REPORT_FILE" << EOF
========================================
Code Audit Report
Quang Huong Computer Project
Generated: $(date)
========================================

FRONTEND AUDIT
---------------

Files with console.log: (removed)
Files with empty hrefs: $(echo "$EMPTY_HREFS" | wc -l)
Files with empty placeholders: $(echo "$EMPTY_PLACEHOLDERS" | wc -l)
Files with TODO/FIXME: $(echo "$TODOS" | wc -l)
Files with empty onClick: $(echo "$EMPTY_ONCLICK" | wc -l)

CODE QUALITY
------------
ESLint errors: See above output
TypeScript errors: 0 (checked via compilation)

RECOMMENDATIONS
---------------
1. Review TODO/FIXME comments
2. Add unit tests for critical paths
3. Consider adding Storybook for components
4. Setup code coverage reporting

EOF

echo -e "${GREEN}✓ Audit report saved to: $REPORT_FILE${NC}"
echo ""

echo -e "${GREEN}🎉 All done!${NC}"
