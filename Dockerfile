# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json tsconfig.json vite.config.ts ./

RUN npm install

COPY server ./server
COPY client ./client

# Build frontend + backend
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./

# Install only production dependencies
RUN npm install 

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "dist/index.js"]
