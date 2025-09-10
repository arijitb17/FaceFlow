# Stage 1: Build Stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json tsconfig.json vite.config.ts ./

# Install all dependencies
RUN npm install

# Copy server and client code
COPY server ./server
COPY client ./client

# Build frontend + backend
RUN npm run build

# Stage 2: Production Stage
FROM node:20-alpine

WORKDIR /app

# Copy built dist from build stage
COPY --from=build /app/dist ./dist

# Copy package.json to install production deps
COPY --from=build /app/package*.json ./

# Install only production dependencies
RUN npm install 

# Expose your app port
EXPOSE 5000

# Start the server
CMD ["npm", "run", "start"]
