FROM node:8.11-alpine

WORKDIR /app

ADD . /app

RUN npm install --only=production

EXPOSE 8881

ENTRYPOINT ["node", "server.js"]
