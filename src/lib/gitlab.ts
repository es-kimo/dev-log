import { Gitlab } from '@gitbeaker/rest';
import { env } from '../config.js';

// Cached ISO string validator for performance
const isoString = (str: string) => {
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
  return isoRegex.test(str);
};

// Helper function to convert Date to ISO string
const toIso = (d?: string | Date): string | undefined => {
  if (!d) return undefined;
  return d instanceof Date ? d.toISOString() : d;
};

// Helper function to validate ISO string
const validateIsoString = (dateStr?: string, paramName?: string): void => {
  if (dateStr && !isoString(dateStr)) {
    throw new Error(
      `Invalid ISO 8601 date format for "${paramName}" parameter`
    );
  }
};

// Helper function to validate date range
const validateDateRange = (since?: string, until?: string): void => {
  if (since && until && new Date(since) > new Date(until)) {
    throw new Error('"since" must be earlier than "until"');
  }
};

// Configuration interface
export interface GitLabConfig {
  host: string;
  token: string;
  timeout?: number;
}

// List merged MRs parameters with proper date handling
export interface ListMergedMrsParams {
  projectId: string | number;
  since?: string | Date; // Accept both ISO string and Date
  until?: string | Date;
  per_page?: number; // Use snake_case for GitLab API compatibility
}

// List merged MRs by author parameters
export interface ListMergedMrsByAuthorParams {
  author: string; // author_username
  since?: string | Date;
  until?: string | Date;
  projectId?: string | number; // Optional: if not provided, searches all projects
  per_page?: number;
}

// Logger interface for dependency injection
export interface Logger {
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
  info(message: string, meta?: unknown): void;
}

// Default console logger
const defaultLogger: Logger = {
  warn: (message, meta) => console.warn(message, meta),
  error: (message, meta) => console.error(message, meta),
  info: (message, meta) => console.info(message, meta),
};

// GitLab API wrapper class
export class GitLabApiWrapper {
  private static instance: GitLabApiWrapper;
  private readonly client: InstanceType<typeof Gitlab>;
  private readonly logger: Logger;

  private constructor(config?: GitLabConfig, logger?: Logger) {
    this.logger = logger || defaultLogger;

    // Use provided config or parse from environment
    const finalConfig = config || this.parseEnvConfig();

    this.client = new Gitlab({
      host: finalConfig.host,
      token: finalConfig.token,
      ...(finalConfig.timeout && {
        requesterOptions: {
          timeout: finalConfig.timeout,
        },
      }),
    });
  }

  private parseEnvConfig(): GitLabConfig {
    return {
      host: env.GITLAB_HOST,
      token: env.GITLAB_TOKEN,
      timeout: 30000, // 30 seconds default timeout
    };
  }

  public static getInstance(
    config?: GitLabConfig,
    logger?: Logger
  ): GitLabApiWrapper {
    if (!GitLabApiWrapper.instance) {
      GitLabApiWrapper.instance = new GitLabApiWrapper(config, logger);
    }
    return GitLabApiWrapper.instance;
  }

  // Reset instance for testing
  public static resetForTests(): void {
    GitLabApiWrapper.instance = undefined as unknown as GitLabApiWrapper;
  }

  /**
   * Get GitLab client instance
   */
  public getClient(): InstanceType<typeof Gitlab> {
    return this.client;
  }

