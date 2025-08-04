import { env, isDevelopment } from './config';

// Validate environment variables on startup
console.log('🚀 Dev Log - Starting application...');
console.log(`Environment: ${env.NODE_ENV}`);
console.log(`Log Level: ${env.LOG_LEVEL}`);

if (isDevelopment()) {
  console.log('🔧 Development mode enabled');
  console.log('📋 Environment variables loaded successfully');
}

export const greet = (name: string): string => {
  return `Hello, ${name}!`;
};

// Export environment configuration for testing
export { env } from './config';
