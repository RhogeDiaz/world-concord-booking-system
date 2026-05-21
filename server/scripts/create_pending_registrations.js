const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    console.log('Creating pending_registrations table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pending_registrations (
        id SERIAL PRIMARY KEY,
        username VARCHAR UNIQUE NOT NULL,
        email VARCHAR,
        password VARCHAR NOT NULL,
        company_name VARCHAR NOT NULL,
        company_address VARCHAR,
        company_phone VARCHAR,
        company_email VARCHAR,
        verification_code VARCHAR NOT NULL,
        verification_expires TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('pending_registrations table created (or already exists).');
  } catch (error) {
    console.error('Error creating table:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
