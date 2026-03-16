# Authentication Testing Guide

## ✅ What Was Fixed

### 1. **LoginPage.tsx** - Now Actually Authenticates ✅
- ❌ **BEFORE**: Button just navigated to dashboard without checking credentials
- ✅ **AFTER**: 
  - Calls Keycloak token endpoint with email/password
  - Shows error message if login fails
  - Only redirects to dashboard on successful authentication
  - Shows loading state while authenticating

### 2. **App.tsx** - Now Protects Routes ✅
- ❌ **BEFORE**: Dashboard accessible without authentication
- ✅ **AFTER**: 
  - All dashboard/app routes wrapped in `<ProtectedRoute />`
  - Automatically redirects unauthenticated users to `/login`

### 3. **AuthProvider.tsx** - Now Supports Custom Login ✅
- ❌ **BEFORE**: Used `onLoad: 'login-required'` (forces Keycloak UI)
- ✅ **AFTER**: 
  - Uses `onLoad: 'check-sso'` (allows custom login page)
  - Initializes Keycloak without redirecting

### 4. **ProtectedRoute.tsx** - Now Properly Checks Token ✅
- ✅ Checks both `keycloak.authenticated` AND `keycloak.token`
- ✅ Logs authentication status for debugging
- ✅ Redirects to `/login` if not authenticated

### 5. **useAuth.ts** - Now Better Reactive ✅
- ✅ Returns current authentication state
- ✅ Provides logout function with correct redirect
- ✅ Returns user info and token

---

## 🧪 How to Test

### Test 1: Login with Wrong Credentials
```
1. Open http://localhost:8080/dashboard
   → Should redirect to http://localhost:8080/login (because not authenticated)

2. Enter WRONG credentials:
   - Email: testuser@example.com
   - Password: wrongpassword

3. Click "Sign in"
   → Should show red error: "Invalid credentials" (or similar)
   → Should NOT redirect anywhere
   → Should stay on login page
```

### Test 2: Login with Correct Credentials
```
1. Open http://localhost:8080/login

2. Enter CORRECT credentials:
   - Email: testuser@example.com
   - Password: testpass123

3. Click "Sign in"
   → Button shows "Authenticating..." while processing
   → Should redirect to http://localhost:8080/dashboard
   → Should see dashboard content
   → Should have "Welcome" message with user info
```

### Test 3: Verify Token is Attached to API Calls
```
1. Login successfully (see Test 2)

2. Open browser DevTools → Network tab

3. Click any button that makes an API call (e.g., load workflows)

4. Look at the request headers:
   → Should see: Authorization: Bearer eyJhbGc...
   → If missing, token attachment failed
```

### Test 4: Try Accessing Dashboard Without Login
```
1. Open http://localhost:8080/dashboard (in new tab or after logout)
   → Should immediately redirect to http://localhost:8080/login
   → Should NOT show dashboard content
```

### Test 5: Logout
```
1. Login successfully

2. Find user profile dropdown (usually top right)

3. Click "Logout"
   → Should redirect to http://localhost:8080/login
   → Token should be cleared
   → Accessing /dashboard should redirect to /login again
```

### Test 6: Session Persistence
```
1. Login successfully

2. Refresh the page (F5)
   → Should stay logged in (Keycloak JS stores token in localStorage)
   → Should NOT redirect to login

3. Close browser tab and reopen http://localhost:8080
   → Should be logged in (token persisted)
```

---

## 🐛 If Tests Fail

### Issue: "Invalid credentials" error even with correct password
**Solution:**
1. Check if Keycloak has the user:
   - http://localhost:8081/admin → Realms → idp → Users
   - Look for "testuser"
   - If missing, create it (follow KEYCLOAK_DETAILED_SETUP.md Step 3.2)

2. Check `.env.local` has correct values:
   ```env
   VITE_KEYCLOAK_URL=http://localhost:8081
   VITE_KEYCLOAK_REALM=idp
   VITE_KEYCLOAK_CLIENT_ID=idp-frontend
   ```

