#!/bin/bash

# Backend ES Modules - Build & Run Guide

echo "========================================="
echo "Backend Build & Run Commands"
echo "========================================="
echo ""

echo "📦 INSTALLATION (Optional - already done)"
echo "  cd backend"
echo "  npm install"
echo ""

echo "🔨 BUILD (Compile TypeScript to JavaScript)"
echo "  npm run build"
echo "  Creates: dist/ folder with compiled .js files"
echo ""

echo "🚀 DEVELOPMENT (Hot Reload)"
echo "  npm run dev"
echo "  Watches src/ and reloads on changes"
echo "  Runs on: http://localhost:3000"
echo ""

echo "▶️  PRODUCTION (Run Compiled)"
echo "  npm run build      # Compile first"
echo "  npm run start      # Run from dist/"
echo ""

echo "✅ TESTS (Run Integration Tests)"
echo "  npm run test"
echo "  Tests JWKS validation and caching"
echo ""

echo "🔍 LINT (Check Code Quality)"
echo "  npm run lint"
echo ""

echo "========================================="
echo ""

echo "📍 VERIFY ES MODULES ARE WORKING"
echo ""

echo "1️⃣  Check ES Module setup:"
echo "  cat backend/package.json | grep 'type.*module'"
echo "  Expected: \"type\": \"module\""
echo ""

echo "2️⃣  Check TypeScript config:"
echo "  grep -o '\"module\": \"[^\"]*\"' backend/tsconfig.json"
echo "  Expected: \"module\": \"ESNext\""
echo ""

echo "3️⃣  Verify imports have .js extensions:"
echo "  grep -r 'from.*['\''\"]\\.\\./.*['\''\"]\$' backend/src backend/api --include='*.ts'"
echo "  Expected: All show .js extensions"
echo ""

echo "4️⃣  Build the project:"
echo "  cd backend && npm run build"
echo "  Check: dist/ folder created with .js files"
echo ""

echo "5️⃣  Start dev server:"
echo "  npm run dev"
echo "  Check: Server starts without errors"
echo ""

echo "6️⃣  Test an endpoint:"
echo "  curl http://localhost:3000/health | jq"
echo "  Expected: {\"status\": \"healthy\", ...}"
echo ""

echo "========================================="
echo ""

echo "🎯 WHAT'S NEXT"
echo ""
echo "✅ Day 1 Complete:"
echo "  • JWKS validation implemented"
echo "  • Auth hardening done"
echo "  • Multi-tenant enforcement added"
echo "  • Audit logging system ready"
echo "  • ES Modules conversion done"
echo ""
echo "📅 Day 2 Ready:"
echo "  • Build Application CRUD APIs"
echo "  • Create dashboard metrics endpoints"
echo "  • Set up database models"
echo "  • Implement Redis caching"
echo ""
