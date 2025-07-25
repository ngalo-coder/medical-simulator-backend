const User = require('../models/User');
const { generateToken, generateRefreshToken, verifyToken } = require('../utils/auth');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../utils/email');
const logger = require('../utils/logger');
const helpers = require('../utils/helpers');
const { JWT_REFRESH_SECRET } = require('../config/auth');

const register = async (req, res) => {
  try {
    // Log the incoming request for debugging
    logger.info('Registration attempt:', { 
      body: req.body, 
      validatedData: req.validatedData 
    });
    
    if (!req.validatedData) {
      logger.error('No validated data found in request');
      return res.status(400).json({ 
        error: 'Validation failed - no validated data', 
        code: 'NO_VALIDATED_DATA' 
      });
    }
    
    const { email, password, profile } = req.validatedData;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists', code: 'USER_EXISTS' });
    }

    // Create new user
    const user = new User({ email, password, profile });
    await user.save();

    // Generate tokens
    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    // Send welcome email
    await sendWelcomeEmail(user);

    logger.info(`New user registered: ${user.email}`);
    res.status(201).json({
      message: 'User registered successfully',
      user: helpers.sanitizeUser(user),
      accessToken,
      refreshToken
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed', code: 'REGISTRATION_ERROR' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.validatedData;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    // Update last login
    user.lastLogin = new Date();
    user.loginCount += 1;
    await user.save();

    // Generate tokens
    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    logger.info(`User logged in: ${user.email}`);
    res.json({
      message: 'Login successful',
      user: helpers.sanitizeUser(user),
      accessToken,
      refreshToken
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', code: 'LOGIN_ERROR' });
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required', code: 'NO_REFRESH_TOKEN' });
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken, JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'Invalid refresh token', code: 'INVALID_REFRESH_TOKEN' });
    }

    // Check if token exists in user's refresh tokens
    const tokenExists = user.refreshTokens.some(tokenObj => tokenObj.token === refreshToken);
    if (!tokenExists) {
      return res.status(401).json({ error: 'Invalid refresh token', code: 'INVALID_REFRESH_TOKEN' });
    }

    // Generate new tokens
    const newAccessToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Remove old refresh token and add new one
    user.refreshTokens = user.refreshTokens.filter(tokenObj => tokenObj.token !== refreshToken);
    user.refreshTokens.push({ token: newRefreshToken });
    await user.save();

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) {
    logger.error('Refresh token error:', error);
    res.status(401).json({ error: 'Invalid refresh token', code: 'INVALID_REFRESH_TOKEN' });
  }
};

const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await User.findByIdAndUpdate(req.userId, {
        $pull: { refreshTokens: { token: refreshToken } }
      });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed', code: 'LOGOUT_ERROR' });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ emailVerificationToken: token });
    if (!user) {
      return res.status(400).json({ error: 'Invalid verification token', code: 'INVALID_TOKEN' });
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    logger.error('Email verification error:', error);
    res.status(500).json({ error: 'Email verification failed', code: 'VERIFICATION_ERROR' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    // Generate password reset token
    const resetToken = helpers.generateRandomString(32);
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send password reset email
    await sendPasswordResetEmail(user, resetToken);

    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({ error: 'Password reset request failed', code: 'RESET_REQUEST_ERROR' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token', code: 'INVALID_TOKEN' });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({ error: 'Password reset failed', code: 'RESET_ERROR' });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }
    res.json(user);
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to retrieve profile', code: 'PROFILE_ERROR' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile', code: 'PROFILE_UPDATE_ERROR' });
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile
};