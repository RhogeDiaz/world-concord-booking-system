const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const result = await pool.query(
      "SELECT id, username, company_email, is_admin, is_verified, password FROM shippers WHERE username = 'admin@worldconcord.com' LIMIT 1"
    );
    console.log(JSON.stringify(result.rows[0] || null, null, 2));
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
