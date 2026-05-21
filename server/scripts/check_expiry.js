const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const res = await pool.query(
      `SELECT username, verification_expires, EXTRACT(EPOCH FROM (verification_expires - CURRENT_TIMESTAMP)) / 3600 as hours_until_expiry FROM pending_registrations WHERE username = $1`,
      ['newuser789']
    );
    res.rows.forEach(r => {
      console.log(`Username: ${r.username}`);
      console.log(`Expires at: ${r.verification_expires}`);
      console.log(`Hours until expiry: ${Math.round(r.hours_until_expiry)}`);
    });
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
