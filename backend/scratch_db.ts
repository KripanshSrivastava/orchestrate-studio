import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

import pool from './database/pool.js';

async function check() {
  try {
    const res = await pool.query('SELECT * FROM execution_runs ORDER BY started_at DESC LIMIT 3');
    console.log('Execution runs:', JSON.stringify(res.rows, null, 2));
    
    const wfRes = await pool.query('SELECT * FROM workflows ORDER BY created_at DESC LIMIT 1');
    console.log('Workflows:', JSON.stringify(wfRes.rows, null, 2));
  } catch (e) {
    console.error('Error:', e);
  } finally {
    pool.end();
  }
}

check();
