const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const username = 'admin@worldconcord.com';
  const password = 'admin@GT.WorldConcord';
  const companyName = 'World Concord Admin';

  try {
    const hashed = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO shippers (
        username,
        password,
        company_name,
        company_email,
        is_admin,
        is_verified
      ) VALUES ($1, $2, $3, $4, TRUE, TRUE)
      ON CONFLICT (username) DO UPDATE SET
        password = EXCLUDED.password,
        company_name = EXCLUDED.company_name,
        company_email = EXCLUDED.company_email,
        is_admin = TRUE,
        is_verified = TRUE`,
      [username, hashed, companyName, username]
    );

    console.log(`Seeded admin account: ${username}`);
  } catch (error) {
    console.error('Failed to seed admin account:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
