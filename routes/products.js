const express = require('express');
const db = require('../config/db');
const { requireRole } = require('../mid-level/rbac');

const router = express.Router();

router.get('/', (req, res) => {
  const { q } = req.query;

  let products;
  if (typeof q === 'string' && q.trim().length > 0) {
    const pattern = `%${q.trim()}%`;
    products = db
      .prepare('SELECT id, name, description, price_cents, stock FROM products WHERE name LIKE ? OR description LIKE ? ORDER BY id')
      .all(pattern, pattern);
  } else {
    products = db
      .prepare('SELECT id, name, description, price_cents, stock FROM products ORDER BY id')
      .all();
  }

  res.json(products);
});

router.post('/', requireRole('merchant', 'sysadmin', 'webadmin'), (req, res) => {
  const { name, description, price_cents, stock } = req.body || {};

  if (typeof name !== 'string' || name.trim().length === 0 || name.length > 200) {
    return res.status(400).json({ error: 'Invalid product name.' });
  }
  if (!Number.isInteger(price_cents) || price_cents < 0) {
    return res.status(400).json({ error: 'price_cents must be a non-negative integer.' });
  }
  if (!Number.isInteger(stock) || stock < 0) {
    return res.status(400).json({ error: 'stock must be a non-negative integer.' });
  }

  const info = db
    .prepare('INSERT INTO products (name, description, price_cents, stock, merchant_id) VALUES (?, ?, ?, ?, ?)')
    .run(name.trim(), typeof description === 'string' ? description.trim() : '', price_cents, stock, req.session.userId);

  res.status(201).json({ id: info.lastInsertRowid, name, description: description || '', price_cents, stock });
});

module.exports = router;