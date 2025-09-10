# =========================
# Stage 1: Build Stage
# =========================
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Copy package.json and lockfile
COPY package*.json ./

# Install dependencies (both server & client)
RUN npm install

# Copy root configs
COPY tsconfig.json vite.config.ts ./

# Copy server & client code
COPY server ./server
COPY client ./client

# Build client
RUN npm --prefix client run build

# Bundle server with esbuild using npx
RUN npx esbuild server/index.ts --platform=node --bundle --format=esm --outdir=dist

# =========================
# Stage 2: Production Stage
# =========================
FROM node:20-alpine AS production

WORKDIR /app

# Copy production build from previous stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/client/dist ./dist/public

# Copy package.json for production dependencies
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Expose port
EXPOSE 5000

# Start server
CMD ["node", "dist/index.js"]
