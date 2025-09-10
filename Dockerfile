# ===========================
# Stage 1: Build client
# ===========================
FROM node:20-alpine AS client-build

WORKDIR /app

# Copy client files
COPY client/package*.json client/tsconfig.json client/vite.config.ts ./client/
COPY client/src ./client/src
COPY client/index.html ./client/

WORKDIR /app/client

# Install dependencies
RUN npm install

# Build the client
RUN npm run build

# ===========================
# Stage 2: Build server
# ===========================
FROM node:20-alpine AS server-build

WORKDIR /app

# Copy server files
COPY package*.json tsconfig.json server/ ./server/
COPY shared ./shared
COPY drizzle.config.ts .
COPY face_embeddings.pkl .
COPY dataset ./dataset
COPY attached_assets ./attached_assets
COPY output ./output

# Install server dependencies
RUN npm install --production

# Copy client build from previous stage
COPY --from=client-build /app/client/dist ./server/public

WORKDIR /app/server

# Build TypeScript server (optional if using tsx)
RUN npm run build

# ===========================
# Stage 3: Run
# ===========================
FROM node:20-alpine AS runtime

WORKDIR /app

# Copy server built files + client
COPY --from=server-build /app/server ./server
COPY --from=server-build /app/server/public ./server/public
COPY package*.json ./

# Install production dependencies
RUN npm install --production

# Expose port
EXPOSE 5000

# Set environment variables (optional: can also use Railway or EC2 env vars)
ENV NODE_ENV=production
ENV PORT=5000

# Start the server
CMD ["node", "server/index.js"]
