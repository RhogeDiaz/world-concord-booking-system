const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    console.log('Adding missing columns to shipments table...');
    await pool.query(`
      ALTER TABLE shipments
      ADD COLUMN IF NOT EXISTS pickup_location VARCHAR,
      ADD COLUMN IF NOT EXISTS book_date TIMESTAMP;
    `);
    console.log('Migration complete.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
