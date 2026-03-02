const jwt = require('jsonwebtoken');

/**
 * Auth Middleware - verifies JWT and attaches decoded user to req.user
 * Usage: router.get('/protected', auth, handler)
 *
 * Optionally pass requireRole to restrict access:
 * Usage: router.get('/admin-only', auth, requireRole('admin'), handler)
 */
module.exports = (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader;

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired. Please log in again.' });
    }
    res.status(401).json({ error: 'Invalid token.' });
  }
};

/**
 * Role Guard Middleware - restricts route to a specific role
 */
module.exports.requireRole = (role) => (req, res, next) => {
  if (!req.user || req.user.role !== role) {
    return res.status(403).json({ error: `Access restricted to ${role} accounts.` });
  }
  next();
};