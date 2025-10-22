// /backend/middleware/auth.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer token

  if (!token) return res.status(401).json({ error: 'Token chybí' });

  jwt.verify(token, process.env.JWT_SECRET_KEY || 'replace_me', (err, user) => {
    if (err) return res.status(403).json({ error: 'Neplatný token' });
    req.user = user; // uloží payload tokenu do req.user
    next();
  });
}

module.exports = authenticateToken;
