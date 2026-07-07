const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');
const Database = require('better-sqlite3');

// This suite talks only to its own throwaway local HTTPS server. Node's
// fetch doesn't consult the OS trust store the way a browser does, so cert
// verification is relaxed for this test process only -- never do this for
// requests to anything other than the local instance under test.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const ROOT = path.join(__dirname, '..');
const HTTPS_PORT = 4443;
const HTTP_PORT = 4000;
const BASE_URL = `https://localhost:${HTTPS_PORT}`;
const DEMO_PASSWORD = 'ChangeMe123!';

function cookieHeader(res) {
  const values = res.headers.getSetCookie();
  return values.map((c) => c.split(';')[0]).join('; ');
}

async function login(username, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const cookie = cookieHeader(res);
  const body = await res.json();
  return { status: res.status, body, cookie };
}

function waitForServer(url, retries = 30, delayMs = 300) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      fetch(url)
        .then(() => resolve())
        .catch((err) => {
          if (n <= 0) return reject(err);
          setTimeout(() => attempt(n - 1), delayMs);
        });
    };
    attempt(retries);
  });
}

let serverProcess;

test.before(async () => {
  spawnSync(process.execPath, [path.join(ROOT, 'models', 'init-db.js')], { stdio: 'inherit' });

  serverProcess = spawn(process.execPath, [path.join(ROOT, 'server.js')], {
    cwd: ROOT,
    env: {
      ...process.env,
      HTTPS_PORT: String(HTTPS_PORT),
      HTTP_PORT: String(HTTP_PORT),
      SESSION_SECRET: 'test-secret-do-not-use-in-production'
    },
    stdio: 'inherit'
  });

  await waitForServer(BASE_URL);
});

test.after(() => {
  if (serverProcess) serverProcess.kill();
});

test('SQL injection in login is rejected, not bypassed', async () => {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: "' OR '1'='1", password: "' OR '1'='1" })
  });
  assert.equal(res.status, 401, 'injection payload must not authenticate');
});

test('product name with a script payload is stored and returned as inert data', async () => {
  const { cookie, status: loginStatus } = await login('merchant_demo', DEMO_PASSWORD);
  assert.equal(loginStatus, 200);

  const payload = '<script>alert(1)</script>';
  const createRes = await fetch(`${BASE_URL}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ name: payload, description: '', price_cents: 100, stock: 1 })
  });
  assert.equal(createRes.status, 201);

  const searchRes = await fetch(`${BASE_URL}/api/products?q=${encodeURIComponent('script')}`);
  const products = await searchRes.json();
  const found = products.find((p) => p.name === payload);
  assert.ok(found, 'payload should round-trip verbatim as data, never executed or mangled server-side');
});

test('buyer cannot escalate to the admin role-change endpoint (vertical escalation blocked)', async () => {
  const { cookie, status: loginStatus } = await login('buyer_demo', DEMO_PASSWORD);
  assert.equal(loginStatus, 200);

  const res = await fetch(`${BASE_URL}/api/admin/users/1/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ role: 'sysadmin' })
  });
  assert.equal(res.status, 403);
});

test("one buyer cannot read another buyer's order (horizontal escalation blocked)", async () => {
  const buyerA = await login('buyer_demo', DEMO_PASSWORD);
  assert.equal(buyerA.status, 200);

  const productsRes = await fetch(`${BASE_URL}/api/products`);
  const [firstProduct] = await productsRes.json();

  const checkoutRes = await fetch(`${BASE_URL}/api/cart/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: buyerA.cookie },
    body: JSON.stringify({ items: [{ productId: firstProduct.id, quantity: 1 }] })
  });
  const { orderId } = await checkoutRes.json();
  assert.ok(orderId, 'order should be created');

  const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'buyer_two_test',
      email: 'buyer_two_test@example.com',
      password: DEMO_PASSWORD,
      role: 'buyer'
    })
  });
  assert.equal(registerRes.status, 201);
  const buyerBCookie = cookieHeader(registerRes);

  const crossRes = await fetch(`${BASE_URL}/api/cart/orders/${orderId}`, {
    headers: { Cookie: buyerBCookie }
  });
  assert.equal(crossRes.status, 403, "buyer_two must not be able to view buyer_demo's order");
});

test('stored password is a bcrypt hash, never plaintext', () => {
  const db = new Database(path.join(ROOT, 'data', 'app.db'), { readonly: true });
  const user = db.prepare('SELECT password_hash FROM users WHERE username = ?').get('buyer_demo');
  db.close();
  assert.ok(user, 'buyer_demo should exist');
  assert.match(user.password_hash, /^\$2[aby]\$/, 'password_hash must be a bcrypt hash');
  assert.notEqual(user.password_hash, DEMO_PASSWORD);
});
