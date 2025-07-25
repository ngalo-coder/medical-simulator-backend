const crypto = require('crypto');
const logger = require('../utils/logger');
const { redisUtils } = require('../config/redis');

// Advanced security middleware
const securityHeaders = (req, res, next) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  next();
};

// Request sanitization
const sanitizeInput = (req, res, next) => {
  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  next();
};

// Sanitize object recursively
const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = sanitizeString(key);
    sanitized[sanitizedKey] = sanitizeObject(value);
  }
  
  return sanitized;
};

// Sanitize string values
const sanitizeString = (value) => {
  if (typeof value !== 'string') {
    return value;
  }
  
  // Remove potential XSS patterns
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/data:text\/html/gi, '');
};

// IP-based security monitoring
const ipSecurityMonitoring = async (req, res, next) => {
  const clientIP = req.ip;
  const userAgent = req.get('User-Agent') || 'unknown';
  
  try {
    // Check for suspicious activity
    const suspiciousActivity = await checkSuspiciousActivity(clientIP, req);
    
    if (suspiciousActivity.blocked) {
      logger.warn('Blocked suspicious request', {
        ip: clientIP,
        userAgent,
        url: req.originalUrl,
        reason: suspiciousActivity.reason,
        timestamp: new Date().toISOString()
      });
      
      return res.status(429).json({
        error: 'Request blocked due to suspicious activity',
        code: 'SUSPICIOUS_ACTIVITY_BLOCKED'
      });
    }
    
    // Log security events
    if (suspiciousActivity.flagged) {
      logger.warn('Flagged suspicious activity', {
        ip: clientIP,
        userAgent,
        url: req.originalUrl,
        flags: suspiciousActivity.flags,
        timestamp: new Date().toISOString()
      });
    }
    
    // Track request for this IP
    await trackIPActivity(clientIP, req);
    
  } catch (error) {
    logger.error('IP security monitoring error:', error);
    // Continue processing - don't block on monitoring errors
  }
  
  next();
};

// Check for suspicious activity patterns
const checkSuspiciousActivity = async (ip, req) => {
  const result = {
    blocked: false,
    flagged: false,
    flags: [],
    reason: null
  };
  
  try {
    // Check if IP is in blocklist
    const isBlocked = await redisUtils.get(`blocked_ip:${ip}`);
    if (isBlocked) {
      result.blocked = true;
      result.reason = 'IP in blocklist';
      return result;
    }
    
    // Get recent activity for this IP
    const activityKey = `ip_activity:${ip}`;
    const activity = await redisUtils.get(activityKey) || {
      requests: [],
      failedLogins: 0,
      suspiciousPatterns: 0
    };
    
    // Check request frequency
    const now = Date.now();
    const recentRequests = activity.requests.filter(timestamp => now - timestamp < 60000); // Last minute
    
    if (recentRequests.length > 100) { // More than 100 requests per minute
      result.blocked = true;
      result.reason = 'Excessive request frequency';
      return result;
    }
    
    if (recentRequests.length > 50) {
      result.flagged = true;
      result.flags.push('high_frequency');
    }
    
    // Check for failed login attempts
    if (activity.failedLogins > 10) {
      result.blocked = true;
      result.reason = 'Too many failed login attempts';
      return result;
    }
    
    if (activity.failedLogins > 5) {
      result.flagged = true;
      result.flags.push('multiple_failed_logins');
    }
    
    // Check for suspicious patterns
    const userAgent = req.get('User-Agent') || '';
    if (isSuspiciousUserAgent(userAgent)) {
      result.flagged = true;
      result.flags.push('suspicious_user_agent');
    }
    
    // Check for SQL injection patterns in URL
    if (containsSQLInjectionPatterns(req.originalUrl)) {
      result.flagged = true;
      result.flags.push('sql_injection_attempt');
      activity.suspiciousPatterns++;
    }
    
    // Check for XSS patterns
    if (containsXSSPatterns(req.originalUrl) || containsXSSPatterns(JSON.stringify(req.body))) {
      result.flagged = true;
      result.flags.push('xss_attempt');
      activity.suspiciousPatterns++;
    }
    
    // Block if too many suspicious patterns
    if (activity.suspiciousPatterns > 5) {
      result.blocked = true;
      result.reason = 'Multiple suspicious patterns detected';
      await redisUtils.set(`blocked_ip:${ip}`, true, 3600); // Block for 1 hour
    }
    
  } catch (error) {
    logger.error('Error checking suspicious activity:', error);
  }
  
  return result;
};

