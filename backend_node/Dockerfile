FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENV PORT=4001
EXPOSE 4001

CMD ["npx","nodemon","-L", "server.js"]