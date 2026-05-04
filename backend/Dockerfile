FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY api ./api
COPY config ./config
COPY constants ./constants
COPY database ./database
COPY docs ./docs
COPY errors ./errors
COPY middleware ./middleware
COPY services ./services
COPY src ./src
COPY types ./types
COPY utils ./utils
COPY validators ./validators
COPY server.example.ts ./

RUN npm run build
RUN mkdir -p dist/database/migrations dist/docs \
  && cp database/migrations/*.sql dist/database/migrations/ \
  && cp docs/openapi.yml dist/docs/openapi.yml

FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["sh", "-c", "node dist/database/migrations/runMigrations.js && node dist/src/server.js"]
