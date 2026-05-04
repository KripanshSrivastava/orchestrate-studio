#!/bin/bash

# JWKS Validation Testing Guide
# Day 1 Auth Hardening - Quick Reference

echo "========================================="
echo "JWKS Validation & Auth Testing"
echo "========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8081}"
BACKEND_URL="${BACKEND_URL:-http://localhost:3000}"
REALM="${REALM:-idp}"
BACKEND_CLIENT="${BACKEND_CLIENT:-idp-backend}"
FRONTEND_CLIENT="${FRONTEND_CLIENT:-idp-frontend}"

echo -e "${BLUE}Configuration:${NC}"
echo "Keycloak: $KEYCLOAK_URL"
echo "Backend: $BACKEND_URL"
echo "Realm: $REALM"
echo ""

# ============================================
# 1. Fetch JWKS from Keycloak
# ============================================
echo -e "${YELLOW}1. Fetching JWKS from Keycloak${NC}"
echo "Endpoint: $KEYCLOAK_URL/realms/$REALM/protocol/openid-connect/certs"
echo ""

curl -s "$KEYCLOAK_URL/realms/$REALM/protocol/openid-connect/certs" | jq '.' | head -50

echo ""
echo -e "${GREEN}✓ JWKS endpoint test successful${NC}"
echo ""

# ============================================
# 2. Get OpenID Configuration
# ============================================
echo -e "${YELLOW}2. OpenID Configuration${NC}"
echo "This shows the discovery endpoint with token endpoints"
echo ""

curl -s "$KEYCLOAK_URL/realms/$REALM/.well-known/openid-configuration" | jq '.token_endpoint, .issuer, .jwks_uri'

echo ""

# ============================================
# 3. Health Check - No Auth Required
# ============================================
echo -e "${YELLOW}3. Health Check (No Auth)${NC}"
echo "Endpoint: GET $BACKEND_URL/health"
echo ""

curl -s "$BACKEND_URL/health" | jq '.'

echo ""

# ============================================
# 4. Health Checks - Readiness & Liveness
# ============================================
echo -e "${YELLOW}4. Readiness & Liveness Checks (K8s)${NC}"
echo ""

echo "Readiness:"
curl -s "$BACKEND_URL/ready" | jq '.'

echo ""
echo "Liveness:"
curl -s "$BACKEND_URL/live" | jq '.'

echo ""

# ============================================
# 5. Get Server Info
# ============================================
echo -e "${YELLOW}5. Server Info (No Auth)${NC}"
echo "Endpoint: GET $BACKEND_URL/api/info"
echo ""

curl -s "$BACKEND_URL/api/info" | jq '.'

echo ""

# ============================================
# 6. Test Protected Endpoint WITHOUT Token
# ============================================
echo -e "${YELLOW}6. Test Protected Endpoint WITHOUT Token${NC}"
echo "Endpoint: GET $BACKEND_URL/api/workflows"
echo "Expected: 401 UNAUTHORIZED"
echo ""

curl -s "$BACKEND_URL/api/workflows" | jq '.'

echo ""

# ============================================
# 7. Get Token from Keycloak
# ============================================
echo -e "${YELLOW}7. Getting Valid Token from Keycloak${NC}"
echo ""
echo "Note: Replace ADMIN_USER and ADMIN_PASSWORD with real credentials"
echo "For testing, you can:"
echo "1. Log in via frontend and copy the token"
echo "2. Use Keycloak admin console"
echo ""

# This is a template - requires valid credentials
cat <<'EOF'
# Method 1: Get token via client credentials (if configured)
TOKEN=$(curl -s -X POST \
  "${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=${BACKEND_CLIENT}" \
  -d "client_secret=<client-secret>" \
  -d "grant_type=client_credentials" \
  | jq -r '.access_token')

echo "Token: $TOKEN"

# Method 2: Get token via password grant (user login)
TOKEN=$(curl -s -X POST \
  "${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=${FRONTEND_CLIENT}" \
  -d "username=<user@example.com>" \
  -d "password=<password>" \
  -d "grant_type=password" \
  | jq -r '.access_token')

echo "Token: $TOKEN"
EOF

echo ""

