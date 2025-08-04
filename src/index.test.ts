import { greet, env } from './index';

describe('greet function', () => {
  it('should return greeting message with name', () => {
    const result = greet('dev-log');
    expect(result).toBe('Hello, dev-log!');
  });

  it('should work with empty string', () => {
    const result = greet('');
    expect(result).toBe('Hello, !');
  });
});

describe('environment configuration', () => {
  it('should have required environment variables', () => {
    expect(env.NODE_ENV).toBeDefined();
    expect(env.LOG_LEVEL).toBeDefined();
  });

  it('should have valid NODE_ENV value', () => {
    expect(['development', 'test', 'production']).toContain(env.NODE_ENV);
  });

  it('should have valid LOG_LEVEL value', () => {
    expect(['debug', 'info', 'warn', 'error']).toContain(env.LOG_LEVEL);
  });
});
