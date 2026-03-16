# Complete Keycloak Setup Guide for IDP with Custom Login Page

> **Note**: This guide accounts for your **custom login page** (`LoginPage.tsx`). You do NOT use Keycloak's default login UI. Instead, Keycloak acts as your authentication backend while your frontend maintains full control of the login experience.

---

## 🎯 Quick Start (5 Minutes)

```bash
# 1. Start Keycloak & services
cd backend/docker
docker-compose up -d

# 2. Wait 30-60 seconds for services to initialize
# Keycloak: http://localhost:8081
# Admin Console: http://localhost:8081/admin (admin/admin)

# 3. Create environment files (ALREADY DONE for you!)

# 4. Start frontend & backend
npm install keycloak-js
cd backend && npm install

# Terminal 1: Frontend (runs on http://localhost:8080)
npm run dev

# Terminal 2: Backend (runs on http://localhost:3000)
cd backend && npm run dev
```

---

## 📋 Part 1: Infrastructure Setup

### Step 1.1: Start Docker Services

```bash
cd backend/docker
docker-compose up -d
```

**What's running:**
- **Keycloak** (Port 8081): Identity Provider & OpenID Connect Server
- **Redis** (Port 6379): Token caching & sessions
- **MongoDB** (Port 27017): Application data store

**Monitor startup:**
```bash
# Check if Keycloak is ready
docker logs idp-keycloak | grep "started in"

# Wait until you see: "Keycloak X.X.X started in XXX ms"
```

### Step 1.2: Verify Services

```bash
# Quick verify - open these URLs in browser
# Keycloak Admin: http://localhost:8081/admin (should load)
# Keycloak Health: http://localhost:8081/realms/master (should return JSON)

# Or via PowerShell:
curl.exe http://localhost:8081/realms/master -UseBasicParsing
curl.exe redis-cli://localhost:6379 -UseBasicParsing

# Wait ~30-60 seconds after docker-compose up for Keycloak to fully start
```

⚠️ **IMPORTANT**: Keycloak takes 30-60 seconds to start. If you get 404 errors, **wait longer** and check the logs with `docker logs idp-keycloak`

---

## 🔑 Part 2: Keycloak Configuration via Admin Console

### Step 2.1: Access Admin Console

1. Open: **http://localhost:8081/admin**
2. Login:
   - **Username**: `admin`
   - **Password**: `admin`

### Step 2.2: Create Realm

1. Click **"Create Realm"** (or dropdown in top-left)
2. Fill:
   - **Name**: `idp`
   - **Enabled**: ON
3. Click **Create**

You're now in the **idp** realm.

### Step 2.3: Create Frontend Client (Your Custom Login Page)

This client represents your React app with the custom login page.

1. Go to **Clients** → **Create Client**
2. Fill:
   - **Client ID**: `idp-frontend`
   - **Name**: `IDP Frontend`
   - **Enabled**: ON
3. Click **Next**
4. In **Capability config**:
   - ✅ **Standard flow**: ON (for your custom login page)
   - ✅ **Direct access grants**: ON (allows token endpoint calls from your login page)
   - ✅ **Implicit flow**: ON (optional, for older browsers)
   - ❌ **Service accounts roles**: OFF (client credentials flow not needed)
5. Click **Next** → **Save**

#### Configure Frontend Client Settings:

6. Go to the `idp-frontend` client → **Settings** tab
7. Update these fields:

   **Valid redirect URIs:**
   ```
   http://localhost:8080/*
   http://localhost:8080/dashboard
   http://localhost:8080/login
   http://localhost:8080/
   ```

   **Valid post logout redirect URIs:**
   ```
   http://localhost:8080/
   http://localhost:8080/login
   ```

   **Web Origins:**
   ```
   http://localhost:8080
   http://localhost:8080/
   ```

8. Scroll down:
   - **Root URL**: `http://localhost:8080`
   - **Home URL**: `http://localhost:8080/dashboard`

