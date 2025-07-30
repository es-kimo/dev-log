# dev-log

Dev log sync automation project built with TypeScript and Node.js 18.

## 🚀 Quick Start

### Prerequisites

- Node.js 18 or higher
- Yarn package manager

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
```

## 📁 Project Structure

```
dev-log/
├── src/           # Source code
│   ├── index.ts   # Main entry point
│   └── *.test.ts  # Test files
├── dist/          # Compiled output (generated)
├── tsconfig.json  # TypeScript configuration
├── jest.config.js # Jest configuration
└── package.json   # Project dependencies and scripts
```

## 🛠️ Available Scripts

- `yarn build` - Compile TypeScript to JavaScript
- `yarn start` - Run the compiled application
- `yarn dev` - Run the application in development mode with ts-node
- `yarn test` - Run tests
- `yarn test:watch` - Run tests in watch mode
- `yarn test:coverage` - Run tests with coverage report
- `yarn clean` - Remove dist directory

## 🔧 Configuration

- **TypeScript**: Configured for ES2022 with strict mode
- **Jest**: Configured for TypeScript testing with coverage
- **Build**: Outputs to `dist/` directory with source maps

## 📝 License

This project is licensed under the MIT License.
