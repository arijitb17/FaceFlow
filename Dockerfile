# Stage 1: Build Stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy root package files and tsconfig/vite config
COPY package*.json tsconfig.json vite.config.ts ./

# Install all dependencies (dev + prod) for building
RUN npm install

# Copy server and client code
COPY server ./server
COPY client ./client

# Build client using Vite
RUN npm run build

# Bundle server using esbuild
RUN esbuild server/index.ts --platform=node --bundle --format=esm --outdir=dist

# Stage 2: Production Stage
FROM node:20-alpine

WORKDIR /app

# Copy built server from build stage
COPY --from=build /app/dist ./dist

# Copy package.json for production dependencies
COPY --from=build /app/package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Expose server port
EXPOSE 3000

# Start the server
CMD ["npm", "run", "start"]
