import { Client } from '@notionhq/client';
import type {
  QueryDatabaseParameters,
  CreatePageParameters,
  SearchParameters,
  PageObjectResponse,
  DatabaseObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';
import PQueue from 'p-queue';
import { env } from '../config.js';

// 공식 Notion 속성 타입
export type PropertiesMap = CreatePageParameters['properties'];
export type SearchResult = PageObjectResponse | DatabaseObjectResponse;

// Create or update page parameters
export interface CreateOrUpdatePageParams {
  uniqueKey: string;
  properties: PropertiesMap;
  parent?: { database_id: string };
}

// Query database parameters (Notion 공식 타입 활용)
export type QueryDatabaseParams = Omit<
  QueryDatabaseParameters,
  'database_id'
> & {
  database_id?: string;
};

// Logger interface for dependency injection
export interface Logger {
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
  info(message: string, meta?: unknown): void;
  debug(message: string, meta?: unknown): void;
}

// Default console logger
const defaultLogger: Logger = {
  warn: (message, meta) => console.warn(message, meta),
  error: (message, meta) => console.error(message, meta),
  info: (message, meta) => console.info(message, meta),
  debug: (message, meta) => console.debug(message, meta),
};

// Configuration interface
export interface NotionConfig {
  token: string;
  databaseId: string;
  uniqueKeyProperty: string;
  timeout?: number;
  maxRetries?: number;
  baseDelay?: number;
}

const DEFAULT_UNIQUE_KEY_PROP = 'Unique Key';
const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_BASE_DELAY = 1000; // 1 second
const RATE_LIMIT_STATUS = 429;

export class NotionApiWrapper {
  private static instance: NotionApiWrapper;
  private readonly client: Client;
  private readonly logger: Logger;
  private readonly config: NotionConfig;
  private readonly queue: PQueue;

  private constructor(config?: Partial<NotionConfig>, logger?: Logger) {
    this.logger = logger || defaultLogger;
    this.config = this.parseEnvConfig(config);
    this.client = new Client({
      auth: this.config.token,
      timeoutMs: this.config.timeout || 60000,
    });
    this.queue = new PQueue({ concurrency: 3 });
  }

  private parseEnvConfig(override?: Partial<NotionConfig>): NotionConfig {
    return {
      token: override?.token || env.NOTION_TOKEN,
      databaseId: override?.databaseId || env.NOTION_DB_ID,
      uniqueKeyProperty:
        override?.uniqueKeyProperty ||
        env.NOTION_UNIQUE_KEY_PROP ||
        DEFAULT_UNIQUE_KEY_PROP,
      timeout: override?.timeout || 60000,
      maxRetries: override?.maxRetries || DEFAULT_MAX_RETRIES,
      baseDelay: override?.baseDelay || DEFAULT_BASE_DELAY,
    };
  }

  public static getInstance(
    config?: Partial<NotionConfig>,
    logger?: Logger
  ): NotionApiWrapper {
    if (!NotionApiWrapper.instance) {
      NotionApiWrapper.instance = new NotionApiWrapper(config, logger);
    }
    return NotionApiWrapper.instance;
  }

  public static resetForTests(): void {
    NotionApiWrapper.instance = undefined as unknown as NotionApiWrapper;
  }

  public getClient(): Client {
    return this.client;
  }

  public getConfig(): NotionConfig {
    return this.config;
  }

  /**
   * Exponential backoff retry function
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.maxRetries || DEFAULT_MAX_RETRIES
  ): Promise<T> {
    let lastError: Error;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: unknown) {
        const err = error as Error & { status?: number; code?: string };
        lastError = err;
        // Notion SDK: error.status === 429 or error.code === APIErrorCode.RateLimited
        if (
          (err.status === RATE_LIMIT_STATUS || err.code === 'rate_limited') &&
          attempt < maxRetries
        ) {
          const delay =
            (this.config.baseDelay || DEFAULT_BASE_DELAY) *
            Math.pow(2, attempt);
          this.logger.warn(
            `Rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/$${
              maxRetries + 1
            })`
          );
          await new Promise(resolve => globalThis.setTimeout(resolve, delay));
          continue;
        }
        break;
      }
    }
    throw lastError!;
  }

  /**
   * Create or update a page in Notion database (Upsert)
   */
  public async createOrUpdatePage(
    params: CreateOrUpdatePageParams
  ): Promise<PageObjectResponse> {
    return this.queue.add(async () =>
      this.withRetry(async () => {
        const { uniqueKey, properties, parent } = params;
        const uniqueKeyProp = this.config.uniqueKeyProperty;
        const existingPage = await this.findPageByUniqueKey(uniqueKey);
        let result: unknown;
        if (existingPage) {
          this.logger.info(
            `Updating existing page with unique key: ${uniqueKey}`
          );
          result = await this.client.pages.update({
            page_id: existingPage.id,
            properties,
          });
        } else {
          this.logger.info(`Creating new page with unique key: ${uniqueKey}`);
          result = await this.client.pages.create({
            parent: parent || { database_id: this.config.databaseId },
            properties: {
              ...properties,
              [uniqueKeyProp]: {
                title: [{ text: { content: uniqueKey } }],
              },
            },
          });
        }
        return result as PageObjectResponse;
      })
    ) as Promise<PageObjectResponse>;
  }

  /**
   * Query Notion database (databases.query)
   */
  public async queryDatabase(
    params: QueryDatabaseParams = {}
  ): Promise<PageObjectResponse[]> {
    return this.queue.add(async () =>
      this.withRetry(async () => {
        const response: unknown = await this.client.databases.query({
          database_id: params.database_id || this.config.databaseId,
          ...params,
        });
        return (response as { results: unknown[] })
          .results as PageObjectResponse[];
      })
    ) as Promise<PageObjectResponse[]>;
  }

  /**
   * Find a page by unique key property
   */
  private async findPageByUniqueKey(
    uniqueKey: string
  ): Promise<PageObjectResponse | null> {
    const uniqueKeyProp = this.config.uniqueKeyProperty;
    const results = await this.queryDatabase({
      filter: {
        property: uniqueKeyProp,
        title: {
          equals: uniqueKey,
        },
      },
      page_size: 1,
    });
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Retrieve a page by ID
   */
  public async getPage(pageId: string): Promise<PageObjectResponse> {
    return this.queue.add(async () =>
      this.withRetry(async () => {
        const result: unknown = await this.client.pages.retrieve({
          page_id: pageId,
        });
        return result as PageObjectResponse;
      })
    ) as Promise<PageObjectResponse>;
  }

  /**
   * Update a page by ID
   */
  public async updatePage(
    pageId: string,
    properties: PropertiesMap
  ): Promise<PageObjectResponse> {
    return this.queue.add(async () =>
      this.withRetry(async () => {
        const result: unknown = await this.client.pages.update({
          page_id: pageId,
          properties,
        });
        return result as PageObjectResponse;
      })
    ) as Promise<PageObjectResponse>;
  }

  /**
   * Archive (delete) a page by ID
   */
  public async archivePage(pageId: string): Promise<PageObjectResponse> {
    return this.queue.add(async () =>
      this.withRetry(async () => {
        const result: unknown = await this.client.pages.update({
          page_id: pageId,
          archived: true,
        });
        return result as PageObjectResponse;
      })
    ) as Promise<PageObjectResponse>;
  }

  /**
   * Get database information
   */
  public async getDatabase(): Promise<unknown> {
    return this.queue.add(async () =>
      this.withRetry(
        async () =>
          await this.client.databases.retrieve({
            database_id: this.config.databaseId,
          })
      )
    );
  }

  /**
   * Global search (client.search)
   */
  public async globalSearch(
    params: Omit<SearchParameters, 'auth'>
  ): Promise<SearchResult[]> {
    return this.queue.add(async () =>
      this.withRetry(async () => {
        const response: unknown = await this.client.search(params);
        return (response as { results: SearchResult[] }).results;
      })
    ) as Promise<SearchResult[]>;
  }
}

// Export convenience functions
export const getClient = () => NotionApiWrapper.getInstance().getClient();
export const createOrUpdatePage = (params: CreateOrUpdatePageParams) =>
  NotionApiWrapper.getInstance().createOrUpdatePage(params);
export const queryDatabase = (params: QueryDatabaseParams) =>
  NotionApiWrapper.getInstance().queryDatabase(params);
export const getPage = (pageId: string) =>
  NotionApiWrapper.getInstance().getPage(pageId);
export const updatePage = (pageId: string, properties: PropertiesMap) =>
  NotionApiWrapper.getInstance().updatePage(pageId, properties);
export const archivePage = (pageId: string) =>
  NotionApiWrapper.getInstance().archivePage(pageId);
export const getDatabase = () => NotionApiWrapper.getInstance().getDatabase();
export const globalSearch = (params: Omit<SearchParameters, 'auth'>) =>
  NotionApiWrapper.getInstance().globalSearch(params);
