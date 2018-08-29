FROM node:8.11-alpine

WORKDIR /app

ADD server.js /app/server.js
ADD package.json /app/package.json
# For easy debugging, you can copy other locally-generated pieces as well, but
# I don't recommend doing that for production images.
#ADD autocard.json /app/autocard.json
#ADD node_modules /app/node_modules

RUN npm install --only=production

EXPOSE 8881
ENV DEBUG autocard:info
ENTRYPOINT ["node", "server.js"]
