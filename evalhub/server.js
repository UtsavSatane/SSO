const https = require('https');
const express = require('express');
const session = require('cookie-session');
const { Issuer, generators } = require('openid-client');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Disable TLS unauthorized rejection for self-signed certificates in dev
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const PORT = process.env.PORT || 5003;
const IDP_URL = process.env.IDP_URL || 'https://localhost:5000';
const REDIRECT_URI = `https://localhost:${PORT}/callback`;
const POST_LOGOUT_REDIRECT_URI = `https://localhost:${PORT}/`;

const app = express();
app.use(express.json());

app.use(session({
  name: 'session_evalhub',
  keys: ['evalhub-cookie-secret-key-999'],
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

app.use(express.static(path.join(__dirname, 'dist')));

let client;

async function initOIDC() {
  try {
    const idpIssuer = await Issuer.discover(IDP_URL);
    console.log(`[EvalHub] Discovered IdP at ${IDP_URL}`);
    
    client = new idpIssuer.Client({
      client_id: 'evalhub',
      client_secret: 'evalhub-secret-999',
      redirect_uris: [REDIRECT_URI],
      post_logout_redirect_uris: [POST_LOGOUT_REDIRECT_URI],
      response_types: ['code']
    });
  } catch (err) {
    console.error('[EvalHub] Failed to discover OpenID Connect Identity Provider. Retrying in 5 seconds...', err.message);
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
    
    req.session.oidc = null;
    res.redirect('/');
  } catch (err) {
    console.error('[EvalHub] Callback validation failed:', err);
    res.status(500).send(`Authentication failed: ${err.message}`);
  }
});

app.get('/api/session', (req, res) => {
  res.json({
    authenticated: !!req.session.user,
    user: req.session.user || null,
    tokens: req.session.tokens || null,
    history: req.session.assessmentHistory || []
  });
});

// Quiz Database & Assessment Logic
const QUIZZES = [
  {
    id: 'oidc-security',
    title: 'OAuth 2.0 & OpenID Connect Security',
    category: 'Security & Auth',
    badge: 'OIDC Architect',
    icon: 'ShieldCheck',
    description: 'Test your understanding of ID Tokens, Access Tokens, PKCE, Grant Types, and SSO security best practices.',
    timeLimitSeconds: 180,
    questions: [
      {
        id: 1,
        question: 'What is the primary purpose of PKCE (Proof Key for Code Exchange) in OAuth 2.0 / OIDC?',
        options: [
          'To encrypt user passwords before sending them to the IDP',
          'To prevent authorization code interception attacks on public or confidential clients',
          'To compress the ID token payload size for mobile applications',
          'To bypass user consent prompt during authentication'
        ],
        correctAnswer: 1,
        explanation: 'PKCE creates a dynamic code verifier and challenge to ensure that only the client who initiated the auth request can exchange the authorization code.'
      },
      {
        id: 2,
        question: 'Which token is specifically designed for authorization to access protected APIs?',
        options: [
          'ID Token',
          'Refresh Token',
          'Access Token',
          'Session Cookie'
        ],
        correctAnswer: 2,
        explanation: 'Access Tokens are used to authorize API requests, whereas ID Tokens carry identity claims about the authenticated user.'
      },
      {
        id: 3,
        question: 'Which OIDC scope is mandatory to request an ID Token?',
        options: [
          'email',
          'profile',
          'openid',
          'offline_access'
        ],
        correctAnswer: 2,
        explanation: 'The "openid" scope is mandatory in OpenID Connect to signal an authentication request and receive an ID Token.'
      }
    ]
  },
  {
    id: 'javascript-mastery',
    title: 'Modern JavaScript & Async Patterns',
    category: 'Web Development',
    badge: 'JS Specialist',
    icon: 'Code2',
    description: 'Master Promises, async/await, Event Loop mechanics, closures, and ES Next features.',
    timeLimitSeconds: 180,
    questions: [
      {
        id: 1,
        question: 'What order will console.log output in: setTimeout(() => console.log("A"), 0); Promise.resolve().then(() => console.log("B"));',
        options: [
          'A then B',
          'B then A',
          'Random order depending on system CPU load',
          'Both log simultaneously'
        ],
        correctAnswer: 1,
        explanation: 'Promise callbacks land in the Microtask Queue, which executes before the Macrotask Queue (setTimeout).'
      },
      {
        id: 2,
        question: 'Which operator is used for Nullish Coalescing in JS?',
        options: [
          '||',
          '&&',
          '??',
          '?!'
        ],
        correctAnswer: 2,
        explanation: 'The nullish coalescing operator (??) returns its right-hand operand only when its left-hand operand is null or undefined.'
      }
    ]
  },
  {
    id: 'system-architecture',
    title: 'Distributed Systems & API Design',
    category: 'Architecture',
    badge: 'Systems Specialist',
    icon: 'Network',
    description: 'Evaluate microservices communication, rate limiting, token rotation, and system resilience.',
    timeLimitSeconds: 180,
    questions: [
      {
        id: 1,
        question: 'What is the advantage of using asymmetric keys (RSA / EC) for signing JWTs in Single Sign-On?',
        options: [
          'Resource servers can verify tokens using the public key without needing secret sharing with the IdP',
          'Asymmetric keys produce smaller JWT token string sizes',
          'Asymmetric encryption eliminates the need for SSL/TLS',
          'Asymmetric keys prevent tokens from expiring'
        ],
        correctAnswer: 0,
        explanation: 'With asymmetric signing (like RS256), the IdP signs with a private key, and any resource server can verify using the published public JWKS key.'
      }
    ]
  }
];

// Global Leaderboard Mock Store
let LEADERBOARD = [
  { name: 'Alex Johnson', email: 'alex@company.com', score: 100, badge: 'OIDC Architect', date: '2026-07-20' },
  { name: 'Maria Garcia', email: 'maria@company.com', score: 90, badge: 'JS Specialist', date: '2026-07-19' },
  { name: 'Devin Smith', email: 'devin@company.com', score: 85, badge: 'Systems Specialist', date: '2026-07-18' }
];

app.get('/api/quizzes', (req, res) => {
  res.json(QUIZZES);
});

app.post('/api/submit-quiz', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Must be logged in via SSO to submit assessments.' });
  }

  const { quizId, userAnswers, timeSpent } = req.body;
  const quiz = QUIZZES.find(q => q.id === quizId);

  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found.' });
  }

  let correctCount = 0;
  quiz.questions.forEach((q, idx) => {
    if (userAnswers[q.id] === q.correctAnswer) {
      correctCount++;
    }
  });

  const percentage = Math.round((correctCount / quiz.questions.length) * 100);
  const passed = percentage >= 70;
  const resultObj = {
    id: Date.now(),
    quizId: quiz.id,
    quizTitle: quiz.title,
    badge: quiz.badge,
    score: percentage,
    correctCount,
    totalQuestions: quiz.questions.length,
    passed,
    completedAt: new Date().toISOString(),
    user: req.session.user.name
  };

  if (!req.session.assessmentHistory) {
    req.session.assessmentHistory = [];
  }
  req.session.assessmentHistory.unshift(resultObj);

  if (passed) {
    LEADERBOARD.unshift({
      name: req.session.user.name || 'Anonymous User',
      email: req.session.user.email,
      score: percentage,
      badge: quiz.badge,
      date: new Date().toISOString().split('T')[0]
    });
    // Keep top 10
    LEADERBOARD = LEADERBOARD.sort((a, b) => b.score - a.score).slice(0, 10);
  }

  res.json({
    result: resultObj,
    history: req.session.assessmentHistory,
    questions: quiz.questions
  });
});

