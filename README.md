# dev-log

Dev log sync automation project built with TypeScript and Node.js 18. Features GitLab API integration using `@gitbeaker/rest` for optimal performance and type safety.

## 🚀 Quick Start

### Prerequisites

- Node.js 18 or higher
- Yarn package manager
- GitLab Personal Access Token
- Notion Integration Token
- Docker (optional, for containerized deployment)

### Installation & Setup

1. **Clone and install dependencies**

   ```bash
   git clone <repository-url>
   cd dev-log
   yarn install
   ```

2. **Configure environment variables**

   ```bash
   # Copy the example environment file
   cp .env.example .env

   # Edit .env with your actual values
   nano .env  # or use your preferred editor
   ```

3. **Run the application**

   ```bash
   # Development mode
   yarn dev

   # Or build and run
   yarn build
   yarn start
   ```

### Development

```bash
# Run in development mode
yarn dev

# Build the project
yarn build

# Start the built application
yarn start

# Run tests
yarn test

# Run tests with coverage
yarn test:coverage

# Run linting
yarn lint

# Fix linting issues automatically
yarn lint:fix

# Format code with Prettier
yarn format

# Check code formatting
yarn format:check
```

## 🐳 Docker

### Quick Start

```bash
# Local development
yarn dev          # ts-node-dev + dotenv-flow

# Production testing
docker compose up # Same image, production environment
```

### Run with Docker

The project is containerized with multi-stage Dockerfile for optimal production deployment.

#### Using Pre-built Images (Recommended)

```bash
# Run specific job (e.g., syncMr)
docker run --rm \
  -e JOB=syncMr \
  -e GITLAB_HOST=https://gitlab.com \
  -e GITLAB_TOKEN=your-token \
  -e GITLAB_AUTHOR_USERNAME=your-username \
  -e NOTION_TOKEN=your-notion-token \
  -e NOTION_DB_ID=your-database-id \
  ghcr.io/your-org/dev-log:latest

# Or use environment file
docker run --rm --env-file .env -e JOB=syncMr ghcr.io/your-org/dev-log:latest
```

#### Local Build & Run

```bash
# Build the Docker image
docker build -t dev-log .

# Run with specific job
docker run --rm --env-file .env -e JOB=syncMr dev-log

# List available jobs (will show error with job list)
docker run --rm dev-log
```

### Docker Compose

Three profiles are available for different use cases:

```bash
# Use pre-built GHCR image (production)
docker compose --profile prod up dev-log-prod

# Build and run locally
docker compose --profile local up dev-log-local

# Run with custom job
JOB=collectComments docker compose --profile custom up dev-log-custom
```

**Example docker-compose usage:**

```bash
# Set required environment variables in .env file
echo "GITLAB_HOST=https://gitlab.com" >> .env
echo "GITLAB_TOKEN=your-token" >> .env
echo "GITLAB_AUTHOR_USERNAME=your-username" >> .env
echo "NOTION_TOKEN=your-notion-token" >> .env
echo "NOTION_DB_ID=your-database-id" >> .env

# Run syncMr job with local build
docker compose --profile local up dev-log-local

# Run different job
JOB=collectComments docker compose --profile custom up dev-log-custom
```

### Available Jobs

The container entry point supports multiple jobs via the `JOB` environment variable:

- `syncMr` - Sync GitLab merge requests to Notion (default)
- `collectComments` - Collect and process MR comments (coming soon)

**Job Examples:**

```bash
# Available jobs (shows help)
docker run --rm ghcr.io/your-org/dev-log:latest

# Sync merge requests
docker run --rm --env-file .env -e JOB=syncMr ghcr.io/your-org/dev-log:latest

# Custom job (when implemented)
docker run --rm --env-file .env -e JOB=collectComments ghcr.io/your-org/dev-log:latest
```

### Image Information

- **Registry**: GitHub Container Registry (GHCR)
- **Image**: `ghcr.io/<owner>/dev-log`
- **Tags**: `latest`, `main-<sha>`, version tags
- **Size**: ≤ 100 MB (optimized Alpine-based image)
- **Platforms**: `linux/amd64`, `linux/arm64`

## 🔧 Environment Variables

