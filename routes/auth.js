const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../config/db');
const { requireAuth } = require('../mid-level/rbac');

const router = express.Router();

const BCRYPT_ROUNDS = 12;
const SELF_SERVICE_ROLES = ['buyer', 'merchant'];
// Precomputed dummy hash for loggin in attempts with non-existent usernames.
const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEeOMlP4YB2xxNyFHXjXe6JHUvOZi8vN7Rq';

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

router.post('/register', (req, res) => {
  const { username, email, password, role } = req.body || {};

  if (!isNonEmptyString(username) || username.length < 3 || username.length > 32 || !/^[a-zA-Z0-9_]+$/.test(username)) {
    return res.status(400).json({ error: 'Invalid username.' });
  }
  if (!isNonEmptyString(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email.' });
  }
  if (!isNonEmptyString(password) || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }
  if (!SELF_SERVICE_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Role must be buyer or merchant.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existing) {
    return res.status(409).json({ error: 'Username or email already in use.' });
  }

  const passwordHash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
  const info = db
    .prepare('INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(username, email, passwordHash, role);

  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'Could not start session.' });
    req.session.userId = info.lastInsertRowid;
    req.session.username = username;
    req.session.role = role;
    res.status(201).json({ username, role });
  });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!isNonEmptyString(username) || !isNonEmptyString(password)) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  const hashToCheck = user ? user.password_hash : DUMMY_HASH;
  const passwordMatches = bcrypt.compareSync(password, hashToCheck);

  if (!user || !passwordMatches) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'Could not start session.' });
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    res.json({ username: user.username, role: user.role });
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ username: req.session.username, role: req.session.role });
});

module.exports = router;