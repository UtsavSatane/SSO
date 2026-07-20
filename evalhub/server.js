const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { Strategy, Issuer } = require('openid-client');
const path = require('path');
const fs = require('fs');
const https = require('https');

// SSL Certificates for Local Development HTTPS
const certPath = path.join(__dirname, '..', 'certs', 'localhost.crt');
const keyPath = path.join(__dirname, '..', 'certs', 'localhost.key');

const httpsOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath)
};

const app = express();
const PORT = process.env.PORT || 5003;
const IDP_URL = process.env.IDP_URL || 'https://localhost:5000';
const CLIENT_ID = 'evalhub';
const CLIENT_SECRET = 'evalhub-secret-999';
const REDIRECT_URI = 'https://localhost:5003/callback';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: 'evalhub-session-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

let client;

async function initializeOidcClient() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  try {
    console.log(`[EvalHub] Discovering OIDC Issuer at ${IDP_URL}...`);
    const issuer = await Issuer.discover(IDP_URL);
    client = new issuer.Client({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uris: [REDIRECT_URI],
      response_types: ['code']
    });

    passport.use(
      'oidc',
      new Strategy(
        {
          client,
          params: { scope: 'openid profile email' }
        },
        (tokenset, userinfo, done) => {
          const user = {
            id: userinfo.sub,
            email: userinfo.email,
            name: userinfo.name || userinfo.email,
            idToken: tokenset.id_token,
            accessToken: tokenset.access_token
          };
          return done(null, user);
        }
      )
    );

    console.log('✅ [EvalHub] OIDC Client successfully registered with Identity Provider.');
  } catch (err) {
    console.error('[EvalHub] Failed to discover OpenID Connect Identity Provider. Retrying in 5 seconds...', err.message);
    setTimeout(initializeOidcClient, 5000);
  }
}

initializeOidcClient();

