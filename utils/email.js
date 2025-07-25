// utils/email.js - MISSING FILE
const emailService = require('../services/emailService');

const sendWelcomeEmail = async (user) => {
  return emailService.sendWelcomeEmail(user);
};

const sendPasswordResetEmail = async (user, resetToken) => {
  return emailService.sendPasswordResetEmail(user, resetToken);
};

module.exports = { sendWelcomeEmail, sendPasswordResetEmail };