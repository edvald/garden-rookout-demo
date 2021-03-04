FROM node:12-alpine

RUN mkdir -p /app
WORKDIR /app

RUN npm install -g nodemon
COPY package.json package-lock.json /app/
RUN npm install \
  && npm ls \
  && npm cache clean --force
COPY . /app

ENV PORT 80
EXPOSE 80

CMD ["node", "server.js"]
