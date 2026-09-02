import dotenv from 'dotenv';

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  awsRegion: process.env.AWS_REGION ?? 'ap-south-1',
  s3ImageBucket: process.env.S3_IMAGE_BUCKET ?? '',
  redisUrl: process.env.REDIS_URL ?? '',
  dashboardCacheSeconds: Number(process.env.DASHBOARD_CACHE_SECONDS ?? 0),
  company: {
    name: process.env.COMPANY_NAME ?? 'Shree Distributors',
    address: process.env.COMPANY_ADDRESS ?? 'Plot 42, MIDC Bhosari, Pune 411026',
    gst: process.env.COMPANY_GST ?? '27AABCS1429B1ZX',
  },
};
