// Enable detailed oidc-provider debugging
process.env.DEBUG = 'oidc-provider:*';

const https = require('https');
const express = require('express');
const { Provider } = require('oidc-provider');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const db = require('./db');
const cache = require('./cache');
const RedisAdapter = require('./oidc-adapter');
const logger = require('./logger');
const { getSecurityStats, getAuditLogs } = require('./logParser');

// Disable self-signed SSL verification for development requests
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const PORT = process.env.PORT || 5000;
const ISSUER = `https://localhost:${PORT}`;

async function startServer() {
  // Initialize Database with Retry Mechanism
  await db.initializeDatabase();

  const configuration = {
    adapter: RedisAdapter,
    clients: [
      {
        client_id: 'elms',
        client_secret: 'elms-secret-999',
        grant_types: ['authorization_code'],
        redirect_uris: ['https://localhost:6030/callback'],
        post_logout_redirect_uris: ['http://localhost:5001/'],
        scope: 'openid email profile'
      },
      {
        client_id: 'typesprint',
        client_secret: 'typesprint-secret-999',
        grant_types: ['authorization_code'],
        redirect_uris: ['https://localhost:5002/callback'],
        post_logout_redirect_uris: ['https://localhost:5002/'],
        scope: 'openid email profile'
      },
      {
        client_id: 'evalhub',
        client_secret: 'evalhub-secret-999',
        grant_types: ['authorization_code'],
        redirect_uris: ['https://localhost:5003/callback', 'https://localhost:5003/auth/callback'],
        post_logout_redirect_uris: ['https://localhost:5003/'],
        scope: 'openid email profile'
      },
      {
        client_id: 'evalhub-client',
        client_secret: 'evalhub-secret',
        grant_types: ['authorization_code'],
        redirect_uris: ['https://localhost:5003/auth/callback', 'https://localhost:5003/callback'],
        post_logout_redirect_uris: ['https://localhost:5003/'],
        scope: 'openid email profile'
      }
    ],
    jwks: require('./jwks.json'),
    loadExistingGrant: async (ctx) => {
      const accountId = ctx.oidc.session && ctx.oidc.session.accountId;
      if (!accountId) return undefined;
      
      const grant = new ctx.oidc.provider.Grant({
        accountId,
        clientId: ctx.oidc.client.clientId,
      });
      grant.addOIDCScope('openid');
      grant.addOIDCScope('email');
      grant.addOIDCScope('profile');
      await grant.save();
      return grant;
    },
    conformIdTokenClaims: false,
    findAccount: async (ctx, id) => {
      const res = await db.query('SELECT * FROM users WHERE id = $1', [id]);
      const user = res.rows[0];
      if (!user) return undefined;
      return {
        accountId: id,
        async claims(use, scope) {
          return {
            sub: id.toString(),
            email: user.email,
            email_verified: true,
            name: user.name
          };
        }
      };
    },
    interactions: {
      url(ctx, interaction) {
        return `/interaction/${interaction.uid}`;
      }
    },
    cookies: {
      keys: ['sso-session-cookie-secret-keys-99'],
      names: {
        session: '_session',
        interaction: '_interaction',
        resume: '_resume'
      },
      long: {
        secure: false,
        sameSite: 'lax',
        httpOnly: true
      },
      short: {
        secure: false,
        sameSite: 'lax',
        httpOnly: true
      }
    },
    features: {
      devInteractions: { enabled: false }
    },
    claims: {
      openid: ['sub'],
      email: ['email', 'email_verified'],
      profile: ['name']
    },
    ttl: {
      AccessToken: 60 * 60,                // 1 hour
      IdToken: 60 * 60,                    // 1 hour
      AuthorizationCode: 60 * 10,          // 10 minutes
      RefreshToken: 60 * 60 * 24 * 14, // 14 days
      Session: 60 * 60 * 24 * 14       // 14 days
    }
  };

  const provider = new Provider(ISSUER, configuration);

  // Disable proxy trust since we are running HTTPS directly in Node
  provider.proxy = false;

  // Register OIDC Event Listeners for Auditing
  provider.on('grant.success', (ctx) => {
    logger.info('Audit event: token_issuance', {
      event: 'token_issuance',
      clientId: ctx.oidc.client?.clientId,
      userId: ctx.oidc.account?.accountId,
      grantType: ctx.oidc.params?.grant_type,
      scope: ctx.oidc.params?.scope,
      ip: ctx.ip,
      userAgent: ctx.get('user-agent')
    });
  });

  provider.on('grant.revoked', (ctx, grantId) => {
    logger.info('Audit event: token_revocation', {
      event: 'token_revocation',
      grantId,
      clientId: ctx.oidc.client?.clientId,
      ip: ctx.ip,
      userAgent: ctx.get('user-agent'),
      reason: 'grant_revoked'
    });
  });

  provider.on('access_token.destroyed', (token) => {
    logger.info('Audit event: token_revocation', {
      event: 'token_revocation',
      tokenType: 'access_token',
      jti: token.jti,
      clientId: token.clientId,
      userId: token.accountId,
      grantId: token.grantId,
      reason: 'token_destroyed'
    });
  });

  provider.on('refresh_token.destroyed', (token) => {
    logger.info('Audit event: token_revocation', {
      event: 'token_revocation',
      tokenType: 'refresh_token',
      jti: token.jti,
      clientId: token.clientId,
      userId: token.accountId,
      grantId: token.grantId,
      reason: 'token_destroyed'
    });
  });

  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.use(express.urlencoded({ extended: true }));

  // Health-check endpoint
  app.get('/health', async (req, res) => {
    try {
      // Verify database connectivity
      await db.query('SELECT 1');
      // Verify Redis connectivity
      await cache.client.ping();
      res.status(200).json({
        status: 'healthy',
        database: 'connected',
        cache: 'connected'
      });
    } catch (err) {
      res.status(500).json({
        status: 'unhealthy',
        error: err.message
      });
    }
  });

  // Basic Rate-Limiting Middlewares
  const tokenLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
  });

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 requests per window
    message: 'Too many attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  });

  // Apply rate limiters to endpoints
  app.use('/token', tokenLimiter);
  app.post('/interaction/:uid/login', loginLimiter);
  app.post('/interaction/:uid/register', loginLimiter);

  // Middleware to support interaction context
  app.get('/interaction/:uid', async (req, res, next) => {
    try {
      const details = await provider.interactionDetails(req, res);
      const { uid, prompt, params } = details;
      console.log(`[Server debug] GET /interaction/${uid} - prompt.name="${prompt.name}" details=`, JSON.stringify(prompt));
      const client = await provider.Client.find(params.client_id);

      if (prompt.name === 'login') {
        return res.render('login', {
          uid,
          action: `/interaction/${uid}/login`,
          client,
          params,
          error: null
        });
      }

      if (prompt.name === 'consent') {
        const result = {
          consent: {
            rejectedScopes: [],
            rejectedClaims: []
          }
        };
        return await provider.interactionFinished(req, res, result, { mergeWithLastSubmission: true });
      }

      // Default fallback
      const result = {
        consent: {
          rejectedScopes: [],
          rejectedClaims: []
        }
      };
      await provider.interactionFinished(req, res, result, { mergeWithLastSubmission: true });
    } catch (err) {
      next(err);
    }
  });

  app.post('/interaction/:uid/login', async (req, res, next) => {
    try {
      const details = await provider.interactionDetails(req, res);
      const { uid, prompt, params } = details;
      const client = await provider.Client.find(params.client_id);

      const { email, password } = req.body;

      const dbRes = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
      const user = dbRes.rows[0];

      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        // Log failed login attempt
        logger.info('Audit event: failed_login_attempt', {
          event: 'failed_login_attempt',
          email: email.toLowerCase().trim(),
          clientId: params.client_id,
          ip: req.ip,
          userAgent: req.get('user-agent'),
          reason: 'Invalid email or password'
        });

        return res.render('login', {
          uid,
          action: `/interaction/${uid}/login`,
          client,
          params,
          error: 'Invalid email or password.'
        });
      }

      const result = {
        login: {
          accountId: user.id.toString(),
        },
      };

      // Log successful login
      logger.info('Audit event: successful_login', {
        event: 'successful_login',
        email: email.toLowerCase().trim(),
        userId: user.id.toString(),
        clientId: params.client_id,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });

      await provider.interactionFinished(req, res, result, { mergeWithLastSubmission: false });
    } catch (err) {
      next(err);
    }
  });

  app.get('/interaction/:uid/register', (req, res) => {
    const { uid } = req.params;
    res.render('register', {
      uid,
      error: null
    });
  });

  app.post('/interaction/:uid/register', async (req, res, next) => {
    const { uid } = req.params;
    const { name, email, password } = req.body;

    try {
      const details = await provider.interactionDetails(req, res);
      const { params } = details;
      const clientId = params.client_id;

      const dbRes = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
      if (dbRes.rows.length > 0) {
        // Log failed login due to existing user
        logger.info('Audit event: failed_login_attempt', {
          event: 'failed_login_attempt',
          email: email.toLowerCase().trim(),
          clientId,
          ip: req.ip,
          userAgent: req.get('user-agent'),
          reason: 'An account with this email already exists'
        });

        return res.render('register', {
          uid,
          error: 'An account with this email already exists.'
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const insertRes = await db.query(
        'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
        [name.trim(), email.toLowerCase().trim(), passwordHash]
      );
      const newUserId = insertRes.rows[0].id;

      const result = {
        login: {
          accountId: newUserId.toString(),
        },
      };

      // Log successful login (via registration)
      logger.info('Audit event: successful_login', {
        event: 'successful_login',
        email: email.toLowerCase().trim(),
        userId: newUserId.toString(),
        clientId,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        viaRegistration: true
      });

      await provider.interactionFinished(req, res, result, { mergeWithLastSubmission: false });
    } catch (err) {
      next(err);
    }
  });

  // Admin Security Dashboard Route
  app.get('/admin/dashboard', (req, res) => {
    try {
      const stats = getSecurityStats();
      const logs = getAuditLogs();
      res.render('dashboard', { stats, logs });
    } catch (err) {
      res.status(500).send('Error loading dashboard: ' + err.message);
    }
  });

  // Mount the OIDC provider's middleware (handles /auth, /token, /certs, etc.)
  app.use(provider.callback());

  // Load SSL certificate
  const certPath = path.join(__dirname, '../certs/localhost.crt');
  const keyPath = path.join(__dirname, '../certs/localhost.key');
  if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    console.error('SSL certificates not found. Please run "npm run certs" first.');
    process.exit(1);
  }

  const httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };

  https.createServer(httpsOptions, app).listen(PORT, () => {
    console.log(`Identity Provider running at HTTPS: https://localhost:${PORT}`);
    console.log(`OpenID Connect discovery endpoint: https://localhost:${PORT}/.well-known/openid-configuration`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start IDP Server:', err);
});
