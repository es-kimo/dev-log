import { config } from 'dotenv-flow';
import { z } from 'zod';

// Load environment variables from .env files
config();

// Environment variable schema with comprehensive validation
const EnvSchema = z.object({
  // GitLab Configuration
  GITLAB_HOST: z.string().url('GITLAB_HOST must be a valid URL'),
  GITLAB_TOKEN: z.string().min(1, 'GITLAB_TOKEN is required'),
  GITLAB_AUTHOR_USERNAME: z
    .string()
    .min(1, 'GITLAB_AUTHOR_USERNAME is required'),
  GITLAB_PROJECT_ID: z.string().optional(), // Optional: if not provided, searches all projects

  // Notion Configuration
  NOTION_TOKEN: z.string().min(1, 'NOTION_TOKEN is required'),
  NOTION_DB_ID: z.string().min(1, 'NOTION_DB_ID is required'),
  NOTION_UNIQUE_KEY_PROP: z.string().optional(), // Optional, defaults to "MR IID"

  // Application Configuration
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

// Parse and validate environment variables
export const env = EnvSchema.parse(process.env);

// Export types for use in other modules
export type EnvConfig = z.infer<typeof EnvSchema>;

// Helper function to check if running in development
export const isDevelopment = () => env.NODE_ENV === 'development';

// Helper function to check if running in production
export const isProduction = () => env.NODE_ENV === 'production';

// Helper function to check if running in test
export const isTest = () => env.NODE_ENV === 'test';