9. Click **Save**

10. Go to **Advanced** tab:
    - **Proof Key for Public Clients (PKCE)**: `S256` (better security)
    - **Authentication flow overrides**: Keep defaults

### Step 2.4: Create Backend Client (Your Express Server)

This client represents your Node.js API backend.

1. Go to **Clients** → **Create Client**
2. Fill:
   - **Client ID**: `idp-backend`
   - **Name**: `IDP Backend API`
   - **Enabled**: ON
3. Click **Next**
4. In **Capability config**:
   - ✅ **Service accounts roles**: ON (backend-to-backend authentication)
   - ❌ **Standard flow**: OFF (backend doesn't do interactive login)
5. Click **Next** → **Save**

#### Configure Backend Client Settings:

6. Go to the `idp-backend` client → **Settings** tab
7. Update:

   **Valid redirect URIs:**
   ```
   http://localhost:3000/*
   ```

   **Web Origins:**
   ```
   http://localhost:3000
   ```

8. Click **Save**

9. Go to **Credentials** tab:
    - **Client Authenticator**: `Client ID and Secret`
    - Copy the **Client Secret** (you'll need it for `.env`)

---

## 👥 Part 3: Create Roles & Users

### Step 3.1: Create Roles

These roles can be assigned to users and checked in your backend.

1. Go to **Realm Roles**
2. Click **Create role**
3. Create these roles:
   - `admin` - Full access
   - `developer` - Can create workflows
   - `viewer` - Read-only access

For each role, you can set a description like "Administrator access" and click **Save**.

### Step 3.2: Create Test User

1. Go to **Users**
2. Click **Add user**
3. Fill:
   - **Username**: `testuser`
   - **Email**: `testuser@example.com`
   - **Email verified**: ON
   - **Enabled**: ON
4. Click **Create**

#### Set Password:

5. Go to **Credentials** tab
6. Click **Set password**
7. Enter:
   - **Password**: `testpass123`
   - **Temporary**: OFF
8. Click **Set password** again to confirm

#### Assign Role:

9. Go to **Realm roles** tab (in same user page)
10. Click **Assign role**
11. Select `admin` and click **Assign**

### Step 3.3: Create More Test Users

Repeat Step 3.2 for:
- Developer user: `devuser` / Role: `developer`
- Viewer user: `viewuser` / Role: `viewer`

---

## ⚙️ Part 4: Environment Variables

> **What are `.env.example` files?** They are templates committed to git. You copy them to create `.env` files (which are ignored by git for security). Your `.env` files contain sensitive data like passwords and secrets.

### Frontend (.env.local in root)

✅ **Already created for you** at: `d:\idp\orchestrate-studio\.env.local`

Contents:
```env
# Keycloak Configuration
VITE_KEYCLOAK_URL=http://localhost:8081
VITE_KEYCLOAK_REALM=idp
VITE_KEYCLOAK_CLIENT_ID=idp-frontend

# Backend API
VITE_API_URL=http://localhost:3000
```

These values work as-is unless you change Keycloak/port numbers.

### Backend (.env in backend folder)

✅ **Already created for you** at: `d:\idp\orchestrate-studio\backend\.env`

Default contents:
```env
# Keycloak Configuration
KEYCLOAK_URL=http://localhost:8081
KEYCLOAK_REALM=idp
KEYCLOAK_CLIENT_ID=idp-backend
KEYCLOAK_CLIENT_SECRET=<paste-from-keycloak-credentials>

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=idp_db
DB_USER=idp_user
DB_PASSWORD=secure_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Secret
JWT_SECRET=your-super-secret-key-change-this-in-production

# Server
NODE_ENV=development
PORT=3000
```

#### ⚠️ IMPORTANT: Get KEYCLOAK_CLIENT_SECRET

1. Complete **Step 2.4** (Create Backend Client) in this guide
2. Go to Keycloak Admin → **Clients** → **idp-backend** → **Credentials** tab
3. Copy the **Client Secret** value
4. Edit `backend/.env` and replace `<paste-from-keycloak-credentials>` with that value

Example:
```env
KEYCLOAK_CLIENT_SECRET=a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

---

## 🚀 Part 5: Start Development Stack

### Terminal 1: Frontend

```bash
cd d:\idp\orchestrate-studio

# Install dependencies
npm install keycloak-js

# Start Vite dev server
npm run dev
```

Expected output:
```
  VITE v5.x.x  ready in XXX ms

  ➜  Local:   http://localhost:8080/
  ➜  press h + enter to show help
```

### Terminal 2: Backend

```bash
cd d:\idp\orchestrate-studio\backend

# Install dependencies
npm install

# Start Express server
npm run dev
```

Expected output:
```
Server running on port 3000
```

---

## 🔐 Part 6: How Your Custom Login Page Works

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  1. User opens http://localhost:8080                             │
│     AuthProvider initializes KeycloakJS                          │
└──────────────────┬──────────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────────┐
│  2. Not authenticated → Redirect to /login (YOUR custom page)   │
│     (NOT Keycloak's default login page)                          │
└──────────────────┬──────────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────────┐
│  3. LoginPage.tsx shows beautiful custom login form              │
│     User enters email/password in YOUR UI                        │
└──────────────────┬──────────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────────┐
│  4. On form submit (handleSubmit):                               │
│     POST to Keycloak token endpoint with credentials             │
│     https://localhost:8081/realms/idp/protocol/...              │
│     /openid-connect/token                                        │
└──────────────────┬──────────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────────┐
│  5. Keycloak validates credentials, returns JWT token           │
│     Token contains: user ID, email, name, roles, exp date       │
└──────────────────┬──────────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────────┐
│  6. LoginPage.tsx stores token in localStorage/sessionStorage    │
│     Keycloak JS library handles this automatically               │
└──────────────────┬──────────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────────┐
│  7. Redirect to /dashboard                                       │
│     AuthProvider sees token → authenticated = true               │
└──────────────────┬──────────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────────┐
│  8. All subsequent API calls in apiClient.ts:                   │
│     Attach token: Authorization: Bearer <JWT>                   │
│     → POST to http://localhost:3000/api/*                       │
└──────────────────┬──────────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────────┐
│  9. Backend authMiddleware.ts verifies JWT:                      │
│     extracts user info from token:                               │
│     req.user = {                                                 │
│       id: "user-123",                                            │
│       email: "user@company.com",                                 │
│       name: "John Doe",                                          │
│       roles: ["admin"]                                           │
│     }                                                            │
└──────────────────┬──────────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────────┐
│  10. Route handler access req.user and responds with data       │
│      Frontend receives data and renders dashboard                │
└─────────────────────────────────────────────────────────────────┘
```

### Current Implementation Status

**Already Done ✅:**
- `src/auth/keycloak.ts` - Keycloak JS instance
- `src/auth/useAuth.ts` - Hook for auth state
- `src/components/AuthProvider.tsx` - Provider wrapper
- `src/lib/apiClient.ts` - Auto token attachment
- `src/pages/LoginPage.tsx` - Custom login UI (your page!)
- `backend/api/middleware/authMiddleware.ts` - Token verification
- `backend/api/routes/authRoutes.ts` - Auth endpoints

**What YOU Need to Do:**
1. Complete Keycloak Admin Console setup (Sections 2-3 above)
2. Create `.env` files (Section 4)
3. Update `LoginPage.tsx` to call Keycloak token endpoint
4. Test the flow

---

## 📝 Part 7: Update Your LoginPage.tsx

Your `LoginPage.tsx` currently just navigates to dashboard. Update it to:

1. **Authenticate with Keycloak**
2. **Store token**
3. **Navigate to dashboard**

Here's the pattern to add to `handleSubmit`:

```tsx
import keycloak from '@/auth/keycloak';

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  try {
    // Call Keycloak token endpoint directly
    const tokenResponse = await fetch(
      `${import.meta.env.VITE_KEYCLOAK_URL}/realms/${import.meta.env.VITE_KEYCLOAK_REALM}/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
          grant_type: 'password',
          username: email,
          password: password,
        }),
      }
    );

    if (!tokenResponse.ok) {
      throw new Error('Invalid credentials');
    }

    const tokenData = await tokenResponse.json();
    
    // Keycloak JS will handle storing the token
    keycloak.token = tokenData.access_token;
    keycloak.refreshToken = tokenData.refresh_token;
    keycloak.tokenParsed = JSON.parse(atob(tokenData.access_token.split('.')[1]));

    // Navigate to dashboard
    navigate('/dashboard');
  } catch (error) {
    console.error('Login failed:', error);
    // Show error message to user
  }
};
```

---

## 🧪 Part 8: Testing the Complete Flow

### Test 1: Authentication

```bash
# 1. Open http://localhost:8080
# → Should redirect to /login (your custom page)

