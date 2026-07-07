const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const express = require('express');
const session = require('express-session');

const helmetMiddleware = require('./mid-level/security');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const adminRoutes = require('./routes/admin');

const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
const HTTP_PORT = process.env.HTTP_PORT || 3000;

const app = express();

app.use(helmetMiddleware);
app.use(express.json());

let sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  sessionSecret = crypto.randomBytes(32).toString('hex');
  console.warn('SESSION_SECRET not set — using a randomly generated secret for this process only (sessions will not survive a restart). Set SESSION_SECRET in a real deployment.');
}

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true, // cookie only sent over HTTPS
      httpOnly: true, // not accessible to JavaScript in the browser
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 2 // 2 hours
    }
  })
);

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// Error handler for unexpected errors. Logs the error and returns error response.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

const certPath = path.join(__dirname, 'certs', 'localhost.pem');
const keyPath = path.join(__dirname, 'certs', 'localhost-key.pem');

if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.error('Missing TLS certificate/key in certs/. Run certs/generate-certs.sh first.');
  process.exit(1);
}

const httpsOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath)
};

https.createServer(httpsOptions, app).listen(HTTPS_PORT, () => {
  console.log(`HTTPS server listening on https://localhost:${HTTPS_PORT}`);
});

// HTTP server that redirects to HTTPS.
http
  .createServer((req, res) => {
    const host = (req.headers.host || 'localhost').split(':')[0];
    res.writeHead(301, { Location: `https://${host}:${HTTPS_PORT}${req.url}` });
    res.end();
  })
  .listen(HTTP_PORT, () => {
    console.log(`HTTP redirect listener on http://localhost:${HTTP_PORT} -> https://localhost:${HTTPS_PORT}`);
  });