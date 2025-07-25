// services/emailService.js
const logger = require('../utils/logger');

// Mock email service for testing/development
const emailService = {
  async sendWelcomeEmail(user) {
    try {
      logger.info(`Mock: Sending welcome email to ${user.email}`);
      return { success: true, messageId: 'mock-welcome-' + Date.now() };
    } catch (error) {
      logger.error('Welcome email error:', error);
      throw error;
    }
  },

  async sendPasswordResetEmail(user, resetToken) {
    try {
      logger.info(`Mock: Sending password reset email to ${user.email}`);
      return { success: true, messageId: 'mock-reset-' + Date.now() };
    } catch (error) {
      logger.error('Password reset email error:', error);
      throw error;
    }
  },

  async sendAchievementNotification(user, achievement) {
    try {
      logger.info(`Mock: Sending achievement notification to ${user.email} for ${achievement.name}`);
      return { success: true, messageId: 'mock-achievement-' + Date.now() };
    } catch (error) {
      logger.error('Achievement email error:', error);
      throw error;
    }
  },

  async sendCaseReviewNotification(author, case_obj, review) {
    try {
      logger.info(`Mock: Sending case review notification to ${author.email} for case ${case_obj.title}`);
      return { success: true, messageId: 'mock-review-' + Date.now() };
    } catch (error) {
      logger.error('Case review email error:', error);
      throw error;
    }
  }
};

// If SendGrid is available, use it; otherwise use mock
try {
  const sgMail = require('@sendgrid/mail');
  
  if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    // Override with real SendGrid implementation
    emailService.sendWelcomeEmail = async (user) => {
      const msg = {
        to: user.email,
        from: process.env.FROM_EMAIL || 'noreply@medicalsimulator.com',
        subject: 'Welcome to Medical Case Simulator!',
        html: `
          <h1>Welcome ${user.profile.firstName}!</h1>
          <p>Thank you for joining Medical Case Simulator. Start your learning journey by exploring our case library.</p>
          <a href="${process.env.FRONTEND_URL}/cases" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Browse Cases</a>
        `
      };
      
      const result = await sgMail.send(msg);
      logger.info(`Welcome email sent to ${user.email}`);
      return result;
    };

    emailService.sendPasswordResetEmail = async (user, resetToken) => {
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
      
      const msg = {
        to: user.email,
        from: process.env.FROM_EMAIL || 'noreply@medicalsimulator.com',
        subject: 'Password Reset Request',
        html: `
          <h1>Password Reset Request</h1>
          <p>You requested a password reset for your Medical Case Simulator account.</p>
          <p>Click the link below to reset your password (expires in 1 hour):</p>
          <a href="${resetUrl}" style="background: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
          <p>If you didn't request this, please ignore this email.</p>
        `
      };
      
      const result = await sgMail.send(msg);
      logger.info(`Password reset email sent to ${user.email}`);
      return result;
    };
  }
} catch (error) {
  logger.warn('SendGrid not available, using mock email service');
}

module.exports = emailService;