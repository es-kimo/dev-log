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

// Mock @gitbeaker/node
jest.mock('@gitbeaker/node');

// Mock dotenv-flow
jest.mock('dotenv-flow', () => ({
  config: jest.fn(),
}));

// Import after setting environment variables
import {
  GitLabApiWrapper,
  MergeRequest,
  ListMergedMrsParams,
  ListMergedMrsByAuthorParams,
} from './gitlab';
import { Gitlab } from '@gitbeaker/node';

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
    // Clean up environment variables
    delete process.env.GITLAB_HOST;
    delete process.env.GITLAB_TOKEN;
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
  });

  describe('Environment Variables', () => {
    it('should throw error when GITLAB_HOST is missing', () => {
      delete process.env.GITLAB_HOST;

      expect(() => {
        GitLabApiWrapper.getInstance();
      }).toThrow('Invalid input: expected string, received undefined');
    });

    it('should throw error when GITLAB_TOKEN is missing', () => {
      delete process.env.GITLAB_TOKEN;

      expect(() => {
        GitLabApiWrapper.getInstance();
      }).toThrow('Invalid input: expected string, received undefined');
    });

    it('should throw error when GITLAB_HOST is not a valid URL', () => {
      process.env.GITLAB_HOST = 'invalid-url';

      expect(() => {
        GitLabApiWrapper.getInstance();
      }).toThrow('GITLAB_HOST must be a valid URL');
    });
  });

  describe('listMergedMrs', () => {
    const mockMergeRequests: MergeRequest[] = [
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
          per_page: 50,
          order_by: 'created_at',
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
          per_page: 50,
          order_by: 'created_at',
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
          per_page: 100,
          order_by: 'created_at',
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
    const mockMergeRequests: MergeRequest[] = [
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
          per_page: 50,
          order_by: 'updated_at',
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
          per_page: 50,
          order_by: 'updated_at',
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
          per_page: 50,
          order_by: 'updated_at',
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
          per_page: 100,
          order_by: 'updated_at',
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
    const mockMR: MergeRequest = {
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
        per_page: 100,
        order_by: 'created_at',
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
        per_page: 50,
        order_by: 'created_at',
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
    const mockMergeRequests: MergeRequest[] = [
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
        },
        web_url: 'https://gitlab.example.com/test/project/-/merge_requests/1',
      },
    ];

    it('should paginate through merge requests', async () => {
      // Mock first page with data, second page empty
      mockGitlabInstance.MergeRequests.all
        .mockResolvedValueOnce(mockMergeRequests)
        .mockResolvedValueOnce([]);

      const instance = GitLabApiWrapper.getInstance();
      const pages: MergeRequest[][] = [];

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
          per_page: 50,
          page: 1,
          order_by: 'created_at',
          sort: 'desc',
        })
      );
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
