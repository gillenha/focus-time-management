# Step 1: Build the React App
FROM node:18 AS build
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# Set production environment
ENV NODE_ENV=production
ENV REACT_APP_API_URL=https://focus-music-app-368754647823.us-central1.run.app

# Build the app
RUN npm run build

# Step 2: Set up Node.js server with the React Build
FROM node:18
WORKDIR /app

# Copy only necessary files for production
COPY package*.json ./
RUN npm install --production

# Copy built files and server
COPY --from=build /app/build ./build
COPY server.js .
COPY public ./public

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port and start server
EXPOSE 8080
CMD ["node", "server.js"]