// Track IP activity
const trackIPActivity = async (ip, req) => {
  try {
    const activityKey = `ip_activity:${ip}`;
    const activity = await redisUtils.get(activityKey) || {
      requests: [],
      failedLogins: 0,
      suspiciousPatterns: 0,
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString()
    };
    
    // Add current request timestamp
    activity.requests.push(Date.now());
    
    // Keep only last 1000 requests
    if (activity.requests.length > 1000) {
      activity.requests = activity.requests.slice(-1000);
    }
    
    activity.lastSeen = new Date().toISOString();
    
    // Store for 24 hours
    await redisUtils.set(activityKey, activity, 86400);
    
  } catch (error) {
    logger.error('Error tracking IP activity:', error);
  }
};

// Check for suspicious user agents
const isSuspiciousUserAgent = (userAgent) => {
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java/i,
    /go-http-client/i,
    /^$/,
    /null/i,
    /undefined/i
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(userAgent));
};

// Check for SQL injection patterns
const containsSQLInjectionPatterns = (input) => {
  if (!input || typeof input !== 'string') return false;
  
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
    /(\'|\"|;|--|\*|\|)/,
    /(\bUNION\b.*\bSELECT\b)/i,
    /(\bINSERT\b.*\bINTO\b)/i,
    /(\bDROP\b.*\bTABLE\b)/i
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
};

// Check for XSS patterns
const containsXSSPatterns = (input) => {
  if (!input || typeof input !== 'string') return false;
  
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<link/gi,
    /<meta/gi,
    /data:text\/html/gi,
    /vbscript:/gi
  ];
  
  return xssPatterns.some(pattern => pattern.test(input));
};

// CSRF protection
const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Skip CSRF for API endpoints with proper authentication
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return next();
  }
  
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;
  
  if (!token || !sessionToken || token !== sessionToken) {
    logger.warn('CSRF token validation failed', {
      ip: req.ip,
      url: req.originalUrl,
      method: req.method,
      hasToken: !!token,
      hasSessionToken: !!sessionToken,
      timestamp: new Date().toISOString()
    });
    
    return res.status(403).json({
      error: 'CSRF token validation failed',
      code: 'CSRF_TOKEN_INVALID'
    });
  }
  
  next();
};

// Generate CSRF token
const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Content Security Policy
const contentSecurityPolicy = (req, res, next) => {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' wss: ws:",
    "media-src 'self'",
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
  
  res.setHeader('Content-Security-Policy', csp);
  next();
};

// Request size limiting
const requestSizeLimit = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxSizeBytes = parseSize(maxSize);
    
    if (contentLength > maxSizeBytes) {
      logger.warn('Request size limit exceeded', {
        ip: req.ip,
        url: req.originalUrl,
        contentLength,
        maxSize: maxSizeBytes,
        timestamp: new Date().toISOString()
      });
      
      return res.status(413).json({
        error: 'Request entity too large',
        code: 'REQUEST_TOO_LARGE',
        maxSize: maxSize
      });
    }
    
    next();
  };
};

// Parse size string to bytes
const parseSize = (size) => {
  const units = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  };
  
  const match = size.toString().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';
  
  return Math.floor(value * units[unit]);
};

// Get security statistics
const getSecurityStatistics = async () => {
  try {
    // Get blocked IPs
    const blockedIPs = await redisUtils.smembers('blocked_ips') || [];
    
    // Get security events from last 24 hours
    const securityEvents = await redisUtils.get('security_events') || {
      totalBlocked: 0,
      totalFlagged: 0,
      byReason: {},
      byIP: {},
      lastUpdated: null
    };
    
    return {
      blockedIPs: blockedIPs.length,
      securityEvents,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Failed to get security statistics:', error);
    return null;
  }
};

module.exports = {
  securityHeaders,
  sanitizeInput,
  ipSecurityMonitoring,
  csrfProtection,
  generateCSRFToken,
  contentSecurityPolicy,
  requestSizeLimit,
  getSecurityStatistics
};