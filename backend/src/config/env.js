/**
 * src/config/env.js
 * Validates all required environment variables at startup.
 * The server refuses to start if critical variables are missing.
 */
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Robust .env discovery: Check backend/.env (source of truth), current working directory, and parent
const candidateEnvPaths = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend/.env'),
];

for (const envPath of candidateEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

const { z } = require('zod');

// Helper to sanitize quoted or spaced env strings
const cleanEnv = (val) => {
  if (val === undefined || val === null) return undefined;
  let str = String(val).trim();
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1).trim();
  }
  return str.length > 0 ? str : undefined;
};

const schema = z.object({
  // Server
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Supabase
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  SUPABASE_JWT_SECRET: z.string().min(1, 'SUPABASE_JWT_SECRET is required'),

  // CORS
  FRONTEND_STUDENT_URL: z.string().default('http://localhost:5173'),
  FRONTEND_OFFICER_URL: z.string().default('http://localhost:5174'),
  FRONTEND_ADMIN_URL: z.string().default('http://localhost:5175'),

  // Email (optional — channels disabled if not set)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().default('587'),
  SMTP_SECURE: z.string().default('false'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('Maatram Foundation <noreply@maatram-demo.example>'),

  // SMS/WhatsApp (optional)
  SMS_PROVIDER: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),

  // Storage
  STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_MB: z.string().default('5'),

  // App
  APP_TIMEZONE: z.string().default('Asia/Kolkata'),
  API_BASE_URL: z.string().default('http://localhost:5000'),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX: z.string().default('200'),
  AUTH_RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  AUTH_RATE_LIMIT_MAX: z.string().default('20'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
  LOG_TO_FILE: z.string().default('false'),
});

const result = schema.safeParse(process.env);

if (!result.success) {
  const missing = result.error.errors.map((e) => `  • ${e.path.join('.')}: ${e.message}`).join('\n');
  console.error('\n❌ Missing or invalid environment variables:\n' + missing);
  console.error('\n👉 Copy .env.example to .env and fill in the required values.\n');
  process.exit(1);
}

const env = result.data;

module.exports = {
  port: parseInt(env.PORT, 10),
  nodeEnv: env.NODE_ENV,
  isDev: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',
  isProd: env.NODE_ENV === 'production',

  database: {
    url: env.DATABASE_URL,
  },

  supabase: {
    url: env.SUPABASE_URL,
    anonKey: env.SUPABASE_ANON_KEY,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    jwtSecret: env.SUPABASE_JWT_SECRET,
  },

  cors: {
    allowedOrigins: [
      env.FRONTEND_STUDENT_URL,
      env.FRONTEND_OFFICER_URL,
      env.FRONTEND_ADMIN_URL,
    ].filter(Boolean),
  },

  email: {
    host: cleanEnv(env.SMTP_HOST),
    port: parseInt(cleanEnv(env.SMTP_PORT) || '587', 10),
    secure: cleanEnv(env.SMTP_SECURE) === 'true',
    user: cleanEnv(env.SMTP_USER),
    pass: cleanEnv(env.SMTP_PASS),
    from: cleanEnv(env.EMAIL_FROM) || 'Maatram Foundation <noreply@maatram-demo.example>',
    enabled: Boolean(
      cleanEnv(env.SMTP_HOST) &&
      cleanEnv(env.SMTP_USER) &&
      cleanEnv(env.SMTP_PASS),
    ),
  },

  sms: {
    provider: env.SMS_PROVIDER || null,
    twilio: {
      accountSid: env.TWILIO_ACCOUNT_SID,
      authToken: env.TWILIO_AUTH_TOKEN,
      fromNumber: env.TWILIO_FROM_NUMBER,
    },
    enabled: !!(env.SMS_PROVIDER && env.TWILIO_ACCOUNT_SID),
  },

  storage: {
    provider: env.STORAGE_PROVIDER,
    uploadDir: env.UPLOAD_DIR,
    maxFileSizeMb: parseInt(env.MAX_FILE_SIZE_MB, 10),
  },

  app: {
    timezone: env.APP_TIMEZONE,
    baseUrl: env.API_BASE_URL,
  },

  rateLimit: {
    windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
    max: parseInt(env.RATE_LIMIT_MAX, 10),
    auth: {
      windowMs: parseInt(env.AUTH_RATE_LIMIT_WINDOW_MS, 10),
      max: parseInt(env.AUTH_RATE_LIMIT_MAX, 10),
    },
  },

  log: {
    level: env.LOG_LEVEL,
    toFile: env.LOG_TO_FILE === 'true',
  },
};