This project uses `dotenv-flow` for environment variable management, supporting multiple environment files:

- `.env` - Default environment variables
- `.env.local` - Local overrides (gitignored)
- `.env.development` - Development-specific variables
- `.env.test` - Test-specific variables
- `.env.production` - Production-specific variables

### Required Environment Variables

| Variable                 | Description                  | Example                                |
| ------------------------ | ---------------------------- | -------------------------------------- |
| `GITLAB_HOST`            | GitLab instance URL          | `https://gitlab.com`                   |
| `GITLAB_TOKEN`           | GitLab Personal Access Token | `glpat-xxxxxxxxxxxxxxxx`               |
| `GITLAB_AUTHOR_USERNAME` | GitLab username for MR sync  | `your-username`                        |
| `NOTION_TOKEN`           | Notion Integration Token     | `secret_xxxxxxxxxxxxxxxx`              |
| `NOTION_DB_ID`           | Notion Database ID           | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |

### Optional Environment Variables

| Variable                 | Description                    | Default               |
| ------------------------ | ------------------------------ | --------------------- |
| `GITLAB_PROJECT_ID`      | Specific GitLab project ID     | Searches all projects |
| `NOTION_UNIQUE_KEY_PROP` | Notion property for unique MRs | `MR IID`              |
| `NODE_ENV`               | Node.js environment            | `development`         |
| `LOG_LEVEL`              | Logging level                  | `info`                |

### Environment File Setup

```bash
# Copy the example file
cp .env.example .env

# Edit with your actual values
nano .env
```

**Important**: Never commit your actual `.env` file to version control. The `.env.example` file serves as a template.

## 🔄 CI/CD Pipeline

This project includes a comprehensive CI/CD pipeline with the following stages:

### CI Workflow (`.github/workflows/ci.yml`)

- **Lint**: ESLint and Prettier checks
- **Test**: Jest tests with coverage
- **Build**: TypeScript compilation
- **Docker Build**: Container image building (main branch only)

### Docker Workflow (`.github/workflows/docker.yml`)

- **Trigger**: Push to main branch or version tags
- **Build**: Multi-platform Docker image (linux/amd64, linux/arm64)
- **Push**: Automatically pushes to GitHub Container Registry (GHCR)
- **Tags**: Latest + SHA-based tags

### Image Registry

- **Registry**: `ghcr.io/<OWNER>/dev-log`
- **Tags**: `latest`, `main-<sha>`, `v*` (for version tags)

## 📁 Project Structure

```
dev-log/
├── src/                    # Source code
│   ├── index.ts           # Main entry point
│   ├── config.ts          # Environment configuration & validation
│   ├── lib/               # API wrappers
│   │   ├── gitlab.ts      # GitLab API wrapper
│   │   └── notion.ts      # Notion API wrapper
│   ├── jobs/              # Scheduled jobs
│   │   ├── index.ts       # Job registry
│   │   └── syncMrNotion.ts # MR sync job
│   └── *.test.ts          # Test files
├── dist/                  # Compiled output (generated)
├── .env.example           # Environment variables template
├── .github/workflows/     # CI/CD workflows
│   ├── ci.yml            # CI pipeline
│   ├── docker.yml        # Docker build & push
│   └── schedule.yml      # Scheduled jobs
├── Dockerfile            # Multi-stage Docker build
├── docker-compose.yml    # Local development setup
├── .dockerignore         # Docker build exclusions
├── tsconfig.json         # TypeScript configuration
├── jest.config.js        # Jest configuration
└── package.json          # Project dependencies and scripts
```

## 🛠️ Available Scripts

- `yarn build` - Compile TypeScript to JavaScript
- `yarn start` - Run the compiled application
- `yarn dev` - Run the application in development mode with ts-node
- `yarn test` - Run tests
- `yarn test:watch` - Run tests in watch mode
- `yarn test:coverage` - Run tests with coverage report
- `yarn clean` - Remove dist directory
- `yarn lint` - Run ESLint to check code quality
- `yarn lint:fix` - Run ESLint and automatically fix issues
- `yarn format` - Format code with Prettier
- `yarn format:check` - Check if code is properly formatted

