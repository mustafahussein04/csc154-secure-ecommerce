PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('sysadmin', 'webadmin', 'merchant', 'buyer')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  description   TEXT DEFAULT '',
  price_cents   INTEGER NOT NULL CHECK (price_cents >= 0),
  stock         INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  merchant_id   INTEGER NOT NULL REFERENCES users(id),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  total_cents   INTEGER NOT NULL CHECK (total_cents >= 0),
  status        TEXT NOT NULL DEFAULT 'placed',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id               INTEGER NOT NULL REFERENCES orders(id),
  product_id             INTEGER NOT NULL REFERENCES products(id),
  quantity               INTEGER NOT NULL CHECK (quantity > 0),
  price_cents_at_purchase INTEGER NOT NULL CHECK (price_cents_at_purchase >= 0)
);

CREATE INDEX IF NOT EXISTS idx_products_merchant ON products(merchant_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);