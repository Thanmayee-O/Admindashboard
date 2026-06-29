const crypto = require('crypto');

// Use a fallback static 32-character key if JWT_SECRET is not defined
const SECRET = process.env.JWT_SECRET || 'a_very_secure_secret_key_32_characters_long_for_aes_256';
const ALGORITHM = 'aes-256-cbc';
const KEY = Buffer.from(SECRET.padEnd(32).substring(0, 32)); // Ensure exact 32 bytes
const IV_LENGTH = 16;

/**
 * Generate a cryptographically signed token string containing an encrypted JSON payload
 */
function generateToken(payload) {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    
    // Add expiration of 2 hours to prevent session hijacking
    const tokenPayload = {
      ...payload,
      expiresAt: Date.now() + 2 * 60 * 60 * 1000
    };

    let encrypted = cipher.update(JSON.stringify(tokenPayload), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return iv:encrypted hex token
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('❌ [Token Generation Error]', error);
    return null;
  }
}

/**
 * Decrypt and verify token validity. Returns payload or null.
 */
function verifyToken(token) {
  if (!token) return null;
  
  try {
    const parts = token.split(':');
    if (parts.length !== 2) return null;

    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    const payload = JSON.parse(decrypted);

    // Verify session expiration
    if (payload.expiresAt && Date.now() > payload.expiresAt) {
      console.warn('⚠️  [Token Session Expired]');
      return null;
    }

    return payload;
  } catch (error) {
    // Return null silently on bad tokens
    return null;
  }
}

module.exports = {
  generateToken,
  verifyToken,
};
