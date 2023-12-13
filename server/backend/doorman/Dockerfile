from node:alpine

workdir /app

RUN apk update && apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@7.4.1 --activate 

COPY ../../package.json /app/package.json

copy ../../* /app

workdir /app 

run ls || cat
run pnpm i


run pnpm run build

workdir /app/apps/backend/doorman

cmd ["ls"]



