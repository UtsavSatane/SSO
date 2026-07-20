const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'mysecretpassword';
const DB_NAME = process.env.DB_NAME || 'sso_db';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DEV_USERS_FILE = path.join(__dirname, 'dev-users.json');

let pool;
let isInMemory = false;

if (process.env.USE_MOCKS === 'true') {
  setupInMemory();
} else {
  pool = new Pool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  pool.on('error', (err) => {
    if (!isInMemory) {
      console.error('Unexpected error on idle PostgreSQL client:', err);
    }
  });
}

function setupInMemory() {
  console.log('⚠️ Falling back to in-memory PostgreSQL (pg-mem) database emulator.');
  isInMemory = true;
  const { newDb } = require('pg-mem');
  const memDb = newDb();
  const pgMock = memDb.adapters.createPg();
  pool = new pgMock.Pool();
}

async function query(text, params) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    // Automatically persist dev users if in-memory mode is active and query modifies users
    if (isInMemory && /insert\s+into\s+users/i.test(text)) {
      try {
        const usersRes = await client.query('SELECT * FROM users');
        fs.writeFileSync(DEV_USERS_FILE, JSON.stringify(usersRes.rows, null, 2));
      } catch (e) {
        console.error('Failed to sync dev users:', e.message);
      }
    }
    return res;
  } finally {
    client.release();
  }
}

async function loadDevUsersFromFile() {
  if (!isInMemory) return;
  try {
    if (fs.existsSync(DEV_USERS_FILE)) {
      const data = fs.readFileSync(DEV_USERS_FILE, 'utf8');
      const users = JSON.parse(data);
      for (const u of users) {
        const existing = await query('SELECT * FROM users WHERE email = $1', [u.email]);
        if (existing.rows.length === 0) {
          await query(
            'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)',
            [u.name, u.email, u.password_hash]
          );
        }
      }
      console.log(`✅ Loaded ${users.length} persistent dev user(s) from ${DEV_USERS_FILE}.`);
    }
  } catch (err) {
    console.error('Failed to load dev users from file:', err.message);
  }
}

async function initializeDatabase(retries = 1, delayMs = 500) {
  const createUserTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  if (isInMemory) {
    await query(createUserTableQuery);
    await loadDevUsersFromFile();
    console.log('In-memory database user schema initialized successfully.');
    return;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Connecting to database at ${DB_HOST}:${DB_PORT} (Attempt ${attempt}/${retries})...`);
      const client = await pool.connect();
      client.release();

      await query(createUserTableQuery);
      console.log('Database user schema initialized successfully.');
      return;
    } catch (err) {
      console.error(`Database connection/init failed (Attempt ${attempt}/${retries}):`, err.message);
      if (attempt === retries) {
        console.warn('⚠️ Real PostgreSQL connection failed. Falling back to persistent in-memory database for development...');
        setupInMemory();
        await query(createUserTableQuery);
        await loadDevUsersFromFile();
        console.log('In-memory database user schema initialized successfully.');
        return;
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

module.exports = {
  query,
  initializeDatabase,
  isInMemory: () => isInMemory,
  get pool() {
    return pool;
  }
};
