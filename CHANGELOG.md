# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Container Deployment**: Production-ready Docker containerization
  - Multi-stage Dockerfile with optimized Alpine Linux base (≤ 100 MB)
  - Job dispatcher ENTRYPOINT supporting multiple job types via `JOB` environment variable
  - Multi-platform builds (linux/amd64, linux/arm64) for broad compatibility
  - Health check implementation for container monitoring
- **Docker Compose**: Multiple execution profiles for different use cases
  - `prod` profile: Uses pre-built GHCR images for production deployment
  - `local` profile: Local build and execution for development testing
  - `custom` profile: Flexible job execution with environment variable override
  - Comprehensive environment variable mapping and documentation
- **CI/CD Pipeline Enhancement**: Comprehensive automation workflows
  - Enhanced GitHub Actions with Docker image testing and validation
  - Automated Docker image building and pushing to GitHub Container Registry (GHCR)
  - GitLab CI configuration for mirror repositories with identical functionality
  - Multi-stage testing including job dispatcher validation
- **Developer Experience**: Streamlined deployment and execution
  - One-command Docker execution: `docker run -e JOB=syncMr ghcr.io/owner/dev-log:latest`
  - Comprehensive README documentation for Docker usage patterns
  - Environment variable examples and configuration guides

### Added

- **Environment Variable Management**: Centralized configuration with `dotenv-flow`
  - `src/config.ts`: Centralized environment variable validation with Zod
  - `.env.example`: Comprehensive template with all required variables
  - Support for multiple environment files (`.env`, `.env.local`, `.env.development`, etc.)
  - Runtime validation with clear error messages for missing/invalid variables
- **Developer Experience**: Enhanced README with environment setup guide
  - Environment Variables section with detailed variable descriptions
  - Quick Start guide with step-by-step setup instructions
  - Project structure documentation updates
  - Local development workflow documentation

### Changed

- **GitLab API Migration**: Migrated from `@gitbeaker/node` to `@gitbeaker/rest`
  - Reduced bundle size and improved cold-start performance
  - Enhanced type safety with official GitLab API types
  - Updated API parameter naming from snake_case to camelCase
  - Improved test coverage with comprehensive edge case testing
  - Added logger integration tests and constructor configuration validation
- **Environment Configuration**: Centralized all environment variable handling
  - Removed duplicate environment loading from individual modules
  - Standardized environment validation across all components
  - Enhanced error messages for missing required variables

### Added

- **MR Sync Job**: Weekly GitLab MR to Notion database synchronization
  - `src/jobs/syncMrNotion.ts`: Main sync logic with upsert functionality
  - `src/jobs/index.ts`: Job registry for CLI execution
  - `.github/workflows/schedule.yml`: GitHub Actions workflow for weekly execution
  - `src/jobs/syncMrNotion.test.ts`: Comprehensive unit tests
- **Job System**: Modular job execution framework
  - Environment-based job selection via `JOB` environment variable
  - Configurable logging and error handling
  - Performance metrics and timing information
- **Notion Integration**: Enhanced Notion API wrapper features
  - Upsert functionality with unique key support
  - Rate limiting and retry logic
  - Comprehensive property mapping for MR data
- **GitLab Integration**: Enhanced GitLab API wrapper features
  - Date range filtering for merged MRs
  - Pagination support for large datasets
  - Error handling and validation

### Changed

- Updated project structure to include `jobs/` directory
- Enhanced README.md with Scheduled Jobs documentation
- Improved error handling and logging across all modules

### Technical Details

- **Performance**: MR sync job targets 3-second completion for 100 MRs
- **Reliability**: Maximum 3 retry attempts with exponential backoff
- **Monitoring**: Detailed logging with success/failure metrics
- **Flexibility**: Configurable date ranges, project IDs, and database mappings

## [1.0.0] - 2024-01-XX

### Added

- Initial project setup with TypeScript and Node.js 18
- GitLab API wrapper (`src/lib/gitlab.ts`)
- Notion API wrapper (`src/lib/notion.ts`)
- Docker support with multi-stage builds
- CI/CD pipeline with GitHub Actions
- Comprehensive testing setup with Jest
- Code quality tools (ESLint, Prettier, Husky)
- Development environment with Docker Compose

### Features

- GitLab merge request listing and filtering
- Notion database operations (create, update, query)
- Rate limiting and error handling
- Type-safe API interactions
- Comprehensive test coverage
