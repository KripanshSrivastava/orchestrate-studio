# Authentication Quick Reference

## 🎯 Quick Commands

### Start Everything

```bash
# 1. Start Keycloak stack
cd backend/docker
docker-compose up -d

# 2. Wait a few seconds for services to be ready
# 3. Create .env files (see below)
# 4. Start frontend
npm run dev

# 5. In another terminal, start backend
cd backend
npm run dev
```

### Environment Variables

**Frontend (.env.local)**
```
VITE_KEYCLOAK_URL=http://localhost:8081
VITE_KEYCLOAK_REALM=idp
VITE_KEYCLOAK_CLIENT_ID=idp-frontend
VITE_API_URL=http://localhost:3000
```

**Backend (.env)**
```
KEYCLOAK_URL=http://localhost:8081
KEYCLOAK_REALM=idp
PORT=3000
```

---

## 💻 Frontend Usage

### Get Auth State
```tsx
const { isAuthenticated, user, isLoading, logout } = useAuth();
```

### Make API Calls
```tsx
import { apiGet, apiPost } from '@/lib/apiClient';

// GET
const data = await apiGet('/api/workflows');

// POST
const result = await apiPost('/api/workflows', { name: 'New' });
```

### Protect Routes
```tsx
<Routes>
  <Route element={<ProtectedRoute />}>
    <Route path="/dashboard" element={<Dashboard />} />
  </Route>
</Routes>
```

### User Menu
```tsx
<UserProfile />  {/* Includes logout */}
```

---

## 🛠️ Backend Usage

### Protect Route
```typescript
app.get('/api/workflows', verifyToken, (req: AuthRequest, res) => {
  // req.user has user info
  res.json({ workflows: [] });
});
```

### Check Role
```typescript
app.post('/api/workflows', 
  verifyToken,
  hasRole('admin'),
  (req: AuthRequest, res) => {
    // Only admins reach here
    res.json({ id: 1 });
  }
);
```

### Get User Info
```typescript
req.user = {
  id: string;           // user.sub
  email: string;
  name: string;
  preferred_username: string;
  realm_access: {
    roles: string[];    // ['admin', 'developer']
  };
}
```

---

## 🔑 Keycloak Admin Console

**URL**: http://localhost:8081  
**Username**: admin  
**Password**: admin

### Setup Checklist

- [ ] Create realm "idp"
- [ ] Create client "idp-frontend" (public)
- [ ] Create client "idp-backend" (service account)
- [ ] Add valid redirect URIs to frontend client
- [ ] Create roles (admin, developer, viewer)
- [ ] Create test users
- [ ] Assign roles to users

---

## 📊 Token Payload

When user logs in, JWT contains:

```json
{
  "sub": "user-id",
  "email": "user@company.com",
  "name": "User Name",
  "preferred_username": "username",
  "realm_access": {
    "roles": ["admin", "developer"]
  },
  "iat": 1642000000,
  "exp": 1642003600
}
```

---

## 🚨 Common Errors

| Error | Solution |
|-------|----------|
| `CORS error` | Add frontend URL to Keycloak client URIs |
| `Token invalid` | Verify Keycloak URL matches between frontend/backend |
| `401 Unauthorized` | Add `Authorization: Bearer <token>` header |
| `Cannot connect to Keycloak` | Run `docker-compose up -d` |
| `User not found` | Create user in Keycloak admin console |

---

## 🧪 Curl Examples

### Get token (with password grant)
```bash
curl -X POST http://localhost:8081/realms/idp/protocol/openid-connect/token \
  -d "client_id=idp-backend" \
  -d "grant_type=password" \
  -d "username=testuser" \
  -d "password=testpass"
```

### Call protected endpoint
```bash
curl -H "Authorization: Bearer <TOKEN>" \
  http://localhost:3000/api/workflows
```

### Check token validity
```bash
# Get token value
TOKEN=$(echo <JWT> | cut -d'.' -f2 | base64 -d | jq .)
```

---

## 🔗 Useful Links

- [Keycloak Admin](http://localhost:8081/admin)
- [Frontend Dev](http://localhost:5173)
- [Backend API](http://localhost:3000)
- [API Docs](http://localhost:3000/api-docs)

---

## 📝 Architecture

```
Browser
   ↓ (user logs in)
Keycloak (http://localhost:8080)
   ↓ (issues JWT)
Frontend (http://localhost:5173)
   ↓ (includes JWT in every request)
Backend (http://localhost:3000)
   ↓ (verifies JWT, allows request)
Database
```

---

## 🎓 Learn More

See these files for complete details:
- `KEYCLOAK_SETUP.md` - Full Keycloak configuration
- `INTEGRATION_GUIDE.md` - Implementation guide
- `backend/docker/README.md` - Docker and services
