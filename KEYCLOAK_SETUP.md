# Keycloak Integration Setup Guide

## 📋 Overview

This document outlines the complete Keycloak integration for the Internal Developer Platform.

---

## 🔧 Frontend Setup

### 1. Install Keycloak Library

```bash
npm install keycloak-js
```

### 2. Environment Variables

Create `.env.local` in the root:

```env
VITE_KEYCLOAK_URL=http://localhost:8081
VITE_KEYCLOAK_REALM=idp
VITE_KEYCLOAK_CLIENT_ID=idp-frontend
VITE_API_URL=http://localhost:3000
```

### 3. Files Created

- **`src/auth/keycloak.ts`** - Keycloak instance configuration
- **`src/auth/useAuth.ts`** - React hook for auth state
- **`src/components/AuthProvider.tsx`** - Auth provider wrapper
- **`src/auth/ProtectedRoute.tsx`** - Protected route component
- **`src/lib/apiClient.ts`** - API client with token attachment
- **`src/components/UserProfile.tsx`** - User profile dropdown with logout
- **`public/silent-check-sso.html`** - Silent SSO check file

### 4. Usage in Components

#### Login State
```tsx
import { useAuth } from '@/auth/useAuth';

export function MyComponent() {
  const { isAuthenticated, user, logout } = useAuth();

  if (!isAuthenticated) {
    return <div>Not authenticated</div>;
  }

  return <div>Welcome, {user?.name}</div>;
}
```

#### API Calls with Token
```tsx
import { apiGet, apiPost } from '@/lib/apiClient';

// GET request
const workflows = await apiGet<Workflow[]>('/api/workflows');

// POST request
const result = await apiPost<CreateResult>('/api/workflows', {
  name: 'New Workflow',
});
```

#### Protected Routes
```tsx
import { ProtectedRoute } from '@/auth/ProtectedRoute';

<Routes>
  <Route element={<ProtectedRoute />}>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/workflows" element={<WorkflowStudio />} />
  </Route>
</Routes>
```

---

## 🛠️ Backend Setup

### 1. Install Dependencies

```bash
npm install express cors dotenv jsonwebtoken
npm install --save-dev @types/express @types/node typescript
```

### 2. Environment Variables

Create `.env` in the backend root:

```env
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=idp
DB_HOST=localhost
DB_PORT=5432
DB_NAME=idp_db
DB_USER=idp_user
DB_PASSWORD=secure_password
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3000
NODE_ENV=development
```

### 3. Files Created

- **`backend/api/middleware/authMiddleware.ts`** - JWT verification middleware
- **`backend/api/routes/authRoutes.ts`** - Auth routes
- **`backend/config/keycloak.ts`** - Keycloak configuration
- **`backend/server.example.ts`** - Example Express server setup

### 4. Using Auth Middleware

```typescript
import express from 'express';
import { verifyToken, hasRole, requireAuth } from './api/middleware/authMiddleware';
import authRoutes from './api/routes/authRoutes';

const app = express();

// Public routes
app.get('/health', (req, res) => res.json({ status: 'OK' }));

// Auth routes
app.use('/api/auth', authRoutes);

// Protected routes (require authentication)
app.get('/api/workflows', verifyToken, (req, res) => {
  // User is authenticated
  // req.user contains user info
  res.json({ workflows: [] });
});

// Role-based protection
app.delete('/api/workflows/:id', verifyToken, hasRole('admin'), (req, res) => {
  // Only users with 'admin' role can delete
  res.json({ success: true });
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

---

## 🐳 Docker Setup (Keycloak)

See `docker-compose.yml` in the backend directory:

```bash
# Navigate to docker directory
cd backend/docker

# Start Keycloak and database
docker-compose up -d

# Access Keycloak Admin Console
# URL: http://localhost:8080
# Username: admin
# Password: admin
```

---

## ⚙️ Keycloak Configuration

### 1. Create Realm

1. Go to http://localhost:8081/admin
2. Click **"Add Realm"**
3. Create realm named **`idp`**

### 2. Create Client (Frontend)

1. Navigate to **Clients** → **Create**
2. Fill in:
   - **Client ID**: `idp-frontend`
   - **Enabled**: ON
3. In **Settings** tab:
   - **Valid Redirect URIs**: 
     - `http://localhost:5173/*`
     - `http://localhost:5173/dashboard`
   - **Web Origins**: `http://localhost:5173`
   - **Access Type**: `public`
4. In **Advanced Settings**:
   - **Standard Flow**: ON
   - **Implicit Flow**: ON
   - **Direct Access Grants**: ON

