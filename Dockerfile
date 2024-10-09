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
RUN npm install
COPY --from=build /app/build ./build
COPY . .
EXPOSE 8080
CMD ["node", "server.js"]
