import { Router, Request, Response } from 'express';
import { verifyToken, AuthRequest, requireAuth } from '../middleware/authMiddleware';

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
router.post('/logout', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Logged out successfully. Please logout from Keycloak in frontend.',
  });
});

/**
 * GET /api/auth/profile
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

export default router;
