# Step 1: Build the React App
FROM node:18 AS build
WORKDIR /app

ARG REACT_APP_API_URL=http://devpigh.local:8082
ARG REACT_APP_UNSPLASH_ACCESS_KEY

# Set environment variables for the build
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_UNSPLASH_ACCESS_KEY=$REACT_APP_UNSPLASH_ACCESS_KEY

# Copy package files first for better caching
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# Build the app
RUN npm run build

# Step 2: Set up Node.js server with the React Build
FROM node:18-slim
WORKDIR /app

# Copy only necessary files for production
COPY package*.json ./
RUN npm install --production

# Copy built files and server
COPY --from=build /app/build ./build
COPY server.js .
COPY server ./server
COPY public ./public

# Create data directory for persistent storage
RUN mkdir -p /app/data/uploads/tracks /app/data/uploads/test /app/data/uploads/my-images

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=8082
ENV HOST=0.0.0.0

# Expose port and start server
EXPOSE 8082
CMD ["node", "server.js"]