# 2. Enter credentials:
#    Email: testuser@example.com
#    Password: testpass123

# 3. Should redirect to /dashboard and show authenticated state
```

### Test 2: Backend API with Token

```bash
# Get token (via curl, no UI)
curl -X POST "http://localhost:8081/realms/idp/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=idp-frontend" \
  -d "grant_type=password" \
  -d "username=testuser" \
  -d "password=testpass123"

# Response:
# {
#   "access_token": "eyJhbGc...",
#   "token_type": "Bearer",
#   "expires_in": 300,
#   ...
# }
```

### Test 3: Call Protected Backend Route

```bash
# Store token from above response
TOKEN="eyJhbGc..."

# Call protected route
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/auth/user

# Should return:
# {
#   "success": true,
#   "user": {
#     "id": "...",
#     "email": "testuser@example.com",
#     "name": "...",
#     ...
#   }
# }
```

### Test 4: Logout

```bash
# In your UI, click UserProfile dropdown → Logout
# Should:
# 1. Clear token from localStorage
# 2. Redirect to /login
# 3. Keycloak session cleared
```

---

## 🐛 Part 9: Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| **Login button does nothing** | Token endpoint CORS issue | Add `http://localhost:8080` to Keycloak Web Origins |
| **"Invalid credentials" error** | User doesn't exist in Keycloak | Create user in Keycloak admin console |
| **Backend returns 401** | Token missing/expired | Check Authorization header in Network tab |
| **Cannot connect to Keycloak** | Docker services not running | Run `docker-compose up -d` |
| **CORS error on login** | Keycloak CORS not configured | Update client Web Origins (Step 2.3) |
| **Token validation fails** | JWT secret mismatch | Verify KC_RSA_PUBLIC_KEY matches |
| **"Redirect URI mismatch"** | URL not in Valid redirect URIs | Add exact URL to client settings |