### 3. Create Client (Backend)

1. Navigate to **Clients** → **Create**
2. Fill in:
   - **Client ID**: `idp-backend`
   - **Enabled**: ON
3. In **Settings** tab:
   - **Valid Redirect URIs**: `http://localhost:3000/*`
   - **Access Type**: `service-account-enabled`
4. In **Service Account Roles**:
   - Add necessary roles for backend operations

### 4. Configure OAuth Providers (GitHub/Google)

1. Go to **Identity Providers**
2. Click **"Add provider"** → **"GitHub"**
3. Fill in:
   - **Client ID**: (from GitHub app)
   - **Client Secret**: (from GitHub app)
4. Repeat for Google

### 5. Create Roles

1. Go to **Roles** → **Add Role**
2. Create roles:
   - `admin`
   - `developer`
   - `viewer`
   - `deployer`

### 6. Create Test Users

1. Go to **Users** → **Add User**
2. Create users and assign roles
3. Set temporary passwords

---

## 🔐 Token Flow Diagram

```
┌─────────────────────────────────────────────────┐
│                  Frontend (React)                │
├─────────────────────────────────────────────────┤
│ 1. User clicks "Login"                          │
│ 2. Redirects to Keycloak                        │
│ 3. User enters credentials                      │
│ 4. Keycloak validates & returns JWT             │
│ 5. Frontend stores JWT                          │
└──────────────────┬──────────────────────────────┘
                   │
                   ↓ (JWT in Authorization header)
┌──────────────────────────────────────────────────┐
│               Backend (Express)                   │
├──────────────────────────────────────────────────┤
│ 1. Receives request with Authorization header    │
│ 2. Middleware extracts JWT                       │
│ 3. Verifies JWT signature & expiration           │
│ 4. Extracts user info from token                 │
│ 5. Attaches user to request object               │
│ 6. Route handler processes authenticated request │
└──────────────────────────────────────────────────┘
```

---

## 📝 API Endpoints

### Auth Routes

```
GET    /api/auth/user           - Get current user info
GET    /api/auth/verify         - Verify token validity
GET    /api/auth/profile        - Get user profile
POST   /api/auth/logout         - Logout (frontend handles via Keycloak)
```

### Protected Workflow Routes (Example)

```
GET    /api/workflows           - List workflows (requires auth)
POST   /api/workflows           - Create workflow (requires auth + admin role)
GET    /api/workflows/:id       - Get workflow detail (requires auth)
PUT    /api/workflows/:id       - Update workflow (requires auth + admin role)
DELETE /api/workflows/:id       - Delete workflow (requires auth + admin role)
```

---

## 🧪 Testing Authentication

### Frontend Test

```jsx
import { useAuth } from '@/auth/useAuth';

export function TestAuth() {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <p>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</p>
      <p>User: {user?.email}</p>
      <p>Name: {user?.name}</p>
      <p>Roles: {user?.realm_access?.roles?.join(', ')}</p>
    </div>
  );
}
```

### Backend Test

```bash
# Get token from Keycloak
TOKEN=$(curl -X POST http://localhost:8081/realms/idp/protocol/openid-connect/token \
  -d "client_id=idp-backend" \
  -d "grant_type=password" \
  -d "username=testuser" \
  -d "password=testpass" | jq -r '.access_token')

# Test protected endpoint
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/workflows
```

---

## 🚀 Deployment

### Production Keycloak

```bash
# Use PostgreSQL instead of H2
# Configure HTTPS
# Use environment variables for all secrets
# Run behind reverse proxy (nginx)
```

### Frontend Build

```bash
npm run build
# Deploy dist/ folder
```

### Backend Deployment

```bash
npm run build
# Deploy with process manager (PM2, systemd, etc.)
```

---

## 🐛 Troubleshooting

### "Token is invalid"
- Verify Keycloak URL matches between frontend and backend
- Check token expiration time
- Ensure JWT secret is configured correctly

### "CORS error"
- Add frontend URL to Keycloak client "Valid Redirect URIs"
- Add backend CORS configuration

### "User not found in token"
- Ensure user is properly created in Keycloak
- Check token contains required claims

### "Unable to connect to Keycloak"
- Verify Keycloak container is running: `docker ps`
- Check network connectivity: `curl http://localhost:8081`

---

## 📚 References

- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [keycloak-js Library](https://www.npmjs.com/package/keycloak-js)
- [OpenID Connect Spec](https://openid.net/connect/)
- [JWT.io](https://jwt.io)
