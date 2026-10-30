import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

/**
 * 🔐 Authentication Middleware
 * Verifies JWT token and attaches user info to req.user
 */
export const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ success: false, message: 'No authentication token, access denied' });
    }

    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const decoded = jwt.verify(token, jwtSecret);

    req.user = decoded;

    // Resolve userId from token (support multiple fields)
    const userId = decoded.id || decoded._id || decoded.userId;
    req.userId = userId ? userId.toString() : null;

    console.log('🔹 Auth Middleware - Decoded JWT:', decoded);
    console.log('🔹 Resolved userId for request:', req.userId);

    if (!req.userId) {
      console.warn('⚠️ Student ID not found in token. Some routes may fail.');
    }

    // ✅ Do NOT fail here; controller can check ObjectId if required
    next();
  } catch (err) {
    console.error('❌ JWT Auth Error:', err.message);

    // Customize error message based on JWT error type
    let message = 'Authentication failed. Please sign in again.';
    if (err.name === 'TokenExpiredError') message = 'Token expired. Please sign in again.';
    if (err.name === 'JsonWebTokenError') message = 'Invalid token. Please sign in again.';

    return res.status(401).json({ success: false, message });
  }
};

export default authenticateToken;
