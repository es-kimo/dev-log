import { jest } from '@jest/globals';
import { syncMrToNotion } from './syncMrNotion';
import { listMergedMrs } from '../lib/gitlab';
import { createOrUpdatePage } from '../lib/notion';
import type { MergeRequest } from '../lib/gitlab';

// Mock environment variables
process.env.GITLAB_HOST = 'https://gitlab.example.com';
process.env.GITLAB_TOKEN = 'test-token';
process.env.GITLAB_PROJECT_ID = '12345';
process.env.NOTION_TOKEN = 'test-notion-token';
process.env.NOTION_DB_ID = 'test-db-id';

// Mock dependencies
jest.mock('../lib/gitlab', () => ({
  listMergedMrs: jest.fn(),
}));

jest.mock('../lib/notion', () => ({
  createOrUpdatePage: jest.fn(),
}));

const mockListMergedMrs = listMergedMrs as jest.MockedFunction<
  typeof listMergedMrs
>;
const mockCreateOrUpdatePage = createOrUpdatePage as jest.MockedFunction<
  typeof createOrUpdatePage
>;

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Sample MR data
const now = new Date();
const sampleMr: MergeRequest = {
  id: 123,
  iid: 456,
  title: 'Test MR Title',
  description: 'Test MR Description',
  state: 'merged',
  merged_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // now + 1day
  closed_at: null,
  created_at: '2024-01-10T09:00:00Z',
  updated_at: '2024-01-15T10:30:00Z',
  target_branch: 'main',
  source_branch: 'feature/test',
  author: {
    id: 789,
    name: 'John Doe',
    username: 'johndoe',
  },
  web_url: 'https://gitlab.com/test/project/-/merge_requests/456',
};

