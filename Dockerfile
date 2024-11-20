FROM node:20.10.0-slim AS build

WORKDIR /usr/src/app

# Installing git
RUN apt install && apt update && apt-get install git -y

# Installing typescript for transpiling
RUN npm install -g typescript@5.5.4

# Copying package and package lock
COPY package*.json ./

# Installing libraries (SSH mount type to install private git repo: db_service,
# SSH socket or key file passed in build command)
RUN --mount=type=ssh \
npm ci

# Copying rest of the code
COPY . .

# Building the project
RUN npm run build

FROM node:20.10.0-slim

WORKDIR /usr/src/app

# Node user (Instead of using the root user)
USER node

ENV NODE_ENV=production

# Copying dist folder and node modules from build stage
COPY --from=build usr/src/app/dist ./dist
COPY --from=build usr/src/app/node_modules ./node_modules

# Move to dist folder
WORKDIR /usr/src/app/dist

# Documentation: Exposing port 8003
EXPOSE 8003

# Running the node server
CMD ["node", "index.js"]