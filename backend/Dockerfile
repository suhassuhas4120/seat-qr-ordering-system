# Production Dockerfile for Fastify + Socket.io Real-Time Backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace configurations
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm ci

# Copy source files
COPY shared/ ./shared/
COPY backend/ ./backend/

# Build shared and backend
RUN npm run build --workspace=@seat-order/shared
RUN npm run build --workspace=@seat-order/backend

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/shared/package*.json ./shared/
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/backend/package*.json ./backend/
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 4000

CMD ["node", "backend/dist/server.js"]
