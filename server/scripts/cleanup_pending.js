const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    await pool.query('DELETE FROM pending_registrations WHERE username = $1', ['testuser123']);
    console.log('Deleted testuser123 from pending_registrations');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