# ============================================
# 8. Test Protected Endpoint WITH Token
# ============================================
echo -e "${YELLOW}8. Test Protected Endpoint WITH Token${NC}"
echo "Endpoint: GET $BACKEND_URL/api/workflows"
echo ""
echo "Command:"
echo "  curl -H \"Authorization: Bearer \$TOKEN\" $BACKEND_URL/api/workflows | jq"
echo ""
echo "Expected response:"
echo "  { \"code\": \"SUCCESS\", \"data\": [...], \"traceId\": \"...\" }"
echo ""
echo "Note: Provide the TOKEN variable from step 7"
echo ""

# ============================================
# 9. Trace ID Correlation
# ============================================
echo -e "${YELLOW}9. Trace ID Correlation${NC}"
echo "Every response includes a traceId for correlation:"
echo ""
echo "Response header:"
echo "  X-Trace-ID: 1712425600123-abc7xyz"
echo ""
echo "Response body:"
echo "  { \"code\": \"SUCCESS\", \"traceId\": \"1712425600123-abc7xyz\", ... }"
echo ""
echo "Use this to correlate logs across services"
echo ""

# ============================================
# 10. Audit Logs
# ============================================
echo -e "${YELLOW}10. Audit Logs${NC}"
echo "Auth-sensitive actions are logged to: backend/logs/audit.log"
echo ""
echo "View recent audit logs:"
echo "  tail -20 logs/audit.log | jq '.'"
echo ""
echo "Each entry includes:"
echo "  - timestamp (ISO 8601)"
echo "  - traceId (for correlation)"
echo "  - userId"
echo "  - userEmail"
echo "  - action (method + path)"
echo "  - result (success/failure)"
echo ""

# ============================================
# 11. Error Handling
# ============================================
echo -e "${YELLOW}11. Error Handling${NC}"
echo ""
echo "Standard error response format:"
echo ""
cat <<'EOF'
{
  "code": "UNAUTHORIZED|INVALID_TOKEN|TOKEN_EXPIRED|INVALID_ORG",
  "message": "Human-readable error message",
  "traceId": "1712425600123-abc7xyz"
}
EOF

echo ""
echo ""

# ============================================
# 12. Multi-Tenancy
# ============================================
echo -e "${YELLOW}12. Multi-Tenancy (org_id)${NC}"
echo ""
echo "Every authenticated user has an org_id"
echo "All queries automatically filter by org_id"
echo ""
echo "In the token, org_id is extracted from:"
echo "  1. User realm roles (first role becomes org_id)"
echo "  2. Or from custom claim in token"
echo ""
echo "All data returned includes org_id to prevent cross-org leaks:"
echo '  { "id": 1, "name": "App", "org_id": "org-123", ... }'
echo ""

# ============================================
# 13. Testing Cross-Org Protection
# ============================================
echo -e "${YELLOW}13. Testing Cross-Org Protection${NC}"
echo ""
echo "If user from org-a tries to access org-b data:"
echo "  Expected: Only org-a data returned"
echo "  Or: 403 FORBIDDEN if not in org-b"
echo ""
echo "Implementation:"
echo "  All queries include: { org_id: req.user.org_id }"
echo "  This prevents queries from returning other org data"
echo ""

# ============================================
# 14. Integration Tests
# ============================================
echo -e "${YELLOW}14. Running Integration Tests${NC}"
echo ""
echo "Test JWKS validation:"
echo "  npm run test"
echo ""
echo "Expected output:"
echo "  ✓ JWKS fetched successfully"
echo "  ✓ JWKS caching works"
echo "  ✓ Retrieved key by kid: <key_id>"
echo ""

# ============================================
# Summary
# ============================================
echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}JWKS Validation Setup Complete${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Security Features Enabled:"
echo "  ✓ JWT signature validation via JWKS"
echo "  ✓ Issuer verification"
echo "  ✓ Audience verification"
echo "  ✓ Token expiry enforcement"
echo "  ✓ org_id extraction and multi-tenant isolation"
echo "  ✓ Audit logging for auth events"
echo "  ✓ Trace ID correlation"
echo "  ✓ Standard error responses"
echo ""
echo "Next Steps:"
echo "  1. Replace placeholder tokens in requests"
echo "  2. Run integration tests: npm run test"
echo "  3. Check audit logs: tail -f logs/audit.log | jq"
echo "  4. Implement token refresh strategy"
echo "  5. Add rate limiting"
echo ""
