const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'app.db');
const schemaPath = path.join(__dirname, 'schema.sql');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('Removed existing data/app.db — starting fresh.');
}

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);
console.log('Schema applied.');

const DEMO_PASSWORD = 'ChangeMe123!';
const BCRYPT_ROUNDS = 12;
const insertUser = db.prepare(`
  INSERT INTO users (username, email, password_hash, role)
  VALUES (?, ?, ?, ?)
`);

const demoUsers = [
  { username: 'sysadmin_demo', email: 'sysadmin_demo@example.com', role: 'sysadmin' },
  { username: 'webadmin_demo', email: 'webadmin_demo@example.com', role: 'webadmin' },
  { username: 'merchant_demo', email: 'merchant_demo@example.com', role: 'merchant' },
  { username: 'buyer_demo', email: 'buyer_demo@example.com', role: 'buyer' }
];

const userIds = {};

for (const u of demoUsers) {
  const hash = bcrypt.hashSync(DEMO_PASSWORD, BCRYPT_ROUNDS);
  const info = insertUser.run(u.username, u.email, hash, u.role);
  userIds[u.username] = info.lastInsertRowid;
}
console.log(`Seeded ${demoUsers.length} demo users (password for all: "${DEMO_PASSWORD}" — change before any real deployment).`);

const insertProduct = db.prepare(`
  INSERT INTO products (name, description, price_cents, stock, merchant_id)
  VALUES (?, ?, ?, ?, ?)
`);

const demoProducts = [
  ['Brass Compass', 'A weighty pocket compass with a verdigris dial.', 4200, 15],
  ['Steel Notebook', 'Fireproof cover, waterproof pages.', 1800, 40],
  ['Signal Lantern', 'Hand-crank lantern with a 40-hour reserve.', 6500, 8]
];

for (const [name, description, price_cents, stock] of demoProducts) {
  insertProduct.run(name, description, price_cents, stock, userIds['merchant_demo']);
}

console.log(`Seeded ${demoProducts.length} demo products under merchant_demo.`);

db.close();

console.log('Database initialization complete.');