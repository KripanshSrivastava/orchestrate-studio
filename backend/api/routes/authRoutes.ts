import { Router, Request, Response } from 'express';
import { verifyToken, AuthRequest, requireAuth } from '../middleware/authMiddleware';
import keycloakService from '../../services/auth/keycloakService';
import { validateSignupData, sanitizeUsername } from '../../utils/validation';

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
router.post('/logout', (_req: Request, res: Response) => {
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
router.post('/signup', async (req: Request, res: Response) => {
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

    // Wait a brief moment for Keycloak to propagate the new user
    await new Promise(resolve => setTimeout(resolve, 500));

    // Get token for the newly created user (using username, not email)
    let tokenData;
    try {
      tokenData = await keycloakService.getTokenForUser(username, password);
    } catch (tokenError) {
      console.warn('⚠️ Auto-login failed after signup:', tokenError);
      return res.status(201).json({
        success: true,
        message: 'Account created successfully. Please login with your credentials.',
        autoLogin: false,
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
