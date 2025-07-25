// services/emailService.js
const sgMail = require('@sendgrid/mail');
const logger = require('../utils/logger');

// Set SendGrid API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  logger.warn('SendGrid API key not configured. Email functionality will be disabled.');
}

const emailService = {
  // Base email sending function
  async sendEmail(to, subject, html, text = '') {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        logger.warn('SendGrid API key not configured, skipping email');
        return { success: false, message: 'Email service not configured' };
      }

      const msg = {
        to,
        from: {
          email: process.env.FROM_EMAIL || 'noreply@medical-simulator.com',
          name: 'Medical Case Simulator'
        },
        subject,
        text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        html
      };

      const result = await sgMail.send(msg);
      logger.info(`Email sent successfully to ${to}: ${subject}`);
      return { success: true, messageId: result[0].headers['x-message-id'] };

    } catch (error) {
      logger.error('Email send error:', {
        error: error.message,
        to,
        subject,
        code: error.code,
        response: error.response?.body
      });
      throw new Error(`Failed to send email: ${error.message}`);
    }
  },

  // Welcome email for new users
  async sendWelcomeEmail(user) {
    const subject = 'Welcome to Medical Case Simulator! 🏥';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Medical Case Simulator</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header { background: linear-gradient(135deg, #2c5aa0 0%, #1e3d72 100%); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 300; }
          .content { padding: 40px 30px; }
          .welcome-box { background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #2c5aa0; }
          .feature-list { list-style: none; padding: 0; }
          .feature-list li { padding: 8px 0; position: relative; padding-left: 25px; }
          .feature-list li:before { content: "✅"; position: absolute; left: 0; }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #2c5aa0 0%, #1e3d72 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: 500; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏥 Welcome to Medical Case Simulator!</h1>
          </div>
          
          <div class="content">
            <h2>Dear ${user.profile.firstName},</h2>
            
            <p>Welcome to the most advanced medical case simulation platform! We're thrilled to have you join our community of healthcare professionals and students dedicated to excellence in medical education.</p>
            
            <div class="welcome-box">
              <h3>Your Account Details:</h3>
              <ul style="margin: 10px 0;">
                <li><strong>Email:</strong> ${user.email}</li>
                <li><strong>Role:</strong> ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}</li>
                <li><strong>Institution:</strong> ${user.profile.institution || 'Not specified'}</li>
                ${user.profile.specialty ? `<li><strong>Specialty:</strong> ${user.profile.specialty}</li>` : ''}
              </ul>
            </div>
            
            <h3>🚀 What You Can Do:</h3>
            <ul class="feature-list">
              <li>Explore our comprehensive case library across all medical specialties</li>
              <li>Practice with interactive patient simulations</li>
              <li>Track your learning progress with advanced analytics</li>
              <li>Participate in case discussions with peers and instructors</li>
              <li>Earn achievements and build your competency profile</li>
              <li>Get AI-powered case recommendations tailored to your learning needs</li>
            </ul>
            
            <h3>🎯 Getting Started:</h3>
            <ol>
              <li><strong>Browse Cases:</strong> Start by exploring cases in your specialty or interest area</li>
              <li><strong>Take Your First Simulation:</strong> Begin with beginner-level cases to get familiar with the platform</li>
              <li><strong>Review Your Progress:</strong> Check your dashboard to track your learning journey</li>
              <li><strong>Join Discussions:</strong> Engage with our community of learners and educators</li>
            </ol>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'https://medical-simulator.com'}/dashboard" class="cta-button">
                Start Learning Now 🎓
              </a>
            </div>
            
            <p>If you have any questions or need assistance, our support team is here to help. Simply reply to this email or visit our help center.</p>
            
            <p>Happy learning and welcome aboard!</p>
            
            <p><strong>The Medical Case Simulator Team</strong><br>
            <em>Advancing medical education through innovative simulation</em></p>
          </div>
          
          <div class="footer">
            <p>© 2024 Medical Case Simulator. All rights reserved.</p>
            <p>This email was sent to ${user.email} as part of your account registration.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(user.email, subject, html);
  },

  // Password reset email
  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL || 'https://medical-simulator.com'}/reset-password?token=${resetToken}`;
    const subject = 'Password Reset Request - Medical Case Simulator';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Request</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header { background: linear-gradient(135deg, #2c5aa0 0%, #1e3d72 100%); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 300; }
          .content { padding: 40px 30px; }
          .alert-box { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .reset-button { display: inline-block; background: linear-gradient(135deg, #2c5aa0 0%, #1e3d72 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: 500; }
          .security-info { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; font-size: 14px; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          
          <div class="content">
            <h2>Dear ${user.profile.firstName},</h2>
            
            <p>We received a request to reset the password for your Medical Case Simulator account associated with <strong>${user.email}</strong>.</p>
            
            <div class="alert-box">
              <strong>⏰ Important:</strong> This password reset link will expire in <strong>1 hour</strong> for security reasons.
            </div>
            
            <p>To reset your password, click the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" class="reset-button">
                🔓 Reset My Password
              </a>
            </div>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px;">
              ${resetUrl}
            </p>
            
            <div class="security-info">
              <h4>🛡️ Security Information:</h4>
              <ul>
                <li>If you didn't request this password reset, please ignore this email - your account is still secure</li>
                <li>This link can only be used once</li>
                <li>For your security, we recommend using a strong, unique password</li>
                <li>Never share your password with anyone</li>
              </ul>
            </div>
            
            <p>If you continue to have trouble accessing your account, please contact our support team.</p>
            
            <p><strong>The Medical Case Simulator Team</strong></p>
          </div>
          
          <div class="footer">
            <p>© 2024 Medical Case Simulator. All rights reserved.</p>
            <p>This email was sent to ${user.email} in response to a password reset request.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(user.email, subject, html);
  },

  // Case review notification email
  async sendCaseReviewNotification(caseAuthor, case_obj, review) {
    const subject = `Case Review Completed: "${case_obj.title}"`;
    const statusColor = review.status === 'approved' ? '#28a745' : review.status === 'rejected' ? '#dc3545' : '#ffc107';
    const statusIcon = review.status === 'approved' ? '✅' : review.status === 'rejected' ? '❌' : '⚠️';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Case Review Completed</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header { background: linear-gradient(135deg, #2c5aa0 0%, #1e3d72 100%); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 300; }
          .content { padding: 40px 30px; }
          .review-summary { background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${statusColor}; }
          .status-badge { display: inline-block; background-color: ${statusColor}; color: white; padding: 5px 10px; border-radius: 4px; font-weight: 500; }
          .score-bar { background-color: #e9ecef; height: 20px; border-radius: 10px; overflow: hidden; margin: 10px 0; }
          .score-fill { background: linear-gradient(90deg, #28a745, #20c997); height: 100%; transition: width 0.3s ease; }
          .action-button { display: inline-block; background: linear-gradient(135deg, #2c5aa0 0%, #1e3d72 100%); color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 15px 5px; font-weight: 500; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Case Review Completed</h1>
          </div>
          
          <div class="content">
            <h2>Dear ${caseAuthor.profile.firstName},</h2>
            
            <p>Your case "<strong>${case_obj.title}</strong>" has been reviewed by our medical education team.</p>
            
            <div class="review-summary">
              <h3 style="margin-top: 0;">📊 Review Summary</h3>
              
              <p><strong>Status:</strong> <span class="status-badge">${statusIcon} ${review.status.replace('_', ' ').toUpperCase()}</span></p>
              
              <p><strong>Overall Score:</strong> ${review.overallScore}/5</p>
              <div class="score-bar">
                <div class="score-fill" style="width: ${(review.overallScore / 5) * 100}%"></div>
              </div>
              
              <p><strong>Review Type:</strong> ${review.reviewType.charAt(0).toUpperCase() + review.reviewType.slice(1)} Review</p>
              
              ${review.overallComments ? `
                <h4>📝 Reviewer Comments:</h4>
                <p style="background-color: white; padding: 15px; border-radius: 5px; border-left: 3px solid #2c5aa0; font-style: italic;">
                  "${review.overallComments}"
                </p>
              ` : ''}
              
              ${review.criteria ? `
                <h4>📈 Detailed Scores:</h4>
                <ul>
                  ${Object.entries(review.criteria).map(([key, criterion]) => `
                    <li><strong>${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</strong> ${criterion.score}/5</li>
                  `).join('')}
                </ul>
              ` : ''}
            </div>
            
            ${review.status === 'approved' ? `
              <p>🎉 <strong>Congratulations!</strong> Your case has been approved and is now published in our case library. Students and healthcare professionals can now access and learn from your contribution.</p>
            ` : review.status === 'rejected' ? `
              <p>📚 Your case needs some revisions before it can be published. Please review the feedback above and make the necessary improvements.</p>
            ` : `
              <p>📝 Your case requires some minor revisions. Please address the feedback provided and resubmit for review.</p>
            `}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'https://medical-simulator.com'}/cases/${case_obj._id}" class="action-button">
                View Case Details
              </a>
              ${review.status !== 'approved' ? `
                <a href="${process.env.FRONTEND_URL || 'https://medical-simulator.com'}/cases/${case_obj._id}/edit" class="action-button">
                  Edit Case
                </a>
              ` : ''}
            </div>
            
            <p>Thank you for contributing to medical education. Your expertise helps train the next generation of healthcare professionals.</p>
            
            <p><strong>The Medical Case Simulator Review Team</strong></p>
          </div>
          
          <div class="footer">
            <p>© 2024 Medical Case Simulator. All rights reserved.</p>
            <p>This review notification was sent to ${caseAuthor.email}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(caseAuthor.email, subject, html);
  },

  // Achievement notification email
  async sendAchievementNotification(user, achievement) {
    const subject = `🏆 Achievement Unlocked: ${achievement.name}!`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Achievement Unlocked!</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header { background: linear-gradient(135deg, #ffd700 0%, #ffb347 100%); padding: 30px; text-align: center; }
          .header h1 { color: #333; margin: 0; font-size: 28px; font-weight: 600; }
          .content { padding: 40px 30px; text-align: center; }
          .achievement-box { background: linear-gradient(135deg, #ffd700 0%, #ffb347 100%); padding: 40px; border-radius: 15px; margin: 30px 0; box-shadow: 0 10px 30px rgba(255, 215, 0, 0.3); }
          .achievement-icon { font-size: 80px; margin-bottom: 20px; }
          .achievement-name { font-size: 24px; font-weight: bold; color: #333; margin: 10px 0; }
          .achievement-description { font-size: 16px; color: #555; margin: 10px 0; }
          .stats-box { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; }
          .continue-button { display: inline-block; background: linear-gradient(135deg, #2c5aa0 0%, #1e3d72 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: 500; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Achievement Unlocked!</h1>
          </div>
          
          <div class="content">
            <h2>Congratulations, ${user.profile.firstName}!</h2>
            
            <div class="achievement-box">
              <div class="achievement-icon">${achievement.icon || '🏆'}</div>
              <div class="achievement-name">${achievement.name}</div>
              <div class="achievement-description">${achievement.description}</div>
              <p style="margin-top: 20px; font-size: 14px; color: #666;">
                Earned on ${new Date(achievement.earnedDate || new Date()).toLocaleDateString()}
              </p>
            </div>
            
            <p>You've reached a new milestone in your medical education journey! This achievement reflects your dedication to learning and improving your clinical skills.</p>
            
            <div class="stats-box">
              <h3>🎯 Your Progress</h3>
              <p><strong>Total Achievements:</strong> ${user.achievements ? user.achievements.length + 1 : 1}</p>
              <p><strong>Cases Completed:</strong> ${user.statistics?.casesCompleted || 0}</p>
              <p><strong>Current Streak:</strong> ${user.statistics?.streakDays || 0} days</p>
            </div>
            
            <p>Keep up the excellent work! Continue practicing with our medical cases to unlock more achievements and enhance your clinical expertise.</p>
            
            <div style="margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'https://medical-simulator.com'}/dashboard" class="continue-button">
                Continue Learning 📚
              </a>
            </div>
            
            <p><strong>The Medical Case Simulator Team</strong><br>
            <em>Celebrating your success in medical education</em></p>
          </div>
          
          <div class="footer">
            <p>© 2024 Medical Case Simulator. All rights reserved.</p>
            <p>This achievement notification was sent to ${user.email}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(user.email, subject, html);
  },

  // Email verification email
  async sendEmailVerification(user, verificationToken) {
    const verificationUrl = `${process.env.FRONTEND_URL || 'https://medical-simulator.com'}/verify-email?token=${verificationToken}`;
    const subject = 'Verify Your Email - Medical Case Simulator';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header { background: linear-gradient(135deg, #2c5aa0 0%, #1e3d72 100%); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 300; }
          .content { padding: 40px 30px; }
          .verify-button { display: inline-block; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: 500; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✉️ Verify Your Email Address</h1>
          </div>
          
          <div class="content">
            <h2>Dear ${user.profile.firstName},</h2>
            
            <p>Thank you for registering with Medical Case Simulator! To complete your account setup and start learning, please verify your email address.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" class="verify-button">
                ✅ Verify My Email
              </a>
            </div>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px;">
              ${verificationUrl}
            </p>
            
            <p>This verification link will expire in 24 hours for security reasons.</p>
            
            <p>If you didn't create this account, please ignore this email.</p>
            
            <p><strong>The Medical Case Simulator Team</strong></p>
          </div>
          
          <div class="footer">
            <p>© 2024 Medical Case Simulator. All rights reserved.</p>
            <p>This verification email was sent to ${user.email}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(user.email, subject, html);
  },

  // System notification email
  async sendSystemNotification(user, notification) {
    const subject = `System Notification: ${notification.title}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>System Notification</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header { background: linear-gradient(135deg, #2c5aa0 0%, #1e3d72 100%); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 300; }
          .content { padding: 40px 30px; }
          .notification-box { background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #2c5aa0; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📢 System Notification</h1>
          </div>
          
          <div class="content">
            <h2>Dear ${user.profile.firstName},</h2>
            
            <div class="notification-box">
              <h3>${notification.title}</h3>
              <p>${notification.message}</p>
              ${notification.details ? `<p><strong>Details:</strong> ${notification.details}</p>` : ''}
            </div>
            
            <p>This is an automated notification from the Medical Case Simulator system.</p>
            
            <p><strong>The Medical Case Simulator Team</strong></p>
          </div>
          
          <div class="footer">
            <p>© 2024 Medical Case Simulator. All rights reserved.</p>
            <p>This system notification was sent to ${user.email}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(user.email, subject, html);
  }
};

module.exports = emailService;