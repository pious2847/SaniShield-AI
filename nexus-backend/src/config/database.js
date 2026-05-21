const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      console.error('[DB] Unexpected pool error:', err.message);
    });
  }
  return pool;
}

async function query(text, params) {
  const pool = getPool();
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 1000) {
    console.warn(`[DB] Slow query (${duration}ms):`, text.substring(0, 80));
  }
  return result;
}

async function queryWithRetry(text, params, retries = 3) {
  for (let i = 1; i <= retries; i++) {
    try {
      return await query(text, params);
    } catch (err) {
      const isTimeout = err.message && (err.message.includes('timeout') || err.message.includes('terminated'));
      if (!isTimeout || i === retries) throw err;
      console.warn(`[DB] Retry ${i}/${retries} after timeout on: ${text.substring(0, 60)}`);
      await new Promise(r => setTimeout(r, 2000 * i));
    }
  }
}

async function getClient() {
  return getPool().connect();
}

async function initDb() {
  const fs = require('fs');
  const path = require('path');
  const schema = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8');
  await query(schema);
  console.log('[DB] Schema initialized on Neon PostgreSQL');
}

module.exports = { query, queryWithRetry, getClient, getPool, initDb };
