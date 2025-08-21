# syntax=docker/dockerfile:1
ARG NODE_VERSION=22.14.0-alpine
FROM node:${NODE_VERSION}
WORKDIR /usr/src/app
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm npm ci || npm install --omit=dev
COPY . .
CMD ["npm", "start"] 