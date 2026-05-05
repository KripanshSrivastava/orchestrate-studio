import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

import secretManagerService from './services/secrets/secretManagerService.js';

async function test() {
  try {
    const res = await secretManagerService.getUserIntegrationValues('test-user', 'github');
    console.log('Success:', res);
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
