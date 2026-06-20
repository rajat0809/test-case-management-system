const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Verify JWT
const authenticate = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  try {
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query('SELECT id, name, email, role, is_active FROM users WHERE id = $1', [decoded.id]);
    if (!result.rows.length || !result.rows[0].is_active) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }
    req.user = result.rows[0];
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Role-based authorization
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }
  next();
};

const ROLES = {
  ADMIN: 'admin',
  TEST_LEAD: 'test-lead',
  TESTER: 'tester',
  READ_ONLY: 'read-only',
};

module.exports = { authenticate, authorize, ROLES };
