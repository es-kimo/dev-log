# dev-log

Dev log sync automation project built with TypeScript and Node.js 18.

## 🚀 Quick Start

### Prerequisites

- Node.js 18 or higher
- Yarn package manager
- Docker (optional, for containerized deployment)

### Installation

```bash
yarn install
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

### Using Docker

```bash
# Build the Docker image
docker build -t dev-log .

# Run the container
docker run -p 3000:3000 dev-log

# Run in development mode with hot reload
docker-compose --profile dev up dev-log-dev

# Run production container
docker-compose up dev-log
```

### Docker Compose

```bash
# Start production service
docker-compose up

# Start development service with hot reload
docker-compose --profile dev up dev-log-dev

# Build and start services
docker-compose up --build

# Stop services
docker-compose down
```

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
│   └── *.test.ts          # Test files
├── dist/                  # Compiled output (generated)
├── .github/workflows/     # CI/CD workflows
│   ├── ci.yml            # CI pipeline
│   └── docker.yml        # Docker build & push
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

## 📝 License

This project is licensed under the MIT License.
