FROM node:18

WORKDIR /usr/src/app

COPY package*.json ./

run npm i -g pnpm
RUN pnpm install

# RUN npm ci --omit=dev

# Bundle app source
COPY . .

EXPOSE 4000
CMD [ "node", "dist/index.js" ]

