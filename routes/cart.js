const express = require('express');
const db = require('../config/db');
const { requireAuth } = require('../mid-level/rbac');

const router = express.Router();
const ADMIN_ROLES = ['sysadmin', 'webadmin'];

const getProduct = db.prepare('SELECT * FROM products WHERE id = ?');
const decrementStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
const insertOrder = db.prepare('INSERT INTO orders (user_id, total_cents, status) VALUES (?, ?, ?)');
const insertOrderItem = db.prepare(
  'INSERT INTO order_items (order_id, product_id, quantity, price_cents_at_purchase) VALUES (?, ?, ?, ?)'
);

router.post('/checkout', requireAuth, (req, res) => {
  const { items } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty.' });
  }
  for (const item of items) {
    if (!Number.isInteger(item.productId) || !Number.isInteger(item.quantity) || item.quantity <= 0) {
      return res.status(400).json({ error: 'Invalid cart item.' });
    }
  }

  const placeOrder = db.transaction((userId, cartItems) => {
    let totalCents = 0;
    const resolvedItems = [];

    for (const { productId, quantity } of cartItems) {
      const product = getProduct.get(productId);
      if (!product) {
        throw new Error(`Product ${productId} not found.`);
      }
      if (product.stock < quantity) {
        throw new Error(`Insufficient stock for "${product.name}".`);
      }
      totalCents += product.price_cents * quantity;
      resolvedItems.push({ product, quantity });
    }

    const orderInfo = insertOrder.run(userId, totalCents, 'placed');
    const orderId = orderInfo.lastInsertRowid;

    for (const { product, quantity } of resolvedItems) {
      insertOrderItem.run(orderId, product.id, quantity, product.price_cents);
      decrementStock.run(quantity, product.id);
    }

    return orderId;
  });

  try {
    const orderId = placeOrder(req.session.userId, items);
    res.status(201).json({ orderId });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/orders', requireAuth, (req, res) => {
  const orders = db
    .prepare('SELECT id, total_cents, status, created_at FROM orders WHERE user_id = ? ORDER BY id DESC')
    .all(req.session.userId);
  res.json(orders);
});

router.get('/orders/:id', requireAuth, (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  if (!Number.isInteger(orderId)) {
    return res.status(400).json({ error: 'Invalid order id.' });
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }
  if (order.user_id !== req.session.userId && !ADMIN_ROLES.includes(req.session.role)) {
    return res.status(403).json({ error: 'You do not have access to this order.' });
  }

  const items = db
    .prepare(
      `SELECT oi.product_id, p.name, oi.quantity, oi.price_cents_at_purchase
       FROM order_items oi JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?`
    )
    .all(orderId);

  res.json({ ...order, items });
});

module.exports = router;