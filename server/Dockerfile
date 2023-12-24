from node:18-alpine3.17 as base

workdir /app

run npm install -g pnpm

copy . /app/

workdir /app

run pnpm i --force ts-node -w

run npx pnpm i --force

workdir /app/shared/database

run npx prisma generate

workdir /app

run npx pnpm run build

arg QUEUE_CONNECTION_URL

env QUEUE_CONNECTION_URL $QUEUE_CONNECTION_URL

arg UNKEY_APIKEY

env UNKEY_APIKEY $UNKEY_APIKEY

arg UNKEY_ROOTKEY

env UNKEY_ROOTKEY $UNKEY_ROOTKEY

ARG DATABASE_URL

ENV DATABASE_URL $DATABASE_URL

ENV NEW_RELIC_NO_CONFIG_FILE=true

env PORT 4000

expose 4000

cmd ["pnpm", "run", "start:prod"]