  /**
   * List merged merge requests for a project
   */
  public async listMergedMrs(params: ListMergedMrsParams) {
    const { projectId, since, until, per_page = 100 } = params;

    // Convert dates to ISO strings if needed
    const created_after = toIso(since);
    const created_before = toIso(until);

    // Validate ISO strings and date range
    validateIsoString(created_after, 'since');
    validateIsoString(created_before, 'until');
    validateDateRange(created_after, created_before);

    try {
      // Use object parameter for GitLab API compatibility
      const mrs = await this.client.MergeRequests.all({
        projectId,
        state: 'merged',
        created_after,
        created_before,
        perPage: per_page, // Use camelCase for @gitbeaker/rest
        orderBy: 'created_at',
        sort: 'desc',
      });

      return mrs;
    } catch (error) {
      this.logger.error('Failed to list merged merge requests:', {
        projectId,
        since: created_after,
        until: created_before,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * List merged merge requests by author across all projects or specific project
   */
  public async listMergedMrsByAuthor(params: ListMergedMrsByAuthorParams) {
    const { author, since, until, projectId, per_page = 100 } = params;

    // Convert dates to ISO strings if needed
    const updated_after = toIso(since);
    const updated_before = toIso(until);

    // Validate ISO strings and date range
    validateIsoString(updated_after, 'since');
    validateIsoString(updated_before, 'until');
    validateDateRange(updated_after, updated_before);

    try {
      // Build API parameters
      const apiParams: Record<string, unknown> = {
        author_username: author,
        state: 'merged',
        updated_after,
        updated_before,
        perPage: per_page, // Use camelCase for @gitbeaker/rest
        orderBy: 'updated_at',
        sort: 'desc',
        scope: 'all', // Search across all accessible projects
      };

      // Add projectId if specified
      if (projectId) {
        apiParams.projectId = projectId;
      }

      // Use object parameter for GitLab API compatibility
      const mrs = await this.client.MergeRequests.all(apiParams);

      return mrs;
    } catch (error) {
      this.logger.error('Failed to list merged merge requests by author:', {
        author,
        projectId,
        since: updated_after,
        until: updated_before,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * List merged merge requests with pagination iterator
   * Uses GitLab's paginate method for true pagination
   */
  public async *listMergedMrsIterator(
    projectId: string | number,
    opts?: {
      since?: Date;
      until?: Date;
      per_page?: number;
    }
  ) {
    const per_page = opts?.per_page ?? 100;
    const created_after = opts?.since?.toISOString();
    const created_before = opts?.until?.toISOString();

    // Validate date parameters
    validateIsoString(created_after, 'since');
    validateIsoString(created_before, 'until');
    validateDateRange(created_after, created_before);

    try {
      // Manual pagination since paginate method may not be available
      let page = 1;

      while (true) {
        const mrs = await this.client.MergeRequests.all({
          projectId,
          state: 'merged',
          created_after,
          created_before,
          perPage: per_page, // Use camelCase for @gitbeaker/rest
          page,
          orderBy: 'created_at',
          sort: 'desc',
        });

        const pageResults = mrs;
        if (!pageResults.length) break;

        yield pageResults;

        if (pageResults.length < per_page) break;
        page += 1;
      }
    } catch (error) {
      this.logger.error('Failed to paginate merged merge requests:', {
        projectId,
        since: created_after,
        until: created_before,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get a specific merge request by ID
   */
  public async getMergeRequest(projectId: string | number, mrIid: number) {
    try {
      const mr = await this.client.MergeRequests.show(projectId, mrIid);
      return mr;
    } catch (error) {
      this.logger.error('Failed to get merge request:', {
        projectId,
        mrIid,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * List projects accessible to the current user
   */
  public async listProjects(params?: {
    membership?: boolean;
    search?: string;
    per_page?: number;
  }) {
    const { membership = true, search, per_page = 100 } = params || {};

    try {
      const projects = await this.client.Projects.all({
        membership,
        search,
        perPage: per_page, // Use camelCase for @gitbeaker/rest
        orderBy: 'created_at',
        sort: 'desc',
      });

      return projects;
    } catch (error) {
      this.logger.error('Failed to list projects:', {
        membership,
        search,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get project information
   */
  public async getProject(projectId: string | number) {
    try {
      const project = await this.client.Projects.show(projectId);
      return project;
    } catch (error) {
      this.logger.error('Failed to get project:', {
        projectId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

// Create singleton instance
const gitLabApi = GitLabApiWrapper.getInstance();

// Export singleton instance and convenience functions for tree-shaking optimization
export { gitLabApi };
export const getClient = () => gitLabApi.getClient();
export const listMergedMrs = (params: ListMergedMrsParams) =>
  gitLabApi.listMergedMrs(params);
export const listMergedMrsByAuthor = (params: ListMergedMrsByAuthorParams) =>
  gitLabApi.listMergedMrsByAuthor(params);
export const getMergeRequest = (projectId: string | number, mrIid: number) =>
  gitLabApi.getMergeRequest(projectId, mrIid);
export const listProjects = (
  params?: Parameters<typeof gitLabApi.listProjects>[0]
) => gitLabApi.listProjects(params);
export const getProject = (projectId: string | number) =>
  gitLabApi.getProject(projectId);

// Export types
export type { Gitlab };
