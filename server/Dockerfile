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

ARG DATABASE_URL

arg QUEUE_CONNECTION_URL

env QUEUE_CONNECTION_URL $QUEUE_CONNECTION_URL

ENV DATABASE_URL $DATABASE_URL

env PORT 4000

expose 4000

cmd ["pnpm", "run", "start:prod"]