3. Check if frontend client is correctly configured in Keycloak:
   - Go to http://localhost:8081/admin
   - Realms → idp → Clients → idp-frontend
   - Settings tab should have:
     - Valid redirect URIs: includes `http://localhost:8080/*`
     - Web Origins: includes `http://localhost:8080`

### Issue: Login button does nothing / page freezes
**Solution:**
1. Check browser console (F12 → Console)
   - Look for red errors
   - Copy the error message

2. Check if Keycloak is running:
   ```bash
   docker ps
   # Should show idp-keycloak container running
   ```

3. Check if token endpoint is accessible:
   ```bash
   curl http://localhost:8081/realms/idp/protocol/openid-connect/token
   # Should return 400 (bad request), not 404 or connection refused
   ```

### Issue: Login works but token not attached to API calls
**Solution:**
1. Check if `apiClient.ts` is being used:
   - When making API calls, use:
     ```typescript
     import { apiGet, apiPost } from '@/lib/apiClient';
     const data = await apiGet('/api/workflows');
     ```
   - NOT: `fetch('/api/workflows')` directly

2. Check if backend `.env` has Keycloak URL:
   ```bash
   cat backend/.env | grep KEYCLOAK
   # Should show:
   # KEYCLOAK_URL=http://localhost:8081
   # KEYCLOAK_REALM=idp
   ```

### Issue: Dashboard accessible without login
**Solution:**
1. Make sure routes are wrapped in `<ProtectedRoute />`
   - Check App.tsx
   - Should look like:
     ```tsx
     <Route element={<ProtectedRoute />}>
       <Route path="/dashboard" element={<Dashboard />} />
       ...
     </Route>
     ```

2. Clear browser cache and hard refresh (Ctrl+Shift+R)

---

## 📊 Expected Behavior Summary

| Action | Expected Result |
|--------|-----------------|
| Open `/dashboard` without token | Redirects to `/login` |
| Enter wrong password | Shows error, stays on login |
| Enter correct password | Redirects to `/dashboard` |
| Try API call after login | Authorization header attached |
| Click logout | Redirects to `/login`, token cleared |
| Refresh page while logged in | Stays logged in (token persisted) |
| Open DevTools Network tab | See `Authorization: Bearer <token>` headers |

---

## 🔍 Debug Logging

The authentication system now includes console logs to help debug. To see them:

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for messages starting with:
   - ✅ (successful operations)
   - ❌ (errors)
   - 🔔 (state changes)
   - 🔐 (authentication actions)
   - 🚪 (logout actions)
   - 🔒 (route protection)
   - ⏰ (token expiration)

Example output:
```
✅ Keycloak initialized. Authenticated: false
✅ Login successful, redirecting to dashboard...
🔔 useAuth: isAuthenticated = true, token = present
🔒 ProtectedRoute: User authenticated, rendering protected content
```

---

## 📋 Checklist for Production Readiness

- [ ] Login with correct credentials works
- [ ] Login with wrong credentials shows error
- [ ] Dashboard not accessible without authentication
- [ ] Token attached to all API requests (check Network tab)
- [ ] Logout works and clears session
- [ ] Session persists after page refresh
- [ ] No CORS errors in console
- [ ] No "invalid token" errors from backend
- [ ] User info displayed correctly after login
- [ ] "Forgot password?" and "Create account" links (ready for implementation)

---

## 🚀 Next Steps

1. ✅ **Test the flow** using tests above
2. ✅ **Fix any issues** using troubleshooting section
3. ✅ **Implement backend endpoints** that use `verifyToken` middleware
4. ✅ **Add more SSO providers** (GitHub, Google - buttons already in UI)
5. ✅ **Implement "Forgot Password" flow**
6. ✅ **Implement "Create Account" flow**

---

Generated: March 16, 2026
