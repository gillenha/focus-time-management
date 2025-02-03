# Step 1: Build the React App
FROM node:18 AS build
WORKDIR /app

# Add cache busting
ARG CACHE_BUST=1
ARG REACT_APP_API_URL

# Copy package files first for better caching
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# Build the app
RUN REACT_APP_API_URL=$REACT_APP_API_URL npm run build

# Step 2: Set up Node.js server with the React Build
FROM node:18
WORKDIR /app

# Copy only necessary files for production
COPY package*.json ./
RUN npm install --production

# Copy built files and server
COPY --from=build /app/build ./build
COPY server.js .
COPY server ./server
COPY utils ./utils
COPY public ./public
COPY mp3s ./mp3s

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port and start server
EXPOSE 8080
CMD ["node", "server.js"]