## 🔧 Configuration

- **TypeScript**: Configured for ES2022 with strict mode
- **Jest**: Configured for TypeScript testing with coverage
- **ESLint**: Configured with TypeScript support and Prettier integration
- **Prettier**: Configured with 2-space indentation and consistent formatting
- **Husky**: Pre-commit hooks for automatic linting and formatting
- **Build**: Outputs to `dist/` directory with source maps
- **Docker**: Multi-stage build with production optimization

## 📅 Scheduled Jobs

### MR Sync Job (`syncMr`)

Automatically syncs GitLab merge requests to Notion database on a weekly basis.

**Schedule**: Every Monday at 03:00 KST (UTC 18:00)

**Features**:

- Syncs merged MRs from the last 7 days by author across all projects or specific project
- Uses MR IID as unique key for upsert operations
- Maps MR properties to Notion database fields
- Handles errors gracefully with retry logic
- Provides detailed logging and metrics
- Supports both author-based filtering (all projects) and project-specific filtering

**Environment Variables Required**:

See the [Environment Variables](#-environment-variables) section above for detailed configuration.

Required variables:

- `GITLAB_HOST` - Your GitLab instance URL
- `GITLAB_TOKEN` - GitLab Personal Access Token
- `GITLAB_AUTHOR_USERNAME` - Your GitLab username
- `NOTION_TOKEN` - Notion Integration Token
- `NOTION_DB_ID` - Notion Database ID

Optional variables:

- `GITLAB_PROJECT_ID` - Specific project ID (defaults to all projects)
- `NOTION_UNIQUE_KEY_PROP` - Unique key property name (defaults to "MR IID")

**Manual Execution**:

```bash
# Build the project
yarn build

# Run the sync job
JOB=syncMr node dist/jobs/index.js
```

**GitHub Actions**:
The job runs automatically via GitHub Actions workflow (`.github/workflows/schedule.yml`) and can also be triggered manually from the Actions tab.

## 📝 License

This project is licensed under the MIT License.

## Usage

```ts
import { GitLabApiWrapper, gitLabApi, listMergedMrs } from './src/lib/gitlab';

// GitLab API 클라이언트 싱글턴 사용
const client = gitLabApi.getClient();

// 병합된 MR 목록 조회 (문자열 날짜)
const mergedMRs = await listMergedMrs({
  projectId: 'your-group/your-project',
  since: '2024-01-01T00:00:00Z',
  until: '2024-01-31T23:59:59Z',
  per_page: 50, // snake_case for GitLab API compatibility
});

// 병합된 MR 목록 조회 (Date 객체 - 자동 ISO 변환)
const mergedMRs2 = await gitLabApi.listMergedMrs({
  projectId: 'your-group/your-project',
  since: new Date('2024-01-01'),
  until: new Date('2024-01-31'),
});

// 페이징을 위한 이터레이터 사용 (대량 데이터 - 실제 페이징)
for await (const page of gitLabApi.listMergedMrsIterator(
  'your-group/your-project',
  {
    since: new Date('2024-01-01'),
    per_page: 50,
  }
)) {
  console.log(`Found ${page.length} merge requests in this page`);
}

// 커스텀 설정으로 인스턴스 생성 (DI 지원)
const customGitLab = GitLabApiWrapper.getInstance(
  {
    host: 'https://custom.gitlab.com',
    token: 'your-token',
    timeout: 30000, // 30초 타임아웃
  },
  {
    // 커스텀 로거
    warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta),
    error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta),
    info: (msg, meta) => console.info(`[INFO] ${msg}`, meta),
  }
);

// 날짜 범위 검증 자동 수행
try {
  await gitLabApi.listMergedMrs({
    projectId: 'test/project',
    since: '2024-01-31T00:00:00Z',
    until: '2024-01-01T00:00:00Z', // Error: since가 until보다 늦음
  });
} catch (error) {
  console.error(error.message); // "since" must be earlier than "until"
}
```

````

> 환경변수: `.env` 또는 시스템 환경에 아래를 지정해야 합니다.
>
> ```env
> GITLAB_HOST=https://gitlab.example.com
> GITLAB_TOKEN=your-access-token
> ```
````
