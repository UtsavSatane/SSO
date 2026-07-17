const https = require('https');
const express = require('express');
const session = require('cookie-session');
const { Issuer, generators } = require('openid-client');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Disable TLS unauthorized rejection for self-signed certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const PORT = process.env.PORT || 5002;
const IDP_URL = process.env.IDP_URL || 'https://localhost:5000';
const REDIRECT_URI = `https://localhost:${PORT}/callback`;
const POST_LOGOUT_REDIRECT_URI = `https://localhost:${PORT}/`;

const app = express();

app.use(session({
  name: 'session_portal_b',
  keys: ['portal-b-cookie-secret-key-999'],
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

app.use(express.static(path.join(__dirname, 'public')));

let client;

async function initOIDC() {
  try {
    const idpIssuer = await Issuer.discover(IDP_URL);
    console.log(`[Portal-B] Discovered IdP at ${IDP_URL}`);
    
    client = new idpIssuer.Client({
      client_id: 'portal-b',
      client_secret: 'portal-b-secret-999',
      redirect_uris: [REDIRECT_URI],
      post_logout_redirect_uris: [POST_LOGOUT_REDIRECT_URI],
      response_types: ['code']
    });
  } catch (err) {
    console.error('[Portal-B] Failed to discover OpenID Connect Identity Provider. Retrying in 5 seconds...', err.message);
    setTimeout(initOIDC, 5000);
  }
}

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
      REDIRECT_URI,
      params,
      {
        state: oidcContext.state,
        nonce: oidcContext.nonce,
        code_verifier: oidcContext.code_verifier
      }
    );

    req.session.tokens = tokenSet;
    const claims = tokenSet.claims();
    req.session.user = {
      sub: claims.sub,
      email: claims.email,
      name: claims.name
    };
    
    // Clear temporary OIDC context
    req.session.oidc = null;
    res.redirect('/');
  } catch (err) {
    console.error('[Portal-B] Callback validation failed:', err);
    res.status(500).send(`Authentication failed: ${err.message}`);
  }
});

app.get('/api/session', (req, res) => {
  res.json({
    authenticated: !!req.session.user,
    user: req.session.user || null,
    tokens: req.session.tokens || null
  });
});

app.get('/logout', (req, res) => {
  const id_token = req.session.tokens ? req.session.tokens.id_token : undefined;
  req.session = null;

  const targetRedirect = req.query.redirect;
  if (targetRedirect) {
    console.log('[Portal-B] Chained logout request received, redirecting to next page:', targetRedirect);
    return res.redirect(targetRedirect);
  }

  if (!client) {
    return res.redirect('/');
  }

  try {
    const endSessionUrl = client.endSessionUrl({
      id_token_hint: id_token,
      post_logout_redirect_uri: POST_LOGOUT_REDIRECT_URI
    });
    
    // Redirect to Portal-A's logout first, which will then redirect to the IdP's endSessionUrl
    const chainUrl = `https://localhost:5001/logout?redirect=${encodeURIComponent(endSessionUrl)}`;
    console.log('[Portal-B] Initiating logout chain. Redirecting to:', chainUrl);
    res.redirect(chainUrl);
  } catch (err) {
    console.error('[Portal-B] Failed to generate endSessionUrl:', err);
    res.redirect('/');
  }
});

// Load SSL keys
const certPath = path.join(__dirname, '../certs/localhost.crt');
const keyPath = path.join(__dirname, '../certs/localhost.key');
if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.error('[Portal-B] SSL certificates not found. Please run "npm run certs" first.');
  process.exit(1);
}

const httpsOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath)
};

https.createServer(httpsOptions, app).listen(PORT, () => {
  console.log(`Portal B running at HTTPS: https://localhost:${PORT}`);
  initOIDC();
});
