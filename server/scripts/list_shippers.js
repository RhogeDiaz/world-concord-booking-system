const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const res = await pool.query(`SELECT id, username, company_email, is_verified, verification_code, verification_expires FROM shippers ORDER BY id DESC LIMIT 10`);
    console.log('Recent shippers:');
    for (const row of res.rows) {
      console.log(JSON.stringify(row));
    }
  } catch (err) {
    console.error('Error querying shippers:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