---

## 🔗 Part 10: Service URLs Reference

| Service | URL | Credentials |
|---------|-----|-------------|
| **Keycloak Admin** | http://localhost:8081/admin | admin / admin |
| **Keycloak Realm** | http://localhost:8081/realms/idp | - |
| **Token Endpoint** | http://localhost:8081/realms/idp/protocol/openid-connect/token | - |
| **OIDC Config** | http://localhost:8081/realms/idp/.well-known/openid-configuration | - |
| **Frontend App** | http://localhost:8080 | - |
| **Backend API** | http://localhost:3000 | - |
| **Redis** | localhost:6379 | - |
| **MongoDB** | localhost:27017 | admin / mongodb_password |

---

## 📚 Part 11: Key Files Reference

| File | Purpose |
|------|---------|
| [src/auth/keycloak.ts](src/auth/keycloak.ts) | Keycloak instance initialization |
| [src/auth/useAuth.ts](src/auth/useAuth.ts) | React hook for auth state |
| [src/components/AuthProvider.tsx](src/components/AuthProvider.tsx) | Wraps app with auth |
| [src/pages/LoginPage.tsx](src/pages/LoginPage.tsx) | **Your custom login UI** |
| [src/lib/apiClient.ts](src/lib/apiClient.ts) | Auto-attach JWT to requests |
| [backend/api/middleware/authMiddleware.ts](backend/api/middleware/authMiddleware.ts) | Verify JWT on backend |
| [backend/api/routes/authRoutes.ts](backend/api/routes/authRoutes.ts) | `/api/auth/*` endpoints |
| [backend/config/keycloak.ts](backend/config/keycloak.ts) | Backend Keycloak config |
| [backend/docker/docker-compose.yml](backend/docker/docker-compose.yml) | All services (Keycloak, Redis, MongoDB) |

