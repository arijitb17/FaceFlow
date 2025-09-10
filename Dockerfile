# Stage 1: Build Stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy root package files and tsconfig/vite config
COPY package*.json tsconfig.json vite.config.ts ./

# Install all dependencies (dev + prod) for building
RUN npm install

# Copy server files
COPY server ./server

# Copy client files
COPY client ./client

# Build client
RUN npm run build --workspace client || npm --prefix client run build

# Bundle server for production
RUN npm run build

# Stage 2: Production Stage
FROM node:20-alpine

WORKDIR /app

# Copy only necessary files from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Expose server port
EXPOSE 3000

# Start the server
CMD ["npm", "run", "start"]
