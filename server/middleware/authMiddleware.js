const { verifyToken } = require('../utils/token');

/**
 * Express Middleware protecting routes against unauthorized seller access.
 * Extracts token from Cookies (sellerToken) or Authorization Headers (Bearer).
 */
const protectSeller = async (req, res, next) => {
  let token = null;

  // 1. Attempt cookie extraction
  if (req.headers.cookie) {
    const parsedCookies = req.headers.cookie.split(';').reduce((acc, cur) => {
      const [key, value] = cur.split('=');
      if (key && value) {
        acc[key.trim()] = decodeURIComponent(value.trim());
      }
      return acc;
    }, {});
    
    if (parsedCookies.sellerToken) {
      token = parsedCookies.sellerToken;
    }
  }

  // 2. Fallback to authorization header
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized access. Authentication cookie or header token is missing.'
    });
  }

  // 3. Verify signature and validity
  const decoded = verifyToken(token);
  if (!decoded || !decoded.sellerId) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired merchant session. Please log in again.'
    });
  }

  // 4. Attach decoded payload containing sellerId to the request context
  req.seller = decoded;
  next();
};

const protectShippingPartner = async (req, res, next) => {
  let token = null;

  // 1. Attempt cookie extraction
  if (req.headers.cookie) {
    const parsedCookies = req.headers.cookie.split(';').reduce((acc, cur) => {
      const [key, value] = cur.split('=');
      if (key && value) {
        acc[key.trim()] = decodeURIComponent(value.trim());
      }
      return acc;
    }, {});
    
    if (parsedCookies.shippingToken) {
      token = parsedCookies.shippingToken;
    }
  }

  // 2. Fallback to authorization header
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  console.log(`🚚 [protectShippingPartner] Extracted token: ${token ? token.substring(0, 15) + '...' : 'null'}`);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized access. Authentication cookie or header token is missing.'
    });
  }

  // 3. Verify signature and validity
  const decoded = verifyToken(token);
  console.log('🚚 [protectShippingPartner] Decoded token payload:', decoded);

  if (!decoded || !decoded.shippingPartnerId) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired shipping partner session. Please log in again.'
    });
  }

  // 4. Attach decoded payload containing shippingPartnerId to the request context
  req.shippingPartner = decoded;
  next();
};

module.exports = {
  protectSeller,
  protectShippingPartner,
};