describe('syncMrToNotion', () => {
  beforeEach(() => {
    process.env.GITLAB_HOST = 'https://gitlab.example.com';
    process.env.GITLAB_TOKEN = 'test-token';
    process.env.GITLAB_PROJECT_ID = '12345';
    process.env.NOTION_TOKEN = 'test-notion-token';
    process.env.NOTION_DB_ID = 'test-db-id';
    jest.clearAllMocks();
  });

  describe('configuration', () => {
    it('should use environment variables for configuration', async () => {
      mockListMergedMrs.mockResolvedValue([]);
      await syncMrToNotion(undefined, mockLogger);
      expect(mockListMergedMrs).toHaveBeenCalledWith({
        projectId: '12345',
        since: expect.any(Date),
        until: expect.any(Date),
        per_page: 100,
      });
    });

    it('should use provided config over environment variables', async () => {
      mockListMergedMrs.mockResolvedValue([]);
      await syncMrToNotion(
        {
          projectId: 'custom-project-id',
          databaseId: 'custom-db-id',
          daysBack: 14,
        },
        mockLogger
      );
      expect(mockListMergedMrs).toHaveBeenCalledWith({
        projectId: 'custom-project-id',
        since: expect.any(Date),
        until: expect.any(Date),
        per_page: 100,
      });
    });
  });

  describe('MR processing', () => {
    it('should sync MRs successfully', async () => {
      mockListMergedMrs.mockResolvedValue([sampleMr]);
      mockCreateOrUpdatePage.mockResolvedValue({} as any);
      const result = await syncMrToNotion(undefined, mockLogger);
      expect(result.total).toBe(1);
      expect(result.created).toBe(1);
      expect(result.updated).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockCreateOrUpdatePage).toHaveBeenCalledWith({
        uniqueKey: 'MR-456',
        properties: expect.objectContaining({
          Title: expect.objectContaining({
            title: [{ text: { content: 'Test MR Title' } }],
          }),
          Author: expect.objectContaining({
            rich_text: [{ text: { content: 'John Doe' } }],
          }),
          URL: expect.objectContaining({
            url: 'https://gitlab.com/test/project/-/merge_requests/456',
          }),
        }),
        parent: { database_id: 'test-db-id' },
      });
    });

    it('should handle multiple MRs', async () => {
      const mr1 = { ...sampleMr, iid: 1, title: 'MR 1' };
      const mr2 = { ...sampleMr, iid: 2, title: 'MR 2' };
      mockListMergedMrs.mockResolvedValue([mr1, mr2]);
      mockCreateOrUpdatePage.mockResolvedValue({} as any);
      const result = await syncMrToNotion(undefined, mockLogger);
      expect(result.total).toBe(2);
      expect(result.created).toBe(2);
      expect(result.failed).toBe(0);
      expect(mockCreateOrUpdatePage).toHaveBeenCalledTimes(2);
      expect(mockCreateOrUpdatePage).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ uniqueKey: 'MR-1' })
      );
      expect(mockCreateOrUpdatePage).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ uniqueKey: 'MR-2' })
      );
    });

    it('should handle API errors gracefully', async () => {
      mockListMergedMrs.mockResolvedValue([sampleMr]);
      mockCreateOrUpdatePage.mockRejectedValue(new Error('API Error'));
      const result = await syncMrToNotion(undefined, mockLogger);
      expect(result.total).toBe(1);
      expect(result.created).toBe(0);
      expect(result.updated).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        mrIid: 456,
        error: 'API Error',
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to sync MR 456',
        expect.objectContaining({
          mrIid: 456,
          title: 'Test MR Title',
          error: 'API Error',
        })
      );
    });

    it('should handle GitLab API errors', async () => {
      mockListMergedMrs.mockRejectedValue(new Error('GitLab API Error'));
      await expect(syncMrToNotion(undefined, mockLogger)).rejects.toThrow(
        'GitLab API Error'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'MR sync failed',
        expect.objectContaining({
          error: 'GitLab API Error',
        })
      );
    });
  });

  describe('property mapping', () => {
    it('should map MR properties correctly', async () => {
      const mrWithLabels = {
        ...sampleMr,
        labels: ['bug', 'enhancement'],
      };
      mockListMergedMrs.mockResolvedValue([mrWithLabels]);
      mockCreateOrUpdatePage.mockResolvedValue({} as any);
      await syncMrToNotion(undefined, mockLogger);
      const callArgs = mockCreateOrUpdatePage.mock.calls[0][0];
      expect(callArgs.properties).toMatchObject({
        Title: {
          title: [{ text: { content: 'Test MR Title' } }],
        },
        Author: {
          rich_text: [{ text: { content: 'John Doe' } }],
        },
        'Merged Date': {
          date: { start: mrWithLabels.merged_at },
        },
        URL: {
          url: 'https://gitlab.com/test/project/-/merge_requests/456',
        },
        State: {
          select: { name: 'merged' },
        },
        'Source Branch': {
          rich_text: [{ text: { content: 'feature/test' } }],
        },
        'Target Branch': {
          rich_text: [{ text: { content: 'main' } }],
        },
        'Created Date': {
          date: { start: '2024-01-10T09:00:00Z' },
        },
        'Updated Date': {
          date: { start: '2024-01-15T10:30:00Z' },
        },
        Labels: {
          multi_select: [{ name: 'bug' }, { name: 'enhancement' }],
        },
      });
    });

    it('should handle MR without merged_at date', async () => {
      const mrWithoutMergedAt = {
        ...sampleMr,
        merged_at: null,
      };
      mockListMergedMrs.mockResolvedValue([mrWithoutMergedAt]);
      mockCreateOrUpdatePage.mockResolvedValue({} as any);
      await syncMrToNotion(undefined, mockLogger);
      const callArgs = mockCreateOrUpdatePage.mock.calls[0][0];
      expect(callArgs.properties).not.toHaveProperty('Merged Date');
    });

    it('should handle MR without labels', async () => {
      const mrWithoutLabels = {
        ...sampleMr,
        labels: undefined,
      };
      mockListMergedMrs.mockResolvedValue([mrWithoutLabels]);
      mockCreateOrUpdatePage.mockResolvedValue({} as any);
      await syncMrToNotion(undefined, mockLogger);
      const callArgs = mockCreateOrUpdatePage.mock.calls[0][0];
      expect(callArgs.properties).not.toHaveProperty('Labels');
    });
  });

  describe('performance and timing', () => {
    it('should log execution time', async () => {
      mockListMergedMrs.mockResolvedValue([]);
      await syncMrToNotion(undefined, mockLogger);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'MR sync completed',
        expect.objectContaining({
          total: 0,
          created: 0,
          updated: 0,
          failed: 0,
          duration: expect.stringMatching(/^\d+ms$/),
        })
      );
    });
  });
});
