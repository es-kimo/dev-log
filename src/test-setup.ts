// Test environment setup
// This file is loaded before each test file

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'info';

// GitLab test configuration
process.env.GITLAB_HOST = 'https://gitlab.com';
process.env.GITLAB_TOKEN = 'test-gitlab-token';
process.env.GITLAB_AUTHOR_USERNAME = 'testuser';
process.env.GITLAB_PROJECT_ID = '12345';

// Notion test configuration
process.env.NOTION_TOKEN = 'test-notion-token';
process.env.NOTION_DB_ID = 'test-db-id';
process.env.NOTION_UNIQUE_KEY_PROP = 'MR IID';
