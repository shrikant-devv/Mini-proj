const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'eduTrackJWTSecret';

module.exports = function(db) {
  const router = express.Router();

  router.post('/login', (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password are required' });
      const user = db.prepare('SELECT id, name, email, role, password FROM users WHERE email = ?').get(email);
      if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ success: false, error: 'Invalid credentials' });
      if (req.body.role && req.body.role !== user.role) return res.status(401).json({ success: false, error: 'Invalid role for this account' });
      const token = jwt.sign({ id: user.id, role: user.role, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '6h' });
      res.json({ success: true, data: { id: user.id, name: user.name, email: user.email, role: user.role, token } });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
};
