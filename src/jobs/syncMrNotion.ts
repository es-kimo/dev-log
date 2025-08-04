import { listMergedMrsByAuthor } from '../lib/gitlab';
import { createOrUpdatePage, type PropertiesMap } from '../lib/notion';
import { z } from 'zod';
import dotenvFlow from 'dotenv-flow';

// Load environment variables
dotenvFlow.config();

// Environment variable schema
const envSchema = z.object({
  GITLAB_AUTHOR_USERNAME: z
    .string()
    .min(1, 'GITLAB_AUTHOR_USERNAME is required'),
  GITLAB_PROJECT_ID: z.string().optional(), // Optional: if not provided, searches all projects
  NOTION_DB_ID: z.string().min(1, 'NOTION_DB_ID is required'),
  NOTION_UNIQUE_KEY_PROP: z.string().optional(),
});

// Logger interface
interface Logger {
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
}

// Default console logger
const defaultLogger: Logger = {
  info: (message, meta) => console.info(message, meta),
  warn: (message, meta) => console.warn(message, meta),
  error: (message, meta) => console.error(message, meta),
};

// Configuration interface
interface SyncConfig {
  authorUsername: string;
  projectId?: string | number; // Optional: if not provided, searches all projects
  databaseId: string;
  uniqueKeyProperty: string;
  daysBack: number;
  maxRetries: number;
}

// Sync result interface
interface SyncResult {
  total: number;
  created: number;
  updated: number;
  failed: number;
  errors: Array<{ mrIid: number; error: string }>;
}

/**
 * Convert GitLab MR to Notion properties
 */
function mapMrToNotionProperties(
  mr: Awaited<ReturnType<typeof listMergedMrsByAuthor>>[number]
): PropertiesMap {
  const properties: PropertiesMap = {};

  // Title (MR title)
  properties['Title'] = {
    title: [
      {
        text: {
          content: mr.title,
        },
      },
    ],
  };

  // Author (MR author name)
  properties['Author'] = {
    rich_text: [
      {
        text: {
          content: mr.author.name,
        },
      },
    ],
  };

  // Merged Date
  if (mr.merged_at) {
    properties['Merged Date'] = {
      date: {
        start: mr.merged_at as string,
      },
    };
  }

  // URL (MR web URL)
  properties['URL'] = {
    url: mr.web_url as string,
  };

  // State
  properties['State'] = {
    select: {
      name: mr.state,
    },
  };

  // Source Branch
  properties['Source Branch'] = {
    rich_text: [
      {
        text: {
          content: mr.source_branch as string,
        },
      },
    ],
  };

  // Target Branch
  properties['Target Branch'] = {
    rich_text: [
      {
        text: {
          content: mr.target_branch as string,
        },
      },
    ],
  };

  // Created Date
  properties['Created Date'] = {
    date: {
      start: mr.created_at as string,
    },
  };

  // Updated Date
  properties['Updated Date'] = {
    date: {
      start: mr.updated_at as string,
    },
  };

  // Labels (if available)
  if (mr.labels && Array.isArray(mr.labels)) {
    properties['Labels'] = {
      multi_select: mr.labels.map(label => ({
        name:
          typeof label === 'string' ? label : (label as { name: string }).name,
      })),
    };
  }

  return properties;
}

/**
 * Sync GitLab MRs to Notion Database
 */
export async function syncMrToNotion(
  config?: Partial<SyncConfig>,
  logger: Logger = defaultLogger
): Promise<SyncResult> {
  const startTime = Date.now();

  // Parse environment variables
  const env = envSchema.parse(process.env);

  // Merge config with defaults
  const finalConfig: SyncConfig = {
    authorUsername: config?.authorUsername || env.GITLAB_AUTHOR_USERNAME,
    projectId: config?.projectId || env.GITLAB_PROJECT_ID,
    databaseId: config?.databaseId || env.NOTION_DB_ID,
    uniqueKeyProperty:
      config?.uniqueKeyProperty || env.NOTION_UNIQUE_KEY_PROP || 'MR IID',
    daysBack: config?.daysBack || 7,
    maxRetries: config?.maxRetries || 3,
  };

  logger.info('Starting MR sync to Notion', {
    authorUsername: finalConfig.authorUsername,
    projectId: finalConfig.projectId || 'all projects',
    databaseId: finalConfig.databaseId,
    daysBack: finalConfig.daysBack,
  });

  const result: SyncResult = {
    total: 0,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Calculate date range (7 days back from now)
    const now = new Date();
    const since = new Date(
      now.getTime() - finalConfig.daysBack * 24 * 60 * 60 * 1000
    );

    logger.info('Fetching merged MRs from GitLab', {
      since: since.toISOString(),
      until: now.toISOString(),
    });

    // Fetch merged MRs from GitLab by author
    const mrs = await listMergedMrsByAuthor({
      author: finalConfig.authorUsername,
      projectId: finalConfig.projectId,
      since,
      until: now,
      per_page: 100,
    });

    result.total = mrs.length;
    logger.info(`Found ${mrs.length} merged MRs to sync`);

    // Process each MR
    for (const mr of mrs) {
      try {
        const uniqueKey = `MR-${mr.iid}`;
        const properties = mapMrToNotionProperties(mr);

        // Create or update page in Notion
        await createOrUpdatePage({
          uniqueKey,
          properties,
          parent: { database_id: finalConfig.databaseId },
        });

        // Determine if it was created or updated (we can't easily tell from the API response)
        // For now, we'll assume it was created if it's a recent MR
        const mrDate = new Date(
          (mr.merged_at as string) || (mr.updated_at as string)
        );
        const isRecent = mrDate > since;

        if (isRecent) {
          result.created++;
        } else {
          result.updated++;
        }

        logger.info(`Synced MR ${mr.iid}: ${mr.title}`, {
          mrIid: mr.iid,
          title: mr.title,
          author: mr.author.name,
        });
      } catch (error) {
        result.failed++;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        result.errors.push({
          mrIid: mr.iid,
          error: errorMessage,
        });

        logger.error(`Failed to sync MR ${mr.iid}`, {
          mrIid: mr.iid,
          title: mr.title,
          error: errorMessage,
        });
      }
    }

    const duration = Date.now() - startTime;
    logger.info('MR sync completed', {
      total: result.total,
      created: result.created,
      updated: result.updated,
      failed: result.failed,
      duration: `${duration}ms`,
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('MR sync failed', {
      error: errorMessage,
      duration: Date.now() - startTime,
    });
    throw error;
  }
}

/**
 * Main function for CLI execution
 */
export async function main(): Promise<void> {
  try {
    const result = await syncMrToNotion();
    console.log(`✅ Synced ${result.total} MR(s) to Notion`);
    console.log(
      `   Created: ${result.created}, Updated: ${result.updated}, Failed: ${result.failed}`
    );

    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach(({ mrIid, error }) => {
        console.log(`   MR ${mrIid}: ${error}`);
      });
    }

    process.exit(result.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error(
      '❌ Sync failed:',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

// Run main function if this file is executed directly
if (process.argv[1] && process.argv[1].endsWith('syncMrNotion.ts')) {
  main();
}