app.get('/api/leaderboard', (req, res) => {
  res.json(LEADERBOARD);
});

app.get('/logout', (req, res) => {
  const id_token = req.session.tokens ? req.session.tokens.id_token : undefined;
  req.session = null;

  const targetRedirect = req.query.redirect;
  if (targetRedirect) {
    console.log('[EvalHub] Chained logout request received, redirecting to next page:', targetRedirect);
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
    
    // Redirect through TypeSprint -> ELMS -> IDP endSessionUrl
    const chainUrl = `https://localhost:5002/logout?redirect=${encodeURIComponent(endSessionUrl)}`;
    console.log('[EvalHub] Initiating chained logout. Redirecting to:', chainUrl);
    res.redirect(chainUrl);
  } catch (err) {
    console.error('[EvalHub] Failed to generate endSessionUrl:', err);
    res.redirect('/');
  }
});

// Load SSL keys
const certPath = path.join(__dirname, '../certs/localhost.crt');
const keyPath = path.join(__dirname, '../certs/localhost.key');
if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.error('[EvalHub] SSL certificates not found. Please run "npm run certs" first.');
  process.exit(1);
}

const httpsOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath)
};

https.createServer(httpsOptions, app).listen(PORT, () => {
  console.log(`EvalHub running at HTTPS: https://localhost:${PORT}`);
  initOIDC();
});
