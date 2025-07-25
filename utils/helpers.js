// ==================== utils/helpers.js ====================
const crypto = require('crypto');

const helpers = {
  // Generate random string
  generateRandomString(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  },

  // Generate session ID
  generateSessionId() {
    return `sess_${Date.now()}_${this.generateRandomString(16)}`;
  },

  // Sanitize user input
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/[<>]/g, '');
  },

  // Calculate percentage
  calculatePercentage(value, total) {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  },

  // Format time duration
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  },

  // Deep clone object
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  // Remove sensitive fields from user object
  sanitizeUser(user) {
    const sanitized = { ...user };
    delete sanitized.password;
    delete sanitized.refreshTokens;
    delete sanitized.passwordResetToken;
    delete sanitized.emailVerificationToken;
    return sanitized;
  },

  // Generate slug from title
  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  },

  // Paginate array
  paginate(array, page = 1, limit = 10) {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    return {
      data: array.slice(startIndex, endIndex),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(array.length / limit),
        totalItems: array.length,
        hasNext: endIndex < array.length,
        hasPrev: page > 1
      }
    };
  },

  // Validate email format
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Generate case difficulty score
  calculateDifficultyScore(case_obj) {
    let score = 0;
    
    // Base difficulty
    const difficultyMap = { beginner: 1, intermediate: 2, advanced: 3 };
    score += difficultyMap[case_obj.difficulty] || 1;
    
    // Complexity factors
    score += case_obj.simulationSteps.length * 0.1;
    score += case_obj.diagnostics.differentialDiagnosis.length * 0.05;
    
    return Math.min(score, 5); // Cap at 5
  },

  // Check if user can access resource
  canUserAccess(user, resource, action = 'read') {
    // Admin can access everything
    if (user.role === 'admin') return true;
    
    // Check specific permissions
    return user.permissions.some(perm => 
      perm.resource === resource && perm.actions.includes(action)
    );
  },

  // Format file size
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Capitalize first letter
  capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  },

  // Generate random color
  generateRandomColor() {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
      '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  },

  // Truncate text
  truncateText(text, maxLength = 100) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  },

  // Get file extension
  getFileExtension(filename) {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
  },

  // Sleep function
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // Retry function with exponential backoff
  async retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        const delay = baseDelay * Math.pow(2, i);
        await this.sleep(delay);
      }
    }
  }
};

module.exports = helpers;