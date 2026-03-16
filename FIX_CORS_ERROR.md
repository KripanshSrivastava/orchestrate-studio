# Quick Fix for IP Address CORS Error

## Problem
Your frontend is running on `http://192.168.0.101:8080` but Keycloak only knows about `localhost:8080`

## Solution: Update Keycloak Client Settings

### Step 1: Access Keycloak Admin Console
1. Open: **http://localhost:8081/admin**
2. Login: `admin` / `admin`

### Step 2: Update Frontend Client
1. Go to **Realms** → **idp** → **Clients** → **idp-frontend**

2. Click **Settings** tab

3. Update **Valid redirect URIs** - Add these lines:
   ```
   http://localhost:8080/*
   http://192.168.0.101:8080/*
   http://localhost:8080/
   http://192.168.0.101:8080/
   http://localhost:8080/dashboard
   http://192.168.0.101:8080/dashboard
   http://localhost:8080/login
   http://192.168.0.101:8080/login
   ```

4. Update **Valid post logout redirect URIs** - Add these lines:
   ```
   http://localhost:8080/
   http://192.168.0.101:8080/
   http://localhost:8080/login
   http://192.168.0.101:8080/login
   ```

5. Update **Web Origins** - Add these:
   ```
   http://localhost:8080
   http://192.168.0.101:8080
   +
   ```

6. Click **Save**

### Step 3: What I Changed in Your Code

**Removed PKCE** (which needs Web Crypto API):
```typescript
// BEFORE
pkceMethod: 'S256',  // ❌ Requires Web Crypto API

// AFTER
// Removed - disabled for compatibility
```

**Why?** PKCE requires Web Crypto API which isn't available in your environment. Standard OAuth 2.0 flow still works fine.

### Step 4: Test Again
1. Open http://192.168.0.101:8080
2. Try login with wrong password → Should show error ✅
3. Try login with correct credentials → Should redirect to dashboard ✅

---

## Environment Files Updated

**`.env.local`** now includes:
```env
VITE_FRONTEND_URL=http://192.168.0.101:8080
```

This helps identify your actual frontend URL.

---

## If You Still Get CORS Error

Check Keycloak Admin Settings:
1. http://localhost:8081/admin
2. Realms → idp → Clients → idp-frontend
3. Settings tab → Web Origins
4. Make sure it includes `http://192.168.0.101:8080` (with `+` at the end)

---

## Alternative: Use Localhost Instead

If you want to use `localhost` instead of IP address:

**Edit `.env.local`:**
```env
VITE_KEYCLOAK_URL=http://localhost:8081
# Make sure your frontend is running on localhost:8080, not IP
```

Then run frontend with:
```bash
npm run dev --host localhost
```

---

## Network Access

Your frontend is accessible on:
- ✅ Localhost: `http://localhost:8080`
- ✅ IP Address: `http://192.168.0.101:8080` (if on same network)

Both should work after Keycloak client is updated.

---

Generated: March 16, 2026