---

## 🎓 Part 12: Common Tasks

### Verify User Roles in Backend

```typescript
import { verifyToken, hasRole } from '@/middleware/authMiddleware';

app.delete('/api/workflows/:id',
  verifyToken,
  hasRole('admin'),  // Only admins can delete
  (req: AuthRequest, res) => {
    res.json({ deleted: true });
  }
);
```

### Get User Email from Token

```typescript
app.get('/api/user-email',
  verifyToken,
  (req: AuthRequest, res) => {
    res.json({ email: req.user.email });
  }
);
```

### Refresh Token Before Expiry

```typescript
// Already handled in apiClient.ts!
// It auto-refreshes if token expires in < 30 seconds
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  if (keycloak.token) {
    await keycloak.updateToken(30);  // Refresh if expires in 30sec
  }
  // ... rest of code
};
```

### Logout from Frontend

```tsx
import { useAuth } from '@/auth/useAuth';

export function MyComponent() {
  const { logout } = useAuth();

  return <button onClick={logout}>Logout</button>;
}
```

---

## ✅ Post-Setup Checklist

- [ ] Docker services running (`docker ps` shows 3 containers)
- [ ] Keycloak Admin accessible (http://localhost:8081/admin)
- [ ] Realm "idp" created
- [ ] Client "idp-frontend" created with correct URIs
- [ ] Client "idp-backend" created with client secret copied
- [ ] Roles created (admin, developer, viewer)
- [ ] Test users created (testuser, devuser, viewuser)
- [ ] `.env.local` created in root with Keycloak URLs
- [ ] `.env` created in backend with Keycloak URLs + client secret
- [ ] Frontend `npm install keycloak-js` done
- [ ] Backend `npm install` done
- [ ] Frontend starts (`npm run dev`)
- [ ] Backend starts (`npm run dev`)
- [ ] Can login with custom LoginPage
- [ ] Can access dashboard after login
- [ ] API calls include Authorization header
- [ ] Backend receives user info from middleware

---

## 🚨 Important Notes

1. **Your custom login page replaces Keycloak's UI**
   - Keycloak only handles authentication (credential validation, token generation)
   - Your LoginPage.tsx has full control over the UI/UX

2. **Token is stored by Keycloak JS automatically**
   - No need to manually handle localStorage
   - The library handles refresh automatically

3. **CORS must be configured in Keycloak**
   - Your frontend URL must be in Web Origins
   - Otherwise, token requests will fail

4. **Production Differences**
   - Change `http://localhost:*` to your domain
   - Update `KEYCLOAK_ADMIN_PASSWORD` in docker-compose.yml
   - Enable HTTPS and set `KC_HOSTNAME_STRICT: "true"`

---

## 📞 Quick Support

**Keycloak Won't Start:**
```bash
docker logs idp-keycloak
docker compose down
docker compose up -d
```

**Reset Everything:**
```bash
docker compose down -v  # Remove volumes too
docker compose up -d
# Recreate realm, clients, users
```

**Clear Browser Auth:**
```bash
# DevTools → Application → Storage → Clear All
# Or press Ctrl+Shift+Del → Clear Cookies & Cached Images
```

---

Generated: March 16, 2026
