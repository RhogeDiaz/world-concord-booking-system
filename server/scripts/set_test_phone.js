const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    await pool.query("UPDATE shippers SET company_phone = $1 WHERE username = $2", ['555-111-2222', 'testuser']);
    console.log('Updated testuser phone');
  } catch (error) {
    console.error('Failed to update phone:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
