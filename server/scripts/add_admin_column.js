const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    console.log('Running ALTER TABLE to add is_admin column...');
    await pool.query("ALTER TABLE shippers ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;");
    console.log('Column added (or already exists).');
  } catch (err) {
    console.error('Error running migration:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
