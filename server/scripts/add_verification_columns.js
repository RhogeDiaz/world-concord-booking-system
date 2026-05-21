const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    console.log('Adding verification columns to shippers...');
    await pool.query(
      `ALTER TABLE shippers
        ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS verification_code VARCHAR,
        ADD COLUMN IF NOT EXISTS verification_expires TIMESTAMP;`
    );
    console.log('done');
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
