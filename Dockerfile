# ============================================================
# Stage 1: Builder
# Task: Install dependencies and compile TypeScript to JavaScript
# ============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first to leverage Docker layer caching
# (This layer won't be rebuilt unless package.json/package-lock.json changes)
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including devDependencies for TS build)
RUN npm ci

# Copy the entire TypeScript source code
COPY src/ ./src/

# Compile TypeScript → JavaScript to the /app/dist folder
RUN npm run build

# ============================================================
# Stage 2: Production Runner
# Task: Only contains files needed to run the server
# Result: Much smaller image size without devDependencies or TS source
# ============================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Copy only package.json to install production dependencies
COPY package*.json ./

# Install only production dependencies (no typescript, tsx, etc.)
RUN npm ci --omit=dev

# Copy the compiled output from the builder stage
COPY --from=builder /app/dist ./dist

# Port that will be exposed by the container
# Adjust with the PORT environment variable value
EXPOSE 3000

# Default environment variables
# These values can be overridden when running the container with --env or docker-compose
ENV PORT=3000
ENV MONGO_URI=mongodb://localhost:27017

# Command to run the server (using the compiled JS file)
CMD ["node", "dist/index.js"]
