// ==================== utils/encryption.js ====================
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
const ALGORITHM = 'aes-256-gcm';

const encryption = {
  // Encrypt text
  encrypt(text) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
      cipher.setAAD(Buffer.from('medical-case-simulator', 'utf8'));
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      throw new Error('Encryption failed');
    }
  },

  // Decrypt text
  decrypt(encryptedData) {
    try {
      const { encrypted, iv, authTag } = encryptedData;
      
      const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
      decipher.setAAD(Buffer.from('medical-case-simulator', 'utf8'));
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error('Decryption failed');
    }
  },

  // Hash data (using crypto hash, not bcrypt)
  hash(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
  },

  // Generate secure random token
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  },

  // Generate secure random string with custom characters
  generateSecureId(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const randomBytes = crypto.randomBytes(length);
    
    for (let i = 0; i < length; i++) {
      result += chars[randomBytes[i] % chars.length];
    }
    
    return result;
  },

  // Generate API key
  generateApiKey() {
    return `mcs_${this.generateSecureId(32)}`;
  },

  // HMAC signature
  createSignature(data, secret = ENCRYPTION_KEY) {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  },

  // Verify HMAC signature
  verifySignature(data, signature, secret = ENCRYPTION_KEY) {
    const expectedSignature = this.createSignature(data, secret);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  },

  // Generate session token
  generateSessionToken() {
    return this.generateToken(32);
  },

  // Generate reset token
  generateResetToken() {
    return this.generateToken(32);
  },

  // Generate verification token
  generateVerificationToken() {
    return this.generateToken(32);
  },

  // Encrypt sensitive user data
  encryptSensitiveData(data) {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    return this.encrypt(dataString);
  },

  // Decrypt sensitive user data
  decryptSensitiveData(encryptedData) {
    const decrypted = this.decrypt(encryptedData);
    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted; // Return as string if not JSON
    }
  }
};

module.exports = encryption;