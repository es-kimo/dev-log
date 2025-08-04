# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **GitLab API Migration**: Migrated from `@gitbeaker/node` to `@gitbeaker/rest`
  - Reduced bundle size and improved cold-start performance
  - Enhanced type safety with official GitLab API types
  - Updated API parameter naming from snake_case to camelCase
  - Improved test coverage with comprehensive edge case testing
  - Added logger integration tests and constructor configuration validation

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
