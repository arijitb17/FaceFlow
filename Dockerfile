# =========================
# Stage 1: Build client
# =========================
FROM node:20-alpine AS client-build

# Set working directory
WORKDIR /app

# Copy client package.json and Vite config
COPY client/package*.json client/vite.config.ts ./client/

# Copy root tsconfig.json (needed for Vite/TypeScript)
COPY tsconfig.json ./tsconfig.json

# Install client dependencies
RUN cd client && npm install

# Copy client source code
COPY client/src ./client/src
COPY client/index.html ./client/

# Build client
RUN cd client && npm run build

# =========================
# Stage 2: Build server
# =========================
FROM node:20-alpine AS server-build

WORKDIR /app

# Copy server package.json and root tsconfig.json
COPY package*.json tsconfig.json ./ 
COPY server ./server

# Install server dependencies
RUN npm install

# Copy client build from previous stage
COPY --from=client-build /app/client/dist ./server/public

# =========================
# Stage 3: Run server
# =========================
FROM node:20-alpine

WORKDIR /app

# Copy server build stage
COPY --from=server-build /app .

# Expose port
EXPOSE 5000

# Environment variables can also be passed via Railway / EC2
ENV NODE_ENV=production

# Start server
CMD ["node", "server/index.js"]
