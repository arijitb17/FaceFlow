# ================================
# Build stage
# ================================
FROM node:20 AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy all source files
COPY . .

# Build frontend
RUN npm run build:frontend

# Build backend
RUN npx esbuild server/index.ts \
    --platform=node \
    --bundle \
    --format=esm \
    --outdir=dist \
    --packages=external \
    --loader:.ts=ts \
    --resolve-extensions=.ts,.js

# ================================
# Runtime stage
# ================================
FROM node:20

# Install Python
RUN apt-get update && apt-get install -y \
    python3 python3-pip python3-venv \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy production dependencies
COPY package*.json ./
RUN npm ci 

# Copy built backend + frontend
COPY --from=builder /app/dist ./dist

# Copy static dataset and assets
COPY dataset ./dataset
COPY attached_assets/recognize_1755929175698.py ./recognize.py
COPY attached_assets/train_1755929175701.py ./train.py
COPY face_embeddings.pkl ./face_embeddings.pkl

# Install Python dependencies in virtualenv
RUN python3 -m venv /opt/venv \
 && /opt/venv/bin/pip install --no-cache-dir \
    insightface opencv-python-headless pillow numpy matplotlib seaborn scikit-learn imgaug

ENV PATH="/opt/venv/bin:$PATH"
ENV NODE_ENV=production
ENV PORT=5000

# Expose port 5000
EXPOSE 5000

# Run backend (serves frontend statically)
CMD ["node", "dist/index.js"]
