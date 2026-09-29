import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env
dotenv.config();

const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default(isTest ? 'test' : 'development'),
  MONGODB_URI: isTest
    ? z.string().default('mongodb://127.0.0.1:27017/nexora_test')
    : z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: isTest
    ? z.string().default('test_jwt_secret_key_at_least_32_characters_long')
    : z.string().min(16, 'JWT_SECRET must be at least 16 characters long'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  COOKIE_SAMESITE: z.enum(['lax', 'none', 'strict']).default('lax')
});

let parsedEnv;

try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid Environment Variables Configuration:');
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
  } else {
    console.error('❌ Failed to parse environment variables:', error);
  }
  process.exit(1);
}

export const env = parsedEnv;

