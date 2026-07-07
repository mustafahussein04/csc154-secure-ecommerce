const express = require('express');
const db = require('../config/db');
const { requireRole, ROLES } = require('../mid-level/rbac');

const router = express.Router();

router.get('/users', requireRole('sysadmin', 'webadmin'), (req, res) => {
  const users = db.prepare('SELECT id, username, email, role, created_at FROM users ORDER BY id').all();
  res.json(users);
});

router.patch('/users/:id/role', requireRole('sysadmin'), (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const { role } = req.body || {};

  if (!Number.isInteger(userId)) {
    return res.status(400).json({ error: 'Invalid user id.' });
  }
  if (!ROLES.includes(role)) {
    return res.status(400).json({ error: `Role must be one of: ${ROLES.join(', ')}.` });
  }

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
  res.json({ id: userId, role });
});

router.delete('/products/:id', requireRole('webadmin', 'sysadmin'), (req, res) => {
  const productId = parseInt(req.params.id, 10);
  if (!Number.isInteger(productId)) {
    return res.status(400).json({ error: 'Invalid product id.' });
  }

  const info = db.prepare('DELETE FROM products WHERE id = ?').run(productId);
  if (info.changes === 0) {
    return res.status(404).json({ error: 'Product not found.' });
  }
  res.json({ ok: true });
});

router.get('/orders', requireRole('sysadmin', 'webadmin'), (req, res) => {
  const orders = db
    .prepare(
      `SELECT o.id, o.total_cents, o.status, o.created_at, u.username
       FROM orders o JOIN users u ON u.id = o.user_id
       ORDER BY o.id DESC`
    )
    .all();
  res.json(orders);
});

module.exports = router;