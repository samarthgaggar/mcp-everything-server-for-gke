# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files from current directory (not parent)
COPY package*.json tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY index.ts ./

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache dumb-init curl

# Create non-root user
RUN addgroup -g 1001 -S mcpuser && \
    adduser -S -D -H -u 1001 -s /sbin/nologin -G mcpuser mcpuser

WORKDIR /app

# Copy built application and dependencies
COPY --from=build /app/package*.json ./
COPY --from=build /app/dist ./dist

# Install only production dependencies
RUN npm install --omit=dev && npm cache clean --force

# Change ownership to non-root user
RUN chown -R mcpuser:mcpuser /app

USER mcpuser

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV MCP_TRANSPORT=http

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]