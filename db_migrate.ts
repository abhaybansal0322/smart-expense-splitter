import { Pool } from '@neondatabase/serverless';

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(`ALTER TYPE split_type ADD VALUE IF NOT EXISTS 'adjustment';`);
    console.log('Successfully altered split_type enum');
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}
run();
