const { Pool } = require('pg');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'mysecretpassword';
const DB_NAME = process.env.DB_NAME || 'sso_db';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);

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
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

async function initializeDatabase(retries = 3, delayMs = 1000) {
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
    console.log('In-memory database user schema initialized successfully.');
    return;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Connecting to database at ${DB_HOST}:${DB_PORT} (Attempt ${attempt}/${retries})...`);
      // Test the pool connection
      const client = await pool.connect();
      client.release();

      // Initialize table structure
      await query(createUserTableQuery);
      console.log('Database user schema initialized successfully.');
      return;
    } catch (err) {
      console.error(`Database connection/init failed (Attempt ${attempt}/${retries}):`, err.message);
      if (attempt === retries) {
        console.warn('⚠️ Real PostgreSQL connection failed. Falling back to in-memory database (pg-mem) for development...');
        setupInMemory();
        await query(createUserTableQuery);
        console.log('In-memory database user schema initialized successfully.');
        return;
      }
      console.log(`Retrying database connection in ${delayMs / 1000} seconds...`);
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
