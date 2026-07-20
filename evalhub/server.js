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
    id: 'python-mastery',
    title: 'Python Fundamentals & Scripting',
    category: 'Programming',
    badge: 'Python Developer',
    icon: 'Terminal',
    description: 'Test your core knowledge of Python data structures, list comprehensions, built-ins, and syntax.',
    timeLimitSeconds: 240,
    questions: [
      {
        id: 1,
        question: 'What is the output of type([]) in Python?',
        options: [
          '<class "list">',
          '<class "array">',
          '<class "tuple">',
          '<class "object">'
        ],
        correctAnswer: 0,
        explanation: '[] denotes a list in Python, so its type is <class "list">.'
      },
      {
        id: 2,
        question: 'Which keyword is used to declare a function in Python?',
        options: [
          'function',
          'def',
          'func',
          'define'
        ],
        correctAnswer: 1,
        explanation: 'The "def" keyword is used to define a function in Python.'
      },
      {
        id: 3,
        question: 'What is the value of 2 ** 3 in Python?',
        options: [
          '6',
          '8',
          '9',
          '5'
        ],
        correctAnswer: 1,
        explanation: '** is the exponentiation operator in Python. 2 ** 3 equals 8.'
      },
      {
        id: 4,
        question: 'Which of the following data structures is immutable in Python?',
        options: [
          'List',
          'Dictionary',
          'Set',
          'Tuple'
        ],
        correctAnswer: 3,
        explanation: 'Tuples are immutable sequence types whose elements cannot be modified after creation.'
      },
      {
        id: 5,
        question: 'What does len({"a": 1, "b": 2}) return in Python?',
        options: [
          '1',
          '2',
          '4',
          '0'
        ],
        correctAnswer: 1,
        explanation: 'len() returns the number of key-value pairs in a dictionary, which is 2.'
      }
    ]
  },
  {
    id: 'java-core',
    title: 'Java Core & OOP Concepts',
    category: 'Programming',
    badge: 'Java Architect',
    icon: 'Code2',
    description: 'Assess Object-Oriented Programming principles, JVM fundamentals, interfaces, and exception handling.',
    timeLimitSeconds: 240,
    questions: [
      {
        id: 1,
        question: 'Which of the following is NOT a primitive data type in Java?',
        options: [
          'int',
          'boolean',
          'String',
          'double'
        ],
        correctAnswer: 2,
        explanation: 'String is a reference object class in Java, whereas int, boolean, and double are primitive types.'
      },
      {
        id: 2,
        question: 'Which keyword is used by a Java class to inherit an interface?',
        options: [
          'extends',
          'implements',
          'inherits',
          'imports'
        ],
        correctAnswer: 1,
        explanation: 'Classes use the "implements" keyword to declare and implement interfaces in Java.'
      },
      {
        id: 3,
        question: 'What is the default value of an uninitialized boolean field in a Java class?',
        options: [
          'true',
          'false',
          'null',
          '0'
        ],
        correctAnswer: 1,
        explanation: 'Uninitialized class instance variables of primitive boolean type default to false.'
      },
      {
        id: 4,
        question: 'Which component enables Java "Write Once, Run Anywhere" capability?',
        options: [
          'Java Virtual Machine (JVM)',
          'Garbage Collector',
          'Java Compiler (javac)',
          'Java SDK'
        ],
        correctAnswer: 0,
        explanation: 'The JVM executes compiled bytecode (.class files) across any underlying operating system.'
      },
      {
        id: 5,
        question: 'What is the superclass of all classes in Java?',
        options: [
          'java.lang.System',
          'java.lang.Object',
          'java.lang.Class',
          'java.lang.Main'
        ],
        correctAnswer: 1,
        explanation: 'java.lang.Object is the root class of the Java class hierarchy.'
      }
    ]
  },
  {
    id: 'general-knowledge',
    title: 'General Knowledge & Science',
    category: 'General Studies',
    badge: 'Trivia Champion',
    icon: 'Globe',
    description: 'Test your knowledge across world geography, science, history, and famous facts.',
    timeLimitSeconds: 240,
    questions: [
      {
        id: 1,
        question: 'Which planet in our solar system is known as the "Red Planet"?',
        options: [
          'Venus',
          'Mars',
          'Jupiter',
          'Saturn'
        ],
        correctAnswer: 1,
        explanation: 'Mars gets its reddish appearance from iron oxide (rust) on its surface.'
      },
      {
        id: 2,
        question: 'What is the chemical symbol for Gold?',
        options: [
          'Ag',
          'Fe',
          'Au',
          'Gd'
        ],
        correctAnswer: 2,
        explanation: 'The chemical symbol for Gold is Au, derived from the Latin word aurum.'
      },
      {
        id: 3,
        question: 'What is the largest ocean on Earth?',
        options: [
          'Atlantic Ocean',
          'Indian Ocean',
          'Arctic Ocean',
          'Pacific Ocean'
        ],
        correctAnswer: 3,
        explanation: 'The Pacific Ocean is the largest and deepest ocean basin on Earth.'
      },
      {
        id: 4,
        question: 'Who wrote the famous play "Romeo and Juliet"?',
        options: [
          'Charles Dickens',
          'William Shakespeare',
          'Mark Twain',
          'Jane Austen'
        ],
        correctAnswer: 1,
        explanation: '"Romeo and Juliet" is a famous tragedy written by William Shakespeare.'
      },
      {
        id: 5,
        question: 'Which gas do plants absorb from the atmosphere during photosynthesis?',
        options: [
          'Oxygen',
          'Carbon Dioxide',
          'Nitrogen',
          'Hydrogen'
        ],
        correctAnswer: 1,
        explanation: 'Plants absorb Carbon Dioxide (CO2) and water to produce glucose and release Oxygen.'
      }
    ]
  },
  {
    id: 'basic-mathematics',
    title: 'Basic Mathematics & Aptitude',
    category: 'Mathematics',
    badge: 'Math Wizard',
    icon: 'Calculator',
    description: 'Solve arithmetic problems, percentages, geometry, and numerical reasoning questions.',
    timeLimitSeconds: 240,
    questions: [
      {
        id: 1,
        question: 'What is the value of (15 × 4) - 20?',
        options: [
          '40',
          '50',
          '60',
          '30'
        ],
        correctAnswer: 0,
        explanation: '15 × 4 = 60, then 60 - 20 = 40.'
      },
      {
        id: 2,
        question: 'What is 25% of 200?',
        options: [
          '25',
          '50',
          '75',
          '100'
        ],
        correctAnswer: 1,
        explanation: '25% = 0.25. 0.25 × 200 = 50.'
      },
      {
        id: 3,
        question: 'What is the square root of 144?',
        options: [
          '10',
          '11',
          '12',
          '14'
        ],
        correctAnswer: 2,
        explanation: '12 × 12 = 144, so the square root is 12.'
      },
      {
        id: 4,
        question: 'If a triangle has angles measuring 60° and 70°, what is the measure of the third angle?',
        options: [
          '50°',
          '60°',
          '70°',
          '90°'
        ],
        correctAnswer: 0,
        explanation: 'The sum of angles in a triangle is 180°. 180° - (60° + 70°) = 50°.'
      },
      {
        id: 5,
        question: 'What is the next number in the sequence: 2, 4, 8, 16, ___?',
        options: [
          '24',
          '30',
          '32',
          '64'
        ],
        correctAnswer: 2,
        explanation: 'Each number doubles the previous number (16 × 2 = 32).'
      }
    ]
  }
];

// Global Leaderboard Mock Store
let LEADERBOARD = [
  { name: 'Alex Johnson', email: 'alex@company.com', score: 100, badge: 'Python Developer', date: '2026-07-20' },
  { name: 'Maria Garcia', email: 'maria@company.com', score: 100, badge: 'Java Architect', date: '2026-07-19' },
  { name: 'Devin Smith', email: 'devin@company.com', score: 80, badge: 'Math Wizard', date: '2026-07-18' }
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
