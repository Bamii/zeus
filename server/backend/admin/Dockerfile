FROM node:18

# Create app directory
WORKDIR /usr/src/app

COPY package*.json ./

run npm i -g pnpm
RUN pnpm install
# If you are building your code for production
# RUN npm ci --omit=dev

# Bundle app source
COPY . .

EXPOSE 4000
CMD [ "node", "dist/index.js" ]

