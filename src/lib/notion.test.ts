import { jest } from '@jest/globals';
import { Client } from '@notionhq/client';
import { Logger, NotionApiWrapper, NotionConfig } from './notion';

// Mock @notionhq/client
jest.mock('@notionhq/client', () => ({
  Client: jest.fn(),
}));

// Mock dotenv-flow
jest.mock('dotenv-flow', () => ({
  config: jest.fn(),
}));

// Mock p-queue
jest.mock('p-queue', () => {
  return jest.fn().mockImplementation(() => ({
    add: jest.fn((fn: () => Promise<unknown>) => fn()),
  }));
});

describe('NotionApiWrapper', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockClient: any;
  let mockLogger: jest.Mocked<Logger>;
  let notionWrapper: NotionApiWrapper;

  const mockConfig: NotionConfig = {
    token: 'test-token',
    databaseId: 'test-db-id',
    uniqueKeyProperty: 'Unique Key',
    timeout: 60000,
    maxRetries: 3,
    baseDelay: 100,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    NotionApiWrapper.resetForTests();

    // Setup mock client
    mockClient = {
      pages: {
        create: jest.fn(),
        update: jest.fn(),
        retrieve: jest.fn(),
      },
      databases: {
        query: jest.fn(),
        retrieve: jest.fn(),
      },
    };

    (Client as unknown as jest.Mock).mockImplementation(() => mockClient);

    // Setup mock logger
    mockLogger = {
      warn: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    };

    // Mock process.env
    process.env.NOTION_TOKEN = 'test-token';
    process.env.NOTION_DB_ID = 'test-db-id';
  });

  afterEach(() => {
    delete process.env.NOTION_TOKEN;
    delete process.env.NOTION_DB_ID;
  });

  describe('Singleton Pattern', () => {
    it('should create only one instance', () => {
      const instance1 = NotionApiWrapper.getInstance();
      const instance2 = NotionApiWrapper.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should reset instance for tests', () => {
      const instance1 = NotionApiWrapper.getInstance();
      NotionApiWrapper.resetForTests();
      const instance2 = NotionApiWrapper.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Configuration', () => {
    it('should parse environment variables correctly', () => {
      notionWrapper = NotionApiWrapper.getInstance();
      const config = notionWrapper.getConfig();

      expect(config.token).toBe('test-token');
      expect(config.databaseId).toBe('test-db-id');
      expect(config.maxRetries).toBe(5); // default value
      expect(config.baseDelay).toBe(1000); // default value
    });

    it('should use provided config when passed', () => {
      notionWrapper = NotionApiWrapper.getInstance(mockConfig, mockLogger);
      const config = notionWrapper.getConfig();

      expect(config.token).toBe('test-token');
      expect(config.databaseId).toBe('test-db-id');
      expect(config.maxRetries).toBe(3);
      expect(config.baseDelay).toBe(100);
    });

    it('should throw error when required env vars are missing', () => {
      delete process.env.NOTION_TOKEN;
      delete process.env.NOTION_DB_ID;

      expect(() => {
        NotionApiWrapper.getInstance();
      }).toThrow('Invalid input: expected string, received undefined');
    });
  });

  describe('createOrUpdatePage', () => {
    beforeEach(() => {
      notionWrapper = NotionApiWrapper.getInstance(mockConfig, mockLogger);
    });

    it('should create new page when page does not exist', async () => {
      const mockPage = { id: 'new-page-id', properties: {} };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockSearchResults: any[] = [];

      mockClient.databases.query.mockResolvedValue({
        results: mockSearchResults,
      });
      mockClient.pages.create.mockResolvedValue(mockPage);

      const result = await notionWrapper.createOrUpdatePage({
        uniqueKey: 'test-key',
        properties: {
          Title: { title: [{ text: { content: 'Test Title' } }] },
        },
      });

      expect(mockClient.databases.query).toHaveBeenCalledWith({
        database_id: 'test-db-id',
        filter: {
          property: 'Unique Key',
          title: { equals: 'test-key' },
        },
        page_size: 1,
      });

      expect(mockClient.pages.create).toHaveBeenCalledWith({
        parent: { database_id: 'test-db-id' },
        properties: {
          Title: { title: [{ text: { content: 'Test Title' } }] },
          'Unique Key': { title: [{ text: { content: 'test-key' } }] },
        },
      });

      expect(result).toBe(mockPage);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Creating new page with unique key: test-key'
      );
    });

    it('should update existing page when page exists', async () => {
      const mockExistingPage = { id: 'existing-page-id', properties: {} };
      const mockUpdatedPage = { id: 'existing-page-id', properties: {} };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockSearchResults: any[] = [mockExistingPage];

      mockClient.databases.query.mockResolvedValue({
        results: mockSearchResults,
      });
      mockClient.pages.update.mockResolvedValue(mockUpdatedPage);

      const result = await notionWrapper.createOrUpdatePage({
        uniqueKey: 'test-key',
        properties: {
          Title: { title: [{ text: { content: 'Updated Title' } }] },
        },
      });

      expect(mockClient.pages.update).toHaveBeenCalledWith({
        page_id: 'existing-page-id',
        properties: {
          Title: { title: [{ text: { content: 'Updated Title' } }] },
        },
      });

      expect(result).toBe(mockUpdatedPage);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Updating existing page with unique key: test-key'
      );
    });
  });

  describe('queryDatabase', () => {
    beforeEach(() => {
      notionWrapper = NotionApiWrapper.getInstance(mockConfig, mockLogger);
    });

    it('should query database with filter', async () => {
      const mockResults = [{ id: 'page-1' }, { id: 'page-2' }];
      mockClient.databases.query.mockResolvedValue({ results: mockResults });

      const result = await notionWrapper.queryDatabase({
        filter: {
          property: 'Status',
          title: { equals: 'Active' },
        },
        page_size: 50,
      });

      expect(mockClient.databases.query).toHaveBeenCalledWith({
        database_id: 'test-db-id',
        filter: {
          property: 'Status',
          title: { equals: 'Active' },
        },
        page_size: 50,
      });

      expect(result).toBe(mockResults);
    });

    it('should query database without filter', async () => {
      const mockResults = [{ id: 'page-1' }];
      mockClient.databases.query.mockResolvedValue({ results: mockResults });

      const result = await notionWrapper.queryDatabase({});

      expect(mockClient.databases.query).toHaveBeenCalledWith({
        database_id: 'test-db-id',
      });

      expect(result).toBe(mockResults);
    });
  });

  describe('getPage', () => {
    beforeEach(() => {
      notionWrapper = NotionApiWrapper.getInstance(mockConfig, mockLogger);
    });

    it('should retrieve page by ID', async () => {
      const mockPage = { id: 'page-id', properties: {} };
      mockClient.pages.retrieve.mockResolvedValue(mockPage);

      const result = await notionWrapper.getPage('page-id');

      expect(mockClient.pages.retrieve).toHaveBeenCalledWith({
        page_id: 'page-id',
      });

      expect(result).toBe(mockPage);
    });
  });

  describe('updatePage', () => {
    beforeEach(() => {
      notionWrapper = NotionApiWrapper.getInstance(mockConfig, mockLogger);
    });

    it('should update page properties', async () => {
      const mockUpdatedPage = { id: 'page-id', properties: {} };
      mockClient.pages.update.mockResolvedValue(mockUpdatedPage);

      const properties = {
        Title: { title: [{ text: { content: 'Updated Title' } }] },
      };

      const result = await notionWrapper.updatePage('page-id', properties);

      expect(mockClient.pages.update).toHaveBeenCalledWith({
        page_id: 'page-id',
        properties,
      });

      expect(result).toBe(mockUpdatedPage);
    });
  });

  describe('archivePage', () => {
    beforeEach(() => {
      notionWrapper = NotionApiWrapper.getInstance(mockConfig, mockLogger);
    });

    it('should archive page', async () => {
      const mockArchivedPage = { id: 'page-id', archived: true };
      mockClient.pages.update.mockResolvedValue(mockArchivedPage);

      const result = await notionWrapper.archivePage('page-id');

      expect(mockClient.pages.update).toHaveBeenCalledWith({
        page_id: 'page-id',
        archived: true,
      });

      expect(result).toBe(mockArchivedPage);
    });
  });

  describe('getDatabase', () => {
    beforeEach(() => {
      notionWrapper = NotionApiWrapper.getInstance(mockConfig, mockLogger);
    });

    it('should retrieve database information', async () => {
      const mockDatabase = { id: 'db-id', title: 'Test Database' };
      mockClient.databases.retrieve.mockResolvedValue(mockDatabase);

      const result = await notionWrapper.getDatabase();

      expect(mockClient.databases.retrieve).toHaveBeenCalledWith({
        database_id: 'test-db-id',
      });

      expect(result).toBe(mockDatabase);
    });
  });

  describe('Rate Limiting and Retry', () => {
    beforeEach(() => {
      notionWrapper = NotionApiWrapper.getInstance(mockConfig, mockLogger);
    });

    it('should retry on rate limit error and eventually succeed', async () => {
      const mockPage = { id: 'page-id', properties: {} };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rateLimitError = new Error('Rate limited') as any;
      rateLimitError.status = 429;

      // Mock to fail twice with rate limit, then succeed
      mockClient.pages.retrieve
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce(mockPage);

      const result = await notionWrapper.getPage('page-id');

      expect(mockClient.pages.retrieve).toHaveBeenCalledTimes(3);
      expect(mockLogger.warn).toHaveBeenCalledTimes(2);
      expect(result).toBe(mockPage);
    });

    it('should throw error after max retries', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rateLimitError = new Error('Rate limited') as any;
      rateLimitError.status = 429;

      // Mock to always fail with rate limit
      mockClient.pages.retrieve.mockRejectedValue(rateLimitError);

      await expect(notionWrapper.getPage('page-id')).rejects.toThrow(
        'Rate limited'
      );
      expect(mockClient.pages.retrieve).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
      expect(mockLogger.warn).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-rate-limit errors', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const otherError = new Error('Other error') as any;
      otherError.status = 500;

      mockClient.pages.retrieve.mockRejectedValue(otherError);

      await expect(notionWrapper.getPage('page-id')).rejects.toThrow(
        'Other error'
      );
      expect(mockClient.pages.retrieve).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      notionWrapper = NotionApiWrapper.getInstance(mockConfig, mockLogger);
    });

    it('should handle API errors gracefully', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const apiError = new Error('API Error') as any;
      apiError.status = 400;
      mockClient.pages.retrieve.mockRejectedValue(apiError);

      await expect(notionWrapper.getPage('page-id')).rejects.toThrow(
        'API Error'
      );
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockClient.pages.retrieve.mockRejectedValue(networkError);

      await expect(notionWrapper.getPage('page-id')).rejects.toThrow(
        'Network Error'
      );
    });
  });
});