// Expanded Question Pools Database (10 Unique Questions Per Topic with String IDs)
const QUIZ_DATABASE = [
  {
    id: 'python-mastery',
    title: 'Python Fundamentals & Scripting',
    category: 'Programming',
    badge: 'Python Developer',
    icon: 'Terminal',
    description: 'Test your core knowledge of Python data structures, list comprehensions, built-ins, and syntax.',
    timeLimitSeconds: 240,
    questionsPool: [
      {
        id: 'py-1',
        question: 'What is the output of type([]) in Python?',
        options: ['<class "list">', '<class "array">', '<class "tuple">', '<class "object">'],
        correctAnswer: 0,
        explanation: '[] denotes a list in Python, so its type is <class "list">.'
      },
      {
        id: 'py-2',
        question: 'Which keyword is used to declare a function in Python?',
        options: ['function', 'def', 'func', 'define'],
        correctAnswer: 1,
        explanation: 'The "def" keyword is used to define a function in Python.'
      },
      {
        id: 'py-3',
        question: 'What is the value of 2 ** 3 in Python?',
        options: ['6', '8', '9', '5'],
        correctAnswer: 1,
        explanation: '** is the exponentiation operator in Python. 2 ** 3 equals 8.'
      },
      {
        id: 'py-4',
        question: 'Which of the following data structures is immutable in Python?',
        options: ['List', 'Dictionary', 'Set', 'Tuple'],
        correctAnswer: 3,
        explanation: 'Tuples are immutable sequence types whose elements cannot be modified after creation.'
      },
      {
        id: 'py-5',
        question: 'What does len({"a": 1, "b": 2}) return in Python?',
        options: ['1', '2', '4', '0'],
        correctAnswer: 1,
        explanation: 'len() returns the number of key-value pairs in a dictionary, which is 2.'
      },
      {
        id: 'py-6',
        question: 'Which method adds a single item to the end of a Python list?',
        options: ['append()', 'add()', 'push()', 'insert()'],
        correctAnswer: 0,
        explanation: 'The append() method adds an element to the end of a list.'
      },
      {
        id: 'py-7',
        question: 'What is the character at index 1 of string "Hello"?',
        options: ['H', 'e', 'l', 'o'],
        correctAnswer: 1,
        explanation: 'Python uses 0-based indexing. Index 0 is "H", index 1 is "e".'
      },
      {
        id: 'py-8',
        question: 'Which block catches exceptions in Python try statements?',
        options: ['catch', 'except', 'error', 'handle'],
        correctAnswer: 1,
        explanation: 'The "except" block handles exceptions in Python.'
      },
      {
        id: 'py-9',
        question: 'What is the boolean evaluation of bool(0) in Python?',
        options: ['True', 'False', 'None', 'Error'],
        correctAnswer: 1,
        explanation: 'Numeric zero evaluates to False in Python.'
      },
      {
        id: 'py-10',
        question: 'Which standard library module generates pseudo-random numbers?',
        options: ['math', 'random', 'sys', 'os'],
        correctAnswer: 1,
        explanation: 'The "random" module provides random number generator tools.'
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
    questionsPool: [
      {
        id: 'java-1',
        question: 'Which of the following is NOT a primitive data type in Java?',
        options: ['int', 'boolean', 'String', 'double'],
        correctAnswer: 2,
        explanation: 'String is a reference object class in Java, whereas int, boolean, and double are primitive types.'
      },
      {
        id: 'java-2',
        question: 'Which keyword is used by a Java class to inherit an interface?',
        options: ['extends', 'implements', 'inherits', 'imports'],
        correctAnswer: 1,
        explanation: 'Classes use the "implements" keyword to declare and implement interfaces in Java.'
      },
      {
        id: 'java-3',
        question: 'What is the default value of an uninitialized boolean field in a Java class?',
        options: ['true', 'false', 'null', '0'],
        correctAnswer: 1,
        explanation: 'Uninitialized class instance variables of primitive boolean type default to false.'
      },
      {
        id: 'java-4',
        question: 'Which component enables Java "Write Once, Run Anywhere" capability?',
        options: ['Java Virtual Machine (JVM)', 'Garbage Collector', 'Java Compiler (javac)', 'Java SDK'],
        correctAnswer: 0,
        explanation: 'The JVM executes compiled bytecode (.class files) across any underlying operating system.'
      },
      {
        id: 'java-5',
        question: 'What is the superclass of all classes in Java?',
        options: ['java.lang.System', 'java.lang.Object', 'java.lang.Class', 'java.lang.Main'],
        correctAnswer: 1,
        explanation: 'java.lang.Object is the root class of the Java class hierarchy.'
      },
      {
        id: 'java-6',
        question: 'Which modifier prevents a class from being subclassed in Java?',
        options: ['static', 'final', 'abstract', 'private'],
        correctAnswer: 1,
        explanation: 'A final class cannot be extended by any other class.'
      },
      {
        id: 'java-7',
        question: 'How do you declare an array of 5 integers in Java?',
        options: ['int[] arr = new int[5];', 'int arr[5];', 'array<int> arr = 5;', 'int arr = new array(5);'],
        correctAnswer: 0,
        explanation: 'int[] arr = new int[5]; allocates memory for 5 integer elements.'
      },
      {
        id: 'java-8',
        question: 'Which access modifier grants visibility only to package members and subclasses?',
        options: ['public', 'private', 'protected', 'package-private'],
        correctAnswer: 2,
        explanation: 'protected members are accessible within the package and by subclasses.'
      },
      {
        id: 'java-9',
        question: 'Which Java collection interface does NOT allow duplicate elements?',
        options: ['List', 'Set', 'Queue', 'Collection'],
        correctAnswer: 1,
        explanation: 'A Set is a Collection that contains no duplicate elements.'
      },
      {
        id: 'java-10',
        question: 'Which method starts execution of a Thread object in Java?',
        options: ['run()', 'start()', 'execute()', 'begin()'],
        correctAnswer: 1,
        explanation: 'Calling start() causes the thread to begin execution and invokes its run() method.'
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
    questionsPool: [
      {
        id: 'gk-1',
        question: 'Which planet in our solar system is known as the "Red Planet"?',
        options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
        correctAnswer: 1,
        explanation: 'Mars gets its reddish appearance from iron oxide (rust) on its surface.'
      },
      {
        id: 'gk-2',
        question: 'What is the chemical symbol for Gold?',
        options: ['Ag', 'Fe', 'Au', 'Gd'],
        correctAnswer: 2,
        explanation: 'The chemical symbol for Gold is Au, derived from the Latin word aurum.'
      },
      {
        id: 'gk-3',
        question: 'What is the largest ocean on Earth?',
        options: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean', 'Pacific Ocean'],
        correctAnswer: 3,
        explanation: 'The Pacific Ocean is the largest and deepest ocean basin on Earth.'
      },
      {
        id: 'gk-4',
        question: 'Who wrote the famous play "Romeo and Juliet"?',
        options: ['Charles Dickens', 'William Shakespeare', 'Mark Twain', 'Jane Austen'],
        correctAnswer: 1,
        explanation: '"Romeo and Juliet" is a famous tragedy written by William Shakespeare.'
      },
      {
        id: 'gk-5',
        question: 'Which gas do plants absorb from the atmosphere during photosynthesis?',
        options: ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Hydrogen'],
        correctAnswer: 1,
        explanation: 'Plants absorb Carbon Dioxide (CO2) and water to produce glucose and release Oxygen.'
      },
      {
        id: 'gk-6',
        question: 'What is the capital city of Japan?',
        options: ['Kyoto', 'Osaka', 'Tokyo', 'Hiroshima'],
        correctAnswer: 2,
        explanation: 'Tokyo is the capital and largest metropolis of Japan.'
      },
      {
        id: 'gk-7',
        question: 'Which element is most abundant in Earth\'s atmosphere?',
        options: ['Oxygen', 'Nitrogen', 'Carbon', 'Argon'],
        correctAnswer: 1,
        explanation: 'Nitrogen makes up approximately 78% of Earth\'s atmosphere.'
      },
      {
        id: 'gk-8',
        question: 'What is the hardest naturally occurring substance on Earth?',
        options: ['Quartz', 'Titanium', 'Diamond', 'Granite'],
        correctAnswer: 2,
        explanation: 'Diamond is the hardest known natural material on Mohs hardness scale.'
      },
      {
        id: 'gk-9',
        question: 'Which organ pumps blood throughout the human body?',
        options: ['Lungs', 'Liver', 'Heart', 'Kidneys'],
        correctAnswer: 2,
        explanation: 'The Heart is the muscular organ that pumps blood through the circulatory system.'
      },
      {
        id: 'gk-10',
        question: 'What is the official currency of the United Kingdom?',
        options: ['Euro', 'Pound Sterling (£)', 'Dollar', 'Franc'],
        correctAnswer: 1,
        explanation: 'The official currency of the United Kingdom is the Pound Sterling.'
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
    questionsPool: [
      {
        id: 'math-1',
        question: 'What is the value of (15 × 4) - 20?',
        options: ['40', '50', '60', '30'],
        correctAnswer: 0,
        explanation: '15 × 4 = 60, then 60 - 20 = 40.'
      },
      {
        id: 'math-2',
        question: 'What is 25% of 200?',
        options: ['25', '50', '75', '100'],
        correctAnswer: 1,
        explanation: '25% = 0.25. 0.25 × 200 = 50.'
      },
      {
        id: 'math-3',
        question: 'What is the square root of 144?',
        options: ['10', '11', '12', '14'],
        correctAnswer: 2,
        explanation: '12 × 12 = 144, so the square root is 12.'
      },
      {
        id: 'math-4',
        question: 'If a triangle has angles measuring 60° and 70°, what is the measure of the third angle?',
        options: ['50°', '60°', '70°', '90°'],
        correctAnswer: 0,
        explanation: 'The sum of angles in a triangle is 180°. 180° - (60° + 70°) = 50°.'
      },
      {
        id: 'math-5',
        question: 'What is the next number in the sequence: 2, 4, 8, 16, ___?',
        options: ['24', '30', '32', '64'],
        correctAnswer: 2,
        explanation: 'Each number doubles the previous number (16 × 2 = 32).'
      },
      {
        id: 'math-6',
        question: 'If a vehicle travels 120 km in 2 hours, what is its average speed?',
        options: ['50 km/h', '60 km/h', '70 km/h', '80 km/h'],
        correctAnswer: 1,
        explanation: 'Speed = Distance / Time = 120 / 2 = 60 km/h.'
      },
      {
        id: 'math-7',
        question: 'What is the square of 15 (15²)?',
        options: ['200', '215', '225', '250'],
        correctAnswer: 2,
        explanation: '15 × 15 = 225.'
      },
      {
        id: 'math-8',
        question: 'What is the smallest prime number?',
        options: ['0', '1', '2', '3'],
        correctAnswer: 2,
        explanation: '2 is the smallest and only even prime number.'
      },
      {
        id: 'math-9',
        question: 'Convert the fraction 3/4 into a percentage.',
        options: ['60%', '70%', '75%', '80%'],
        correctAnswer: 2,
        explanation: '3 ÷ 4 = 0.75 = 75%.'
      },
      {
        id: 'math-10',
        question: 'Solve for x: 3x + 9 = 24',
        options: ['3', '4', '5', '6'],
        correctAnswer: 2,
        explanation: '3x = 24 - 9 = 15, so x = 15 / 3 = 5.'
      }
    ]
  },
  {
    id: 'sports-athletics',
    title: 'Sports & World Athletics',
    category: 'Sports',
    badge: 'Sports Legend',
    icon: 'Trophy',
    description: 'Test your knowledge across football, cricket, tennis, Olympic records, and world athletics.',
    timeLimitSeconds: 240,
    questionsPool: [
      {
        id: 'sports-1',
        question: 'Which country won the FIFA World Cup in 2022?',
        options: ['France', 'Brazil', 'Argentina', 'Croatia'],
        correctAnswer: 2,
        explanation: 'Argentina won the 2022 FIFA World Cup in Qatar after defeating France in a dramatic final.'
      },
      {
        id: 'sports-2',
        question: 'How many players are on the field for one team in a standard Cricket match?',
        options: ['9', '10', '11', '12'],
        correctAnswer: 2,
        explanation: 'A standard cricket team consists of 11 active players on the field.'
      },
      {
        id: 'sports-3',
        question: 'In Tennis, what term is used to describe a score of 40-40 in a game?',
        options: ['Love', 'Deuce', 'Advantage', 'Break'],
        correctAnswer: 1,
        explanation: 'A score of 40-40 in a game of tennis is called Deuce.'
      },
      {
        id: 'sports-4',
        question: 'Who holds the 100m sprint world record time of 9.58 seconds?',
        options: ['Tyson Gay', 'Usain Bolt', 'Yohan Blake', 'Justin Gatlin'],
        correctAnswer: 1,
        explanation: 'Usain Bolt set the 100m world record of 9.58 seconds at the 2009 World Athletics Championships in Berlin.'
      },
      {
        id: 'sports-5',
        question: 'Which sport uses terms like "Eagle", "Birdie", and "Bogey"?',
        options: ['Golf', 'Badminton', 'Baseball', 'Polo'],
        correctAnswer: 0,
        explanation: 'These terms represent scores relative to par on a hole in Golf.'
      },
      {
        id: 'sports-6',
        question: 'Which city hosted the 2024 Summer Olympic Games?',
        options: ['Tokyo', 'London', 'Paris', 'Los Angeles'],
        correctAnswer: 2,
        explanation: 'Paris, France hosted the 2024 Summer Olympic Games.'
      },
      {
        id: 'sports-7',
        question: 'In Basketball, how many points is a shot worth when taken from beyond the arc?',
        options: ['1 point', '2 points', '3 points', '4 points'],
        correctAnswer: 2,
        explanation: 'Field goals made from outside the three-point line are worth 3 points.'
      },
      {
        id: 'sports-8',
        question: 'Which Grand Slam tennis tournament is famously played on grass courts?',
        options: ['Australian Open', 'French Open', 'Wimbledon', 'US Open'],
        correctAnswer: 2,
        explanation: 'Wimbledon is the world\'s oldest tennis tournament played on grass courts.'
      },
      {
        id: 'sports-9',
        question: 'What is the standard duration of a professional Football (Soccer) match?',
        options: ['80 minutes', '90 minutes', '100 minutes', '120 minutes'],
        correctAnswer: 1,
        explanation: 'A standard soccer match consists of two 45-minute halves totaling 90 minutes.'
      },
      {
        id: 'sports-10',
        question: 'In Boxing, what does the abbreviation "KO" stand for?',
        options: ['Knockout', 'Kick Out', 'Key Option', 'King Of Ring'],
        correctAnswer: 0,
        explanation: 'KO stands for Knockout.'
      }
    ]
  }
];

// Helper: Pick N random questions from pool
function sampleRandomQuestions(pool, count = 5) {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Global Leaderboard Mock Store
let LEADERBOARD = [
  { name: 'Alex Johnson', email: 'alex@company.com', score: 100, badge: 'Python Developer', date: '2026-07-20' },
  { name: 'Maria Garcia', email: 'maria@company.com', score: 100, badge: 'Java Architect', date: '2026-07-19' },
  { name: 'Devin Smith', email: 'devin@company.com', score: 80, badge: 'Math Wizard', date: '2026-07-18' }
];

// Get List of Quizzes (each with 5 randomly sampled questions)
app.get('/api/quizzes', (req, res) => {
  const dynamicQuizzes = QUIZ_DATABASE.map(q => ({
    id: q.id,
    title: q.title,
    category: q.category,
    badge: q.badge,
    icon: q.icon,
    description: q.description,
    timeLimitSeconds: q.timeLimitSeconds,
    questions: sampleRandomQuestions(q.questionsPool, 5)
  }));
  res.json(dynamicQuizzes);
});

// Endpoint to fetch fresh 5 random questions for a specific quiz
app.get('/api/quiz/:id/questions', (req, res) => {
  const quiz = QUIZ_DATABASE.find(q => q.id === req.params.id);
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz topic not found.' });
  }
  res.json({
    quizId: quiz.id,
    questions: sampleRandomQuestions(quiz.questionsPool, 5)
  });
});

app.post('/api/submit-quiz', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Must be logged in via SSO to submit assessments.' });
  }

  const { quizId, userAnswers, timeSpent, submittedQuestions } = req.body;
  const quiz = QUIZ_DATABASE.find(q => q.id === quizId);

  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found.' });
  }

  // Use submitted questions if provided, otherwise sample 5 from pool
  const questionList = (submittedQuestions && submittedQuestions.length > 0)
    ? submittedQuestions
    : quiz.questionsPool.slice(0, 5);

  let correctCount = 0;
  questionList.forEach((q) => {
    const userSelected = userAnswers ? (userAnswers[q.id] !== undefined ? userAnswers[q.id] : userAnswers[q.id.toString()]) : undefined;
    if (userSelected === q.correctAnswer) {
      correctCount++;
    }
  });

  const percentage = Math.round((correctCount / questionList.length) * 100);
  const passed = percentage >= 70;
  const resultObj = {
    id: Date.now(),
    quizId: quiz.id,
    quizTitle: quiz.title,
    badge: quiz.badge,
    score: percentage,
    correctCount,
    totalQuestions: questionList.length,
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
    LEADERBOARD = LEADERBOARD.sort((a, b) => b.score - a.score).slice(0, 10);
  }

  res.json({
    result: resultObj,
    history: req.session.assessmentHistory,
    questions: questionList
  });
});

app.get('/api/leaderboard', (req, res) => {
  res.json(LEADERBOARD);
});

app.get('/api/session', (req, res) => {
  if (req.user) {
    req.session.user = req.user;
  }

  res.json({
    authenticated: !!req.session.user,
    user: req.session.user || null,
    history: req.session.assessmentHistory || []
  });
});

// OIDC Authentication Routes
app.get('/login', (req, res, next) => {
  if (!client) {
    return res.status(503).send('Identity Provider connecting... Please refresh in 5 seconds.');
  }
  passport.authenticate('oidc')(req, res, next);
});

app.get(
  '/callback',
  passport.authenticate('oidc', {
    failureRedirect: '/login-failed'
  }),
  (req, res) => {
    req.session.user = req.user;
    res.redirect('/');
  }
);

app.get('/logout', (req, res) => {
  const idToken = req.session.user?.idToken;
  req.session.destroy(() => {
    if (idToken && client) {
      const endSessionUrl = client.endSessionUrl({
        id_token_hint: idToken,
        post_logout_redirect_uri: 'https://localhost:5003/'
      });
      return res.redirect(endSessionUrl);
    }
    res.redirect('/');
  });
});

app.get('/login-failed', (req, res) => {
  res.status(401).send('SSO Authentication Failed. <a href="/">Return to Home</a>');
});

// Serve Static Frontend Assets
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

https.createServer(httpsOptions, app).listen(PORT, () => {
  console.log(`EvalHub running at HTTPS: https://localhost:${PORT}`);
});
