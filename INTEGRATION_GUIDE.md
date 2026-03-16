# Keycloak Integration - Complete Implementation Guide

## 📦 What Has Been Created

### Frontend Files

```
src/
├── auth/
│   ├── keycloak.ts                 # Keycloak instance
│   ├── useAuth.ts                  # Authentication hook
│   └── ProtectedRoute.tsx           # Route protection component
├── components/
│   ├── AuthProvider.tsx             # Auth provider wrapper
│   └── UserProfile.tsx              # User dropdown + logout
└── lib/
    └── apiClient.ts                # API client with token
```

### Backend Files

```
backend/
├── api/
│   ├── middleware/
│   │   └── authMiddleware.ts        # JWT verification
│   └── routes/
│       └── authRoutes.ts            # Auth endpoints
├── config/
│   └── keycloak.ts                 # Keycloak config
├── docker/
│   ├── docker-compose.yml          # Full stack
│   └── README.md                   # Docker guide
├── .env.example                    # Environment template
├── package.json                    # Backend dependencies
└── server.example.ts               # Example Express setup
```

### Configuration Files

```
├── .env.example                     # Frontend config template
├── KEYCLOAK_SETUP.md               # Setup instructions
└── public/
    └── silent-check-sso.html       # SSO silent check
```

---

## 🚀 Quick Start

### Step 1: Install Frontend Dependencies

```bash
cd orchestrate-studio
npm install keycloak-js
```

### Step 2: Install Backend Dependencies

```bash
cd backend
npm install
```

### Step 3: Start Keycloak Stack

```bash
cd docker
docker-compose up -d

# Wait for services to be ready
docker-compose ps
```

### Step 4: Configure Keycloak

1. Open http://localhost:8081
2. Login as admin/admin
3. Follow [KEYCLOAK_SETUP.md](../KEYCLOAK_SETUP.md) guide
4. Create realm "idp"
5. Create clients "idp-frontend" and "idp-backend"

### Step 5: Create .env Files

**Frontend (.env.local)**
```env
VITE_KEYCLOAK_URL=http://localhost:8081
VITE_KEYCLOAK_REALM=idp
VITE_KEYCLOAK_CLIENT_ID=idp-frontend
VITE_API_URL=http://localhost:3000
```

**Backend (.env)**
```env
KEYCLOAK_URL=http://localhost:8081
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

### Step 6: Start Development

```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
cd backend
npm run dev
```

---

## 🔌 Integration Examples

### Frontend: Using Authentication

```tsx
import { useAuth } from '@/auth/useAuth';
import { apiGet } from '@/lib/apiClient';

export function WorkflowsList() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const [workflows, setWorkflows] = useState([]);

  useEffect(() => {
    if (isAuthenticated) {
      apiGet('/api/workflows')
        .then(data => setWorkflows(data))
        .catch(err => console.error(err));
    }
  }, [isAuthenticated]);

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please login</div>;

  return (
    <div>
      <h1>Welcome, {user?.name}</h1>
      <ul>
        {workflows.map(w => <li key={w.id}>{w.name}</li>)}
      </ul>
    </div>
  );
}
```

### Frontend: Logout Button

```tsx
import { useAuth } from '@/auth/useAuth';
import { UserProfile } from '@/components/UserProfile';

export function TopNav() {
  return (
    <nav>
      <h1>IDP</h1>
      <UserProfile />  {/* Includes logout button */}
    </nav>
  );
}
```

### Backend: Protected Routes

```typescript
import express from 'express';
import { verifyToken, hasRole } from './api/middleware/authMiddleware';
import authRoutes from './api/routes/authRoutes';

const app = express();

// Auth routes
app.use('/api/auth', authRoutes);

// Protected routes
app.get('/api/workflows', verifyToken, (req: AuthRequest, res) => {
  // User is authenticated
  console.log('User:', req.user.email);
  res.json({ workflows: [...] });
});

// Admin-only routes
app.post('/api/workflows', 
  verifyToken, 
  hasRole('admin'), 
  (req: AuthRequest, res) => {
    // Only admins can create workflows
    res.json({ id: 1, name: 'New Workflow' });
  }
);

app.listen(3000);
```

### Backend: Using User from Token

```typescript
app.get('/api/profile', verifyToken, (req: AuthRequest, res) => {
  res.json({
    userId: req.user.id,
    email: req.user.email,
    name: req.user.name,
    roles: req.user.realm_access?.roles || [],
  });
});
```

---

## 🔐 Authentication Flow

### Login Flow
```
┌────────────────┐
│  Login Page    │
└────────┬───────┘
         │ User clicks "Sign In"
         ↓
