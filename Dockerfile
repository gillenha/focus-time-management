# Step 1: Build the React App
FROM node:18 AS build
WORKDIR /app

# Add cache busting
ARG CACHE_BUST=1
ARG REACT_APP_API_URL
ARG REACT_APP_UNSPLASH_ACCESS_KEY
ARG REACT_APP_GOOGLE_CLIENT_ID
ARG REACT_APP_BUILD_SHA

# Set environment variables for the build
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_UNSPLASH_ACCESS_KEY=$REACT_APP_UNSPLASH_ACCESS_KEY
ENV REACT_APP_GOOGLE_CLIENT_ID=$REACT_APP_GOOGLE_CLIENT_ID
ENV REACT_APP_BUILD_SHA=$REACT_APP_BUILD_SHA

# Copy package files first for better caching
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# Build the app
RUN REACT_APP_API_URL=$REACT_APP_API_URL REACT_APP_UNSPLASH_ACCESS_KEY=$REACT_APP_UNSPLASH_ACCESS_KEY REACT_APP_GOOGLE_CLIENT_ID=$REACT_APP_GOOGLE_CLIENT_ID REACT_APP_BUILD_SHA=$REACT_APP_BUILD_SHA npm run build

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

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port and start server
EXPOSE 8080
CMD ["node", "server.js"]
