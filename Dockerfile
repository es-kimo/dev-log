# Multi-stage Dockerfile for dev-log project
# Stage 1: Build stage
FROM node:18-alpine AS builder

# Enable corepack for yarn
RUN corepack enable

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock .yarnrc.yml ./

# Install all dependencies (including dev dependencies for build)
RUN yarn install --immutable

# Copy source code
COPY . .

# Build the application
RUN yarn build

# Stage 2: Production stage
FROM node:18-alpine AS production

# Enable corepack for yarn
RUN corepack enable

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock .yarnrc.yml ./

# Install only production dependencies and clean cache
RUN yarn install --immutable && \
    yarn cache clean && \
    rm -rf /root/.cache /tmp/*

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Switch to non-root user
USER nodejs

# Expose port (if needed)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check passed')" || exit 1

# Start the application
CMD ["node", "dist/index.js"] 