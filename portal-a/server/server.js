import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import https from 'https';
import session from 'cookie-session';
import { Issuer, generators } from 'openid-client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { initDatabase, queryOne, runSql } from './db.js';
import authRoutes from './routes/auth.js';
import leaveRoutes from './routes/leaves.js';
import employeeRoutes from './routes/employees.js';
import { JWT_SECRET } from './middleware/auth.js';

// Ignore TLS errors for self-signed certificates in development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Session middleware for OIDC context
app.use(session({
  name: 'session_portal_a_oidc',
  keys: ['portal-a-cookie-secret-key-999'],
  maxAge: 10 * 60 * 1000 // 10 minutes
}));

// Initialize OIDC Client
let client;
async function initOIDC() {
  try {
    const idpIssuer = await Issuer.discover('https://localhost:5000');
    console.log(`[Portal-A/ELMS] Discovered IdP at https://localhost:5000`);
    
    client = new idpIssuer.Client({
      client_id: 'portal-a',
      client_secret: 'portal-a-secret-999',
      redirect_uris: ['https://localhost:5001/callback'],
      post_logout_redirect_uris: ['https://localhost:5001/'],
      response_types: ['code']
    });
  } catch (err) {
    console.error('[Portal-A/ELMS] Failed to discover OpenID Connect Identity Provider. Retrying in 5 seconds...', err.message);
    setTimeout(initOIDC, 5000);
  }
}
initOIDC();

// OIDC Authentication Endpoints
app.get('/login', (req, res) => {
  if (!client) {
    return res.status(503).send('Auth service initializing, please refresh in a moment.');
  }

  const code_verifier = generators.codeVerifier();
  const code_challenge = generators.codeChallenge(code_verifier);
  const state = generators.state();
  const nonce = generators.nonce();

  req.session.oidc = { code_verifier, state, nonce };

  const authorizationUrl = client.authorizationUrl({
    scope: 'openid email profile',
    state,
    nonce,
    code_challenge,
    code_challenge_method: 'S256'
  });

  res.redirect(authorizationUrl);
});

app.get('/callback', async (req, res) => {
  if (!client) {
    return res.status(503).send('Auth service is not initialized.');
  }

  try {
    const params = client.callbackParams(req);
    const oidcContext = req.session.oidc;

    if (!oidcContext) {
      return res.status(400).send('Session expired or missing OIDC context. Please log in again.');
    }

    const tokenSet = await client.callback(
      'https://localhost:5001/callback',
      params,
      {
        state: oidcContext.state,
        nonce: oidcContext.nonce,
        code_verifier: oidcContext.code_verifier
      }
    );

    const claims = tokenSet.claims();
    const email = claims.email.toLowerCase().trim();
    
    // Check if user exists in SQLite DB
    let user = queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      // Auto-provision user
      const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];
      const avatarColor = colors[Math.floor(Math.random() * colors.length)];
      const dummyPassword = bcrypt.hashSync(Math.random().toString(36), 10);
      
      const result = runSql(
          'INSERT INTO users (name, email, password, role, department, avatar_color) VALUES (?, ?, ?, ?, ?, ?)',
          [claims.name || claims.email, email, dummyPassword, 'employee', 'General', avatarColor]
      );
      user = queryOne('SELECT * FROM users WHERE id = ?', [result.lastInsertRowid]);
    }

    // Generate local JWT token for React client
    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
    );

    // Clear temporary OIDC context
    req.session.oidc = null;

    // Send JS to store token in localStorage and redirect
    res.send(`
      <script>
        localStorage.setItem('elms_token', '${token}');
        window.location.href = '/';
      </script>
    `);
  } catch (err) {
    console.error('[Portal-A/ELMS] Callback validation failed:', err);
    res.status(500).send(`Authentication failed: ${err.message}`);
  }
});

app.get('/logout', (req, res) => {
  if (!client) {
    return res.redirect('/');
  }
  
  // Clear any OIDC context
  req.session = null;
  
  // Redirect to IdP end session endpoint
  try {
    const endSessionUrl = client.endSessionUrl({
      post_logout_redirect_uri: 'https://localhost:5001/'
    });
    res.redirect(endSessionUrl);
  } catch (err) {
    console.error('[Portal-A/ELMS] Failed to generate endSessionUrl:', err);
    res.redirect('/');
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/employees', employeeRoutes);

// Serve static files in production
const distPath = join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
    res.sendFile(join(distPath, 'index.html'));
});

// Load SSL keys
const certPath = join(__dirname, '../../certs/localhost.crt');
const keyPath = join(__dirname, '../../certs/localhost.key');
if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.error('[Portal-A/ELMS] SSL certificates not found at ' + certPath);
  process.exit(1);
}

const httpsOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath)
};

// Initialize database then start server
initDatabase()
    .then(() => {
        https.createServer(httpsOptions, app).listen(PORT, () => {
            console.log(`🚀 ELMS server running on HTTPS: https://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Failed to initialize database:', err);
        process.exit(1);
    });
