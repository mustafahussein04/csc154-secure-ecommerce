# CSC154 Secure E-Commerce (Buy me a drink)

An in-depth e-commerce demo built for CSC154: HTTPS via a locally-trusted CA,
bcrypt-hashed credentials, parameterized SQL everywhere, a standalone memory-safety
demo (Stack Guard + ASLR), and role-based access control across four roles
(`sysadmin`, `webadmin`, `merchant`, `buyer`).

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- [Homebrew](https://brew.sh/) (macOS/Linux — used to install `mkcert` for TLS certs)
- A C compiler (`cc`/`clang`/`gcc`) — for the memory-safety demo, usually already present
  on macOS (Xcode Command Line Tools) or Linux

## 1. Install dependencies

```bash
npm install
```

## 2. Generate a locally-trusted TLS certificate

This app only runs over HTTPS. `certs/generate-certs.sh` installs `mkcert`, adds a local
Certificate Authority to your system/browser trust store, and issues a cert for
`localhost`:

```bash
chmod +x certs/generate-certs.sh
./certs/generate-certs.sh
```

This writes `certs/localhost.pem` and `certs/localhost-key.pem`. `server.js` refuses to
start without them.

## 3. Initialize the database

```bash
npm run init-db
```

This creates `data/app.db` (SQLite), applies `models/schema.sql`, and seeds four demo
accounts plus a few demo products:

| Username         | Role      |
|------------------|-----------|
| `sysadmin_demo`  | sysadmin  |
| `webadmin_demo`  | webadmin  |
| `merchant_demo`  | merchant  |
| `buyer_demo`     | buyer     |

Password for all demo accounts: `ChangeMe123!` — **change these before any real
deployment.** Re-running `npm run init-db` wipes and recreates the database from
scratch.

## 4. Run the app

```bash
npm start
```

Visit **https://localhost:3443**. Because the certificate is signed by a CA your
browser now trusts (via `mkcert -install`), you should see a valid padlock with no
warnings. Plain HTTP (`http://localhost:3000`) only issues a 301 redirect to HTTPS —
there's no functional path over cleartext.

## 5. Run the tests

```bash
npm test                         # SQL injection, XSS, RBAC (vertical + horizontal), password hashing
bash tests/test-memory-safety.sh # Stack Guard / ASLR demo (memory-safety/vulnerable.c vs safe.c)
```

`npm test` spins up its own throwaway server instance on separate ports, so it's safe to
run alongside `npm start`.

## Project structure

```
config/db.js          SQLite connection (better-sqlite3)
models/schema.sql      Table definitions (users, products, orders, order_items)
models/init-db.js      Creates + seeds the database
mid-level/security.js  Helmet (CSP, HSTS) middleware
mid-level/rbac.js       requireAuth / requireRole middleware
routes/                Express route handlers (auth, products, cart, admin)
public/                Static frontend (already built, talks to the API above)
certs/                 TLS cert/key (generated, not committed)
memory-safety/         Standalone C demo: unsafe vs. bounds-checked buffer handling
tests/                 Automated protection tests (Node) + memory-safety demo script
server.js              App entry point: HTTPS server + HTTP-to-HTTPS redirect
```

## License

MIT — see [LICENSE](LICENSE).