FROM node:20-alpine AS base

WORKDIR /app

RUN apk add --no-cache dumb-init curl

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
COPY scripts ./scripts
COPY data ./data

ENV NODE_ENV=production
EXPOSE 3000

# Default CMD — override per service in docker-compose (api / worker / scheduler)
CMD ["dumb-init", "node", "src/bin/api/api.js"]
