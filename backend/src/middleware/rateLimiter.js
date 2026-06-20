const rateLimit = require('express-rate-limit');

const make = (max, windowMs, message) =>
  rateLimit({ windowMs, max, message: { message }, standardHeaders: true, legacyHeaders: false });

module.exports = {
  authLimiter:      make(5,   15 * 60 * 1000, 'Too many auth attempts, try again in 15 minutes'),
  testCaseLimiter:  make(100, 60 * 60 * 1000, 'Test case rate limit reached'),
  executionLimiter: make(200, 60 * 60 * 1000, 'Execution rate limit reached'),
  analyticsLimiter: make(50,  60 * 60 * 1000, 'Analytics rate limit reached'),
};
