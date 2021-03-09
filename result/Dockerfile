FROM node:12-alpine

RUN mkdir -p /app
WORKDIR /app

RUN npm install -g nodemon
COPY package.json package-lock.json /app/
RUN npm install \
  && npm ls \
  && npm cache clean --force
COPY . /app

CMD ["node", "server.js"]
