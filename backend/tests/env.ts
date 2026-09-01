import { existsSync } from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const envFile = path.resolve(__dirname, '..', '.env.test');

if (existsSync(envFile)) {
  dotenv.config({ path: envFile, override: true, quiet: true });
}

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test_jwt_secret_for_the_operations_portal';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '1h';
process.env.S3_IMAGE_BUCKET = '';

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is required to run the tests. Copy backend/.env.test.example to backend/.env.test and point it at a throwaway database.',
  );
}

export const databaseUrl = process.env.DATABASE_URL;
