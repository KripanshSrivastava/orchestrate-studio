import { Router, Response } from 'express';
import { verifyToken, AuthRequest, requireAuth } from '../middleware/authMiddleware.js';
import keycloakService from '../../services/auth/keycloakService.js';
import { validateSignupData, sanitizeUsername } from '../../utils/validation.js';
import { logAuthEvent } from '../../middleware/auditMiddleware.js';

const router = Router();

/**
 * GET /api/auth/user
 * Get current authenticated user info
 */
router.get('/user', verifyToken, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    user: req.user,
  });
});

/**
 * GET /api/auth/verify
 * Verify token is valid
 */
router.get('/verify', verifyToken, (req: AuthRequest, res: Response) => {
  if (req.user?.id && req.user?.email && req.traceId) {
    logAuthEvent(req.user.id, req.user.email, 'LOGIN', req.traceId, 'Token verified successfully');
  }

  res.json({
    success: true,
    message: 'Token is valid',
    user: req.user,
  });
});

/**
 * POST /api/auth/logout
 * Logout user (frontend should handle this via Keycloak)
 */
router.post('/logout', verifyToken, (req: AuthRequest, res: Response) => {
  if (req.user?.id && req.user?.email && req.traceId) {
    logAuthEvent(req.user.id, req.user.email, 'LOGOUT', req.traceId, 'User initiated logout');
  }

  res.json({
    success: true,
    message: 'Logged out successfully. Please logout from Keycloak in frontend.',
  });
});

/**
 * POST /api/auth/profile
 * Get user profile (requires authentication)
 */
router.get('/profile', requireAuth, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    profile: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      username: req.user.preferred_username,
    },
  });
});

/**
 * POST /api/auth/signup
 * Create a new user account in Keycloak
 */
router.post('/signup', async (req: AuthRequest, res: Response) => {
  try {
    const { firstName, lastName, email, password, confirmPassword } = req.body;

    // Validate input
    const validation = validateSignupData({
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
    });

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        fieldErrors: validation.errors,
      });
    }

    // Check if email already exists
    const existingUser = await keycloakService.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered',
        fieldErrors: { email: 'This email is already associated with an account' },
      });
    }

    // Generate username from email
    const username = sanitizeUsername(email.split('@')[0]);

    // Create user in Keycloak
    const userId = await keycloakService.createUser({
      username,
      email,
      firstName,
      lastName,
      enabled: true,
      credentials: [
        {
          type: 'password',
          value: password,
          temporary: false,
        },
      ],
    });

    // Assign user role (optional)
    try {
      await keycloakService.assignRoleToUser(userId, 'user');
    } catch (roleError) {
      // Role assignment is not critical, log and continue
      console.warn('⚠️ Failed to assign default role:', roleError);
    }

    // Wait for Keycloak to propagate the new user, then retry auto-login
    let tokenData;
    let lastTokenError: unknown;
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, attempt * 500));

      try {
        tokenData = await keycloakService.getTokenForUser(username, password);
        break;
      } catch (tokenError) {
        lastTokenError = tokenError;
        console.warn(`⚠️ Auto-login attempt ${attempt} failed after signup:`, tokenError);
      }
    }

    if (!tokenData) {
      console.error('❌ Auto-login failed after signup retries:', lastTokenError);
      return res.status(500).json({
        success: false,
        error: 'Account created, but automatic sign-in failed. Please try again.',
      });
    }

    // Decode token to get user info
    let decodedToken;
    try {
      const tokenParts = tokenData.access_token.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Invalid token format');
      }
      decodedToken = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    } catch (decodeError) {
      console.error('❌ Error decoding token:', decodeError);
      return res.status(500).json({
        success: false,
        error: 'Failed to decode authentication token',
      });
    }

    if (req.traceId && decodedToken.sub && decodedToken.email) {
      logAuthEvent(decodedToken.sub, decodedToken.email, 'SIGNUP', req.traceId, 'Account created and auto-login completed');
      logAuthEvent(decodedToken.sub, decodedToken.email, 'LOGIN', req.traceId, 'Auto-login after signup');
    }

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      token: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      user: {
        id: decodedToken.sub,
        email: decodedToken.email,
        name: `${firstName} ${lastName}`,
        preferred_username: decodedToken.preferred_username,
      },
    });
  } catch (error) {
    console.error('❌ Signup error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Signup failed';

    if (errorMessage.includes('Failed to create user')) {
      return res.status(400).json({
        success: false,
        error: 'Failed to create user account. Please try again.',
      });
    }

    // Auto-login failure is now handled inside try block above

    return res.status(500).json({
      success: false,
      error: 'Server error during signup',
    });
  }
});

export default router;