┌────────────────────────┐
│  Redirects to Keycloak │
└────────┬───────────────┘
         │ User enters credentials
         ↓
┌────────────────────────┐
│ Keycloak validates     │
└────────┬───────────────┘
         │ Returns JWT token
         ↓
┌────────────────────────┐
│  Frontend stores JWT   │
│  in localStorage       │
└────────┬───────────────┘
         │ Redirects to /dashboard
         ↓
┌────────────────────────┐
│  Dashboard loaded      │
│  with auth context     │
└────────────────────────┘
```

### API Request Flow
```
Frontend sends request with JWT:
GET /api/workflows
Authorization: Bearer <JWT>
         │
         ↓
Backend middleware receives request
         │
         ↓
Verify JWT signature & expiration
         │
         ↓
Extract user from token claims
         │ (if valid)
         ↓
Attach user to request object (req.user)
         │
         ↓
Route handler can access user & process request
         │
         ↓
Return response to frontend
```

---

## 📡 API Endpoints

### Auth Endpoints

```
POST   /api/auth/login           ← Keycloak handles this
POST   /api/auth/logout          ← Frontend calls keycloak.logout()
GET    /api/auth/user            ← Get current user
GET    /api/auth/verify          ← Verify token valid
GET    /api/auth/profile         ← Get user profile
```

### Protected Workflow Endpoints (Examples)

```
GET    /api/workflows            ← List (auth required)
POST   /api/workflows            ← Create (auth + admin required)
GET    /api/workflows/:id        ← Get (auth required)
PUT    /api/workflows/:id        ← Update (auth + admin required)
DELETE /api/workflows/:id        ← Delete (auth + admin required)
```

---

## 🧪 Testing

### Test Frontend Auth Hook

```tsx
import { render, screen } from '@testing-library/react';
import { useAuth } from '@/auth/useAuth';

function TestComponent() {
  const { user, isAuthenticated } = useAuth();
  return (
    <div>
      {isAuthenticated ? (
        <div>{user?.email}</div>
      ) : (
        <div>Not authenticated</div>
      )}
    </div>
  );
}

test('shows user email when authenticated', () => {
  render(<TestComponent />);
  screen.getByText(/test@example.com/i);
});
```

### Test Backend Route

```typescript
import request from 'supertest';
import app from './server';

describe('Workflows API', () => {
  it('should require authentication', async () => {
    const res = await request(app)
      .get('/api/workflows')
      .expect(401);
  });

  it('should return workflows with valid token', async () => {
    const token = 'valid-jwt-token';
    const res = await request(app)
      .get('/api/workflows')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    
    expect(res.body.workflows).toBeArray();
  });
});
```

---

## 🐛 Common Issues & Fixes

### Keycloak not accessible
```bash
# Check if running
docker-compose ps

# View logs
docker-compose logs keycloak

# Restart
docker-compose restart keycloak
```

### CORS errors
- Add frontend URL to Keycloak client "Valid Redirect URIs"
- Ensure backend has CORS enabled

### Token verification fails
- Check Keycloak URL matches between frontend and backend
- Verify realm name is correct
- Check user has required roles

### Frontend redirects to login repeatedly
- Clear browser localStorage
- Check Keycloak is accessible at configured URL
- Verify client configuration in Keycloak

---

## 📚 File Reference

| File | Purpose |
|------|---------|
| `src/auth/keycloak.ts` | Keycloak initialization |
| `src/auth/useAuth.ts` | React hook for auth state |
| `src/components/AuthProvider.tsx` | Wraps app with auth |
| `src/auth/ProtectedRoute.tsx` | Protects routes |
| `src/lib/apiClient.ts` | API calls with JWT |
| `src/components/UserProfile.tsx` | User menu with logout |
| `backend/api/middleware/authMiddleware.ts` | JWT verification |
| `backend/api/routes/authRoutes.ts` | Auth endpoints |
| `backend/config/keycloak.ts` | Configuration |
| `backend/docker/docker-compose.yml` | Infrastructure |
| `KEYCLOAK_SETUP.md` | Detailed setup guide |

---

## 🎯 Next Steps

1. ✅ Created all auth files
2. ✅ Setup Docker stack
3. **TODO**: Start Keycloak services
4. **TODO**: Configure realm & clients in Keycloak
5. **TODO**: Create .env files
6. **TODO**: Start frontend & backend
7. **TODO**: Test authentication end-to-end

---

## 📖 Additional Resources

- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [keycloak-js GitHub](https://github.com/keycloak/keycloak-js)
- [Express Middleware](https://expressjs.com/en/guide/using-middleware.html)
- [JWT.io](https://jwt.io)
- [OpenID Connect](https://openid.net/connect/)
