// Import jest types
import { jest } from '@jest/globals';

// Mock environment variables first
const mockEnv = {
  GITLAB_HOST: 'https://gitlab.example.com',
  GITLAB_TOKEN: 'test-token',
};

// Set environment variables before importing the module
process.env.GITLAB_HOST = mockEnv.GITLAB_HOST;
process.env.GITLAB_TOKEN = mockEnv.GITLAB_TOKEN;

// Mock @gitbeaker/rest with explicit constructor mock
jest.mock('@gitbeaker/rest', () => ({
  Gitlab: jest.fn(),
}));

// Mock dotenv-flow
jest.mock('dotenv-flow', () => ({
  config: jest.fn(),
}));

// Import after setting environment variables
import { Gitlab } from '@gitbeaker/rest';
import {
  GitLabApiWrapper,
  ListMergedMrsParams,
  ListMergedMrsByAuthorParams,
} from './gitlab';

describe('GitLab API Wrapper', () => {
  let mockGitlabInstance: any;

  beforeEach(() => {
    // Reset modules and singleton instance
    jest.resetModules();
    GitLabApiWrapper.resetForTests();

    // Mock process.env
    process.env.GITLAB_HOST = mockEnv.GITLAB_HOST;
    process.env.GITLAB_TOKEN = mockEnv.GITLAB_TOKEN;

    // Create mock GitLab instance
    mockGitlabInstance = {
      MergeRequests: {
        all: jest.fn(),
        show: jest.fn(),
      },
      Projects: {
        all: jest.fn(),
        show: jest.fn(),
      },
    };

    // Mock Gitlab constructor
    (Gitlab as jest.MockedClass<typeof Gitlab>).mockImplementation(
      () => mockGitlabInstance
    );
  });

  afterEach(() => {
    // Clean up environment variables and mocks
    delete process.env.GITLAB_HOST;
    delete process.env.GITLAB_TOKEN;
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance when getInstance is called multiple times', () => {
      const instance1 = GitLabApiWrapper.getInstance();
      const instance2 = GitLabApiWrapper.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should create only one Gitlab client instance', () => {
      // Clear previous calls from other tests
      (Gitlab as jest.MockedClass<typeof Gitlab>).mockClear();

      const instance = GitLabApiWrapper.getInstance();
      const client1 = instance.getClient();
      const client2 = instance.getClient();

      expect(client1).toBe(client2);
      expect(Gitlab).toHaveBeenCalledTimes(1);
    });

    it('should reset singleton instance when resetForTests is called', () => {
      const instance1 = GitLabApiWrapper.getInstance();
      GitLabApiWrapper.resetForTests();
      const instance2 = GitLabApiWrapper.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('GitLab Constructor Configuration', () => {
    it('should pass environment variables to Gitlab constructor', () => {
      (Gitlab as jest.MockedClass<typeof Gitlab>).mockClear();

      GitLabApiWrapper.getInstance();

      expect(Gitlab).toHaveBeenCalledWith({
        host: mockEnv.GITLAB_HOST,
        token: mockEnv.GITLAB_TOKEN,
        requesterOptions: {
          timeout: 30000,
        },
      });
    });

    it('should pass custom configuration to Gitlab constructor', () => {
      (Gitlab as jest.MockedClass<typeof Gitlab>).mockClear();

      const customConfig = {
        host: 'https://custom.gitlab.com',
        token: 'custom-token',
        timeout: 5000,
      };

      GitLabApiWrapper.getInstance(customConfig);

      expect(Gitlab).toHaveBeenCalledWith({
        host: customConfig.host,
        token: customConfig.token,
        requesterOptions: {
          timeout: customConfig.timeout,
        },
      });
    });

    it('should prioritize custom config over environment variables', () => {
      (Gitlab as jest.MockedClass<typeof Gitlab>).mockClear();

      const customConfig = {
        host: 'https://custom.gitlab.com',
        token: 'custom-token',
      };

      GitLabApiWrapper.getInstance(customConfig);

      expect(Gitlab).toHaveBeenCalledWith({
        host: customConfig.host,
        token: customConfig.token,
      });
    });
  });

  describe('Environment Variables', () => {
    it('should use environment variables from centralized config', () => {
      const instance = GitLabApiWrapper.getInstance();
      const client = instance.getClient();

      // The instance should be created successfully with environment variables
      expect(client).toBeDefined();
    });
  });

  describe('Logger Integration', () => {
    it('should use custom logger when provided', async () => {
      const mockLogger = {
        warn: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
      };

      const instance = GitLabApiWrapper.getInstance(undefined, mockLogger);

      // Trigger an error to test logger
      const error = new Error('API Error');
      mockGitlabInstance.MergeRequests.all.mockRejectedValue(error);

      await expect(
        instance.listMergedMrs({ projectId: 'test' })
      ).rejects.toThrow('API Error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to list merged merge requests:',
        expect.objectContaining({
          projectId: 'test',
          error: 'API Error',
        })
      );
    });

    it('should use default console logger when no custom logger provided', async () => {
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const instance = GitLabApiWrapper.getInstance();

      const error = new Error('API Error');
      mockGitlabInstance.MergeRequests.all.mockRejectedValue(error);

      await expect(
        instance.listMergedMrs({ projectId: 'test' })
      ).rejects.toThrow('API Error');

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('listMergedMrs', () => {
    const mockMergeRequests = [
      {
        id: 1,
        iid: 1,
        title: 'Test MR 1',
        description: 'Test description 1',
        state: 'merged',
        merged_at: '2024-01-01T10:00:00Z',
        closed_at: null,
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        target_branch: 'main',
        source_branch: 'feature/test-1',
        author: {
          id: 1,
          name: 'Test User',
          username: 'testuser',
          state: 'active',
          avatar_url: 'https://gitlab.example.com/avatar.jpg',
          web_url: 'https://gitlab.example.com/testuser',
        },
        web_url: 'https://gitlab.example.com/test/project/-/merge_requests/1',
      },
      {
        id: 2,
        iid: 2,
        title: 'Test MR 2',
        description: 'Test description 2',
        state: 'merged',
        merged_at: '2024-01-02T10:00:00Z',
        closed_at: null,
        created_at: '2024-01-02T09:00:00Z',
        updated_at: '2024-01-02T10:00:00Z',
        target_branch: 'main',
        source_branch: 'feature/test-2',
        author: {
          id: 2,
          name: 'Test User 2',
          username: 'testuser2',
          state: 'active',
          avatar_url: 'https://gitlab.example.com/avatar2.jpg',
          web_url: 'https://gitlab.example.com/testuser2',
        },
        web_url: 'https://gitlab.example.com/test/project/-/merge_requests/2',
      },
    ];

    it('should return merged merge requests', async () => {
      mockGitlabInstance.MergeRequests.all.mockResolvedValue(mockMergeRequests);

      const params: ListMergedMrsParams = {
        projectId: 'test/project',
        since: '2024-01-01T00:00:00Z',
        until: '2024-01-31T23:59:59Z',
        per_page: 50,
      };

      const instance = GitLabApiWrapper.getInstance();
      const result = await instance.listMergedMrs(params);

      expect(result).toEqual(mockMergeRequests);
      expect(mockGitlabInstance.MergeRequests.all).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'test/project',
          state: 'merged',
          created_after: '2024-01-01T00:00:00Z',
          created_before: '2024-01-31T23:59:59Z',
          perPage: 50,
          orderBy: 'created_at',
          sort: 'desc',
        })
      );
    });

    it('should accept Date objects for since and until', async () => {
      mockGitlabInstance.MergeRequests.all.mockResolvedValue(mockMergeRequests);

      const sinceDate = new Date('2024-01-01T00:00:00Z');
      const untilDate = new Date('2024-01-31T23:59:59Z');

      const params: ListMergedMrsParams = {
        projectId: 'test/project',
        since: sinceDate,
        until: untilDate,
        per_page: 50,
      };

      const instance = GitLabApiWrapper.getInstance();
      await instance.listMergedMrs(params);

      expect(mockGitlabInstance.MergeRequests.all).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'test/project',
          state: 'merged',
          created_after: sinceDate.toISOString(),
          created_before: untilDate.toISOString(),
          perPage: 50,
          orderBy: 'created_at',
          sort: 'desc',
        })
      );
    });

    it('should use default per_page when not provided', async () => {
      mockGitlabInstance.MergeRequests.all.mockResolvedValue(mockMergeRequests);

      const params: ListMergedMrsParams = {
        projectId: 'test/project',
      };

      const instance = GitLabApiWrapper.getInstance();
      await instance.listMergedMrs(params);

      expect(mockGitlabInstance.MergeRequests.all).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'test/project',
          state: 'merged',
          created_after: undefined,
          created_before: undefined,
          perPage: 100,
          orderBy: 'created_at',
          sort: 'desc',
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error');
      mockGitlabInstance.MergeRequests.all.mockRejectedValue(error);

      const params: ListMergedMrsParams = {
        projectId: 'test/project',
      };

      const instance = GitLabApiWrapper.getInstance();
      await expect(instance.listMergedMrs(params)).rejects.toThrow('API Error');
    });

    it('should preserve original error message from GitLab API', async () => {
      const originalError = new Error('E_TIMEOUT');
      mockGitlabInstance.MergeRequests.all.mockRejectedValue(originalError);

      const params: ListMergedMrsParams = {
        projectId: 'test/project',
      };

      const instance = GitLabApiWrapper.getInstance();
      await expect(instance.listMergedMrs(params)).rejects.toThrow('E_TIMEOUT');
    });

    it('should validate ISO 8601 date format', async () => {
      const params: ListMergedMrsParams = {
        projectId: 'test/project',
        since: 'invalid-date',
      };

      const instance = GitLabApiWrapper.getInstance();
      await expect(instance.listMergedMrs(params)).rejects.toThrow(
        'Invalid ISO 8601 date format for "since" parameter'
      );
    });

    it('should validate date range', async () => {
      const params: ListMergedMrsParams = {
        projectId: 'test/project',
        since: '2024-01-31T00:00:00Z',
        until: '2024-01-01T00:00:00Z', // until is before since
      };

      const instance = GitLabApiWrapper.getInstance();
      await expect(instance.listMergedMrs(params)).rejects.toThrow(
        '"since" must be earlier than "until"'
      );
    });
  });

  describe('listMergedMrsByAuthor', () => {
    const mockMergeRequests = [
      {
        id: 1,
        iid: 1,
        title: 'Test MR 1',
        description: 'Test description 1',
        state: 'merged',
        merged_at: '2024-01-01T10:00:00Z',
        closed_at: null,
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        target_branch: 'main',
        source_branch: 'feature/test-1',
        author: {
          id: 1,
          name: 'Test User',
          username: 'testuser',
          state: 'active',
          avatar_url: 'https://gitlab.example.com/avatar.jpg',
          web_url: 'https://gitlab.example.com/testuser',
        },
        web_url: 'https://gitlab.example.com/test/project/-/merge_requests/1',
      },
      {
        id: 2,
        iid: 2,
        title: 'Test MR 2',
        description: 'Test description 2',
        state: 'merged',
        merged_at: '2024-01-02T10:00:00Z',
        closed_at: null,
        created_at: '2024-01-02T09:00:00Z',
        updated_at: '2024-01-02T10:00:00Z',
        target_branch: 'main',
        source_branch: 'feature/test-2',
        author: {
          id: 2,
          name: 'Test User 2',
          username: 'testuser2',
          state: 'active',
          avatar_url: 'https://gitlab.example.com/avatar2.jpg',
          web_url: 'https://gitlab.example.com/testuser2',
        },
        web_url: 'https://gitlab.example.com/test/project/-/merge_requests/2',
      },
    ];

    it('should return merged merge requests by author across all projects', async () => {
      mockGitlabInstance.MergeRequests.all.mockResolvedValue(mockMergeRequests);

      const params: ListMergedMrsByAuthorParams = {
        author: 'testuser',
        since: '2024-01-01T00:00:00Z',
        until: '2024-01-31T23:59:59Z',
        per_page: 50,
      };

      const instance = GitLabApiWrapper.getInstance();
      const result = await instance.listMergedMrsByAuthor(params);

      expect(result).toEqual(mockMergeRequests);
      expect(mockGitlabInstance.MergeRequests.all).toHaveBeenCalledWith(
        expect.objectContaining({
          author_username: 'testuser',
          state: 'merged',
          updated_after: '2024-01-01T00:00:00Z',
          updated_before: '2024-01-31T23:59:59Z',
          perPage: 50,
          orderBy: 'updated_at',
          sort: 'desc',
          scope: 'all',
        })
      );
    });

    it('should return merged merge requests by author for specific project', async () => {
      mockGitlabInstance.MergeRequests.all.mockResolvedValue(mockMergeRequests);

      const params: ListMergedMrsByAuthorParams = {
        author: 'testuser',
        projectId: 'test/project',
        since: '2024-01-01T00:00:00Z',
        until: '2024-01-31T23:59:59Z',
        per_page: 50,
      };

      const instance = GitLabApiWrapper.getInstance();
      const result = await instance.listMergedMrsByAuthor(params);

      expect(result).toEqual(mockMergeRequests);
      expect(mockGitlabInstance.MergeRequests.all).toHaveBeenCalledWith(
        expect.objectContaining({
          author_username: 'testuser',
          projectId: 'test/project',
          state: 'merged',
          updated_after: '2024-01-01T00:00:00Z',
          updated_before: '2024-01-31T23:59:59Z',
          perPage: 50,
          orderBy: 'updated_at',
          sort: 'desc',
          scope: 'all',
        })
      );
    });

    it('should accept Date objects for since and until', async () => {
      mockGitlabInstance.MergeRequests.all.mockResolvedValue(mockMergeRequests);

      const sinceDate = new Date('2024-01-01T00:00:00Z');
      const untilDate = new Date('2024-01-31T23:59:59Z');

      const params: ListMergedMrsByAuthorParams = {
        author: 'testuser',
        since: sinceDate,
        until: untilDate,
        per_page: 50,
      };

      const instance = GitLabApiWrapper.getInstance();
      await instance.listMergedMrsByAuthor(params);

      expect(mockGitlabInstance.MergeRequests.all).toHaveBeenCalledWith(
        expect.objectContaining({
          author_username: 'testuser',
          state: 'merged',
          updated_after: sinceDate.toISOString(),
          updated_before: untilDate.toISOString(),
          perPage: 50,
          orderBy: 'updated_at',
          sort: 'desc',
          scope: 'all',
        })
      );
    });

    it('should use default per_page when not provided', async () => {
      mockGitlabInstance.MergeRequests.all.mockResolvedValue(mockMergeRequests);

      const params: ListMergedMrsByAuthorParams = {
        author: 'testuser',
      };

      const instance = GitLabApiWrapper.getInstance();
      await instance.listMergedMrsByAuthor(params);

      expect(mockGitlabInstance.MergeRequests.all).toHaveBeenCalledWith(
        expect.objectContaining({
          author_username: 'testuser',
          state: 'merged',
          updated_after: undefined,
          updated_before: undefined,
          perPage: 100,
          orderBy: 'updated_at',
          sort: 'desc',
          scope: 'all',
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error');
      mockGitlabInstance.MergeRequests.all.mockRejectedValue(error);

      const params: ListMergedMrsByAuthorParams = {
        author: 'testuser',
      };

      const instance = GitLabApiWrapper.getInstance();
      await expect(instance.listMergedMrsByAuthor(params)).rejects.toThrow(
        'API Error'
      );
    });

    it('should validate ISO 8601 date format', async () => {
      const params: ListMergedMrsByAuthorParams = {
        author: 'testuser',
        since: 'invalid-date',
      };

      const instance = GitLabApiWrapper.getInstance();
      await expect(instance.listMergedMrsByAuthor(params)).rejects.toThrow(
        'Invalid ISO 8601 date format for "since" parameter'
      );
    });

    it('should validate date range', async () => {
      const params: ListMergedMrsByAuthorParams = {
        author: 'testuser',
        since: '2024-01-31T00:00:00Z',
        until: '2024-01-01T00:00:00Z', // until is before since
      };

      const instance = GitLabApiWrapper.getInstance();
      await expect(instance.listMergedMrsByAuthor(params)).rejects.toThrow(
        '"since" must be earlier than "until"'
      );
    });
  });

  describe('getMergeRequest', () => {
    const mockMR = {
      id: 1,
      iid: 1,
      title: 'Test MR',
      description: 'Test description',
      state: 'merged',
      merged_at: '2024-01-01T10:00:00Z',
      closed_at: null,
      created_at: '2024-01-01T09:00:00Z',
      updated_at: '2024-01-01T10:00:00Z',
      target_branch: 'main',
      source_branch: 'feature/test',
      author: {
        id: 1,
        name: 'Test User',
        username: 'testuser',
        state: 'active',
        avatar_url: 'https://gitlab.example.com/avatar.jpg',
        web_url: 'https://gitlab.example.com/testuser',
      },
      web_url: 'https://gitlab.example.com/test/project/-/merge_requests/1',
    };

    it('should return a specific merge request', async () => {
      mockGitlabInstance.MergeRequests.show.mockResolvedValue(mockMR);

      const instance = GitLabApiWrapper.getInstance();
      const result = await instance.getMergeRequest('test/project', 1);

      expect(result).toEqual(mockMR);
      expect(mockGitlabInstance.MergeRequests.show).toHaveBeenCalledWith(
        'test/project',
        1
      );
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('MR not found');
      mockGitlabInstance.MergeRequests.show.mockRejectedValue(error);

      const instance = GitLabApiWrapper.getInstance();
      await expect(
        instance.getMergeRequest('test/project', 999)
      ).rejects.toThrow('MR not found');
    });
  });

  describe('listProjects', () => {
    const mockProjects = [
      { id: 1, name: 'Project 1', path: 'project-1' },
      { id: 2, name: 'Project 2', path: 'project-2' },
    ];

    it('should return projects with default parameters', async () => {
      mockGitlabInstance.Projects.all.mockResolvedValue(mockProjects);

      const instance = GitLabApiWrapper.getInstance();
      const result = await instance.listProjects();

      expect(result).toEqual(mockProjects);
      expect(mockGitlabInstance.Projects.all).toHaveBeenCalledWith({
        membership: true,
        search: undefined,
        perPage: 100,
        orderBy: 'created_at',
        sort: 'desc',
      });
    });

    it('should return projects with custom parameters', async () => {
      mockGitlabInstance.Projects.all.mockResolvedValue(mockProjects);

      const instance = GitLabApiWrapper.getInstance();
      const result = await instance.listProjects({
        membership: false,
        search: 'test',
        per_page: 50,
      });

      expect(result).toEqual(mockProjects);
      expect(mockGitlabInstance.Projects.all).toHaveBeenCalledWith({
        membership: false,
        search: 'test',
        perPage: 50,
        orderBy: 'created_at',
        sort: 'desc',
      });
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('Projects not found');
      mockGitlabInstance.Projects.all.mockRejectedValue(error);

      const instance = GitLabApiWrapper.getInstance();
      await expect(instance.listProjects()).rejects.toThrow(
        'Projects not found'
      );
    });
  });

  describe('getProject', () => {
    const mockProject = {
      id: 1,
      name: 'Test Project',
      path: 'test-project',
      description: 'Test project description',
    };

    it('should return project information', async () => {
      mockGitlabInstance.Projects.show.mockResolvedValue(mockProject);

      const instance = GitLabApiWrapper.getInstance();
      const result = await instance.getProject('test/project');

      expect(result).toEqual(mockProject);
      expect(mockGitlabInstance.Projects.show).toHaveBeenCalledWith(
        'test/project'
      );
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('Project not found');
      mockGitlabInstance.Projects.show.mockRejectedValue(error);

      const instance = GitLabApiWrapper.getInstance();
      await expect(instance.getProject('nonexistent/project')).rejects.toThrow(
        'Project not found'
      );
    });
  });

  describe('listMergedMrsIterator', () => {
    const mockMergeRequests = [
      {
        id: 1,
        iid: 1,
        title: 'Test MR 1',
        description: 'Test description 1',
        state: 'merged',
        merged_at: '2024-01-01T10:00:00Z',
        closed_at: null,
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        target_branch: 'main',
        source_branch: 'feature/test-1',
        author: {
          id: 1,
          name: 'Test User',
          username: 'testuser',
          state: 'active',
          avatar_url: 'https://gitlab.example.com/avatar.jpg',
          web_url: 'https://gitlab.example.com/testuser',
        },
        web_url: 'https://gitlab.example.com/test/project/-/merge_requests/1',
      },
    ];

    it('should return exactly one page when last page has fewer results than per_page', async () => {
      // Mock first page with data, second page empty
      mockGitlabInstance.MergeRequests.all
        .mockResolvedValueOnce(mockMergeRequests)
        .mockResolvedValueOnce([]);

      const instance = GitLabApiWrapper.getInstance();
      const pages: any[] = [];

      for await (const page of instance.listMergedMrsIterator('test/project', {
        since: new Date('2024-01-01'),
        per_page: 50,
      })) {
        pages.push(page);
      }

      expect(pages).toHaveLength(1);
      expect(pages[0]).toEqual(mockMergeRequests);

      expect(mockGitlabInstance.MergeRequests.all).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'test/project',
          state: 'merged',
          created_after: '2024-01-01T00:00:00.000Z',
          perPage: 50,
          page: 1,
          orderBy: 'created_at',
          sort: 'desc',
        })
      );
    });

    it('should handle until parameter correctly', async () => {
      mockGitlabInstance.MergeRequests.all
        .mockResolvedValueOnce(mockMergeRequests)
        .mockResolvedValueOnce([]);

      const instance = GitLabApiWrapper.getInstance();
      const pages: any[] = [];

      for await (const page of instance.listMergedMrsIterator('test/project', {
        since: new Date('2024-01-01'),
        until: new Date('2024-01-31'),
        per_page: 50,
      })) {
        pages.push(page);
      }

      expect(mockGitlabInstance.MergeRequests.all).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'test/project',
          state: 'merged',
          created_after: '2024-01-01T00:00:00.000Z',
          created_before: '2024-01-31T00:00:00.000Z',
          perPage: 50,
          page: 1,
          orderBy: 'created_at',
          sort: 'desc',
        })
      );
    });

    it('should handle multiple pages correctly', async () => {
      const page1 = mockMergeRequests;
      const page2 = [{ ...mockMergeRequests[0], id: 2, iid: 2 }];

      mockGitlabInstance.MergeRequests.all
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2)
        .mockResolvedValueOnce([]);

      const instance = GitLabApiWrapper.getInstance();
      const pages: any[] = [];

      for await (const page of instance.listMergedMrsIterator('test/project', {
        per_page: 1, // Force multiple pages
      })) {
        pages.push(page);
      }

      expect(pages).toHaveLength(2);
      expect(pages[0]).toEqual(page1);
      expect(pages[1]).toEqual(page2);
      expect(mockGitlabInstance.MergeRequests.all).toHaveBeenCalledTimes(3);
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error');
      mockGitlabInstance.MergeRequests.all.mockRejectedValue(error);

      const instance = GitLabApiWrapper.getInstance();
      const iterator = instance.listMergedMrsIterator('test/project');

      await expect(iterator.next()).rejects.toThrow('API Error');
    });
  });

  describe('Configuration Injection', () => {
    it('should accept custom configuration', () => {
      const customConfig = {
        host: 'https://custom.gitlab.com',
        token: 'custom-token',
        timeout: 5000,
      };

      const customLogger = {
        warn: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
      };

      const instance = GitLabApiWrapper.getInstance(customConfig, customLogger);
      expect(instance).toBeDefined();
    });
  });
});
