# Step 1: Build the React App
FROM node:14 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Step 2: Set up Node.js server with the React Build
FROM node:14
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY --from=build /app/build ./build
COPY server.js .
COPY mp3s ./mp3s
COPY public ./public

# Cloud Run will set PORT environment variable
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]
