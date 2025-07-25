const { authenticateToken, optionalAuth } = require('../../../middleware/auth');
const jwt = require('jsonwebtoken');
const User = require('../../../models/User');

// Mock the User model
jest.mock('../../../models/User');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      user: null,
      userId: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    it('should authenticate valid token successfully', async () => {
      const user = {
        _id: 'user123',
        email: 'test@example.com',
        role: 'student'
      };

      // Mock JWT verification
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
      req.headers.authorization = `Bearer ${token}`;

      // Mock User.findById
      User.findById.mockResolvedValue(user);
      User.findByIdAndUpdate.mockResolvedValue(user);

      await authenticateToken(req, res, next);

      expect(req.user).toEqual(user);
      expect(req.userId).toBe(user._id);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject request without token', async () => {
      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access token required',
        code: 'NO_TOKEN'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token', async () => {
      req.headers.authorization = 'Bearer invalid-token';

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request when user not found', async () => {
      const token = jwt.sign({ userId: 'nonexistent' }, process.env.JWT_SECRET);
      req.headers.authorization = `Bearer ${token}`;

      User.findById.mockResolvedValue(null);

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: 'user123', exp: Math.floor(Date.now() / 1000) - 3600 },
        process.env.JWT_SECRET
      );
      req.headers.authorization = `Bearer ${expiredToken}`;

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const token = jwt.sign({ userId: 'user123' }, process.env.JWT_SECRET);
      req.headers.authorization = `Bearer ${token}`;

      User.findById.mockRejectedValue(new Error('Database error'));

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication service error',
        code: 'AUTH_ERROR'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should authenticate valid token when provided', async () => {
      const user = {
        _id: 'user123',
        email: 'test@example.com',
        role: 'student'
      };

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
      req.headers.authorization = `Bearer ${token}`;

      User.findById.mockResolvedValue(user);

      await optionalAuth(req, res, next);

      expect(req.user).toEqual(user);
      expect(req.userId).toBe(user._id);
      expect(next).toHaveBeenCalled();
    });

    it('should continue without authentication when no token provided', async () => {
      await optionalAuth(req, res, next);

      expect(req.user).toBeNull();
      expect(req.userId).toBeNull();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue without authentication when invalid token provided', async () => {
      req.headers.authorization = 'Bearer invalid-token';

      await optionalAuth(req, res, next);

      expect(req.user).toBeNull();
      expect(req.userId).toBeNull();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue without authentication when user not found', async () => {
      const token = jwt.sign({ userId: 'nonexistent' }, process.env.JWT_SECRET);
      req.headers.authorization = `Bearer ${token}`;

      User.findById.mockResolvedValue(null);

      await optionalAuth(req, res, next);

      expect(req.user).toBeNull();
      expect(req.userId).toBeNull();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});