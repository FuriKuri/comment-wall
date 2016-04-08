FROM node:argon

RUN mkdir -p /usr/src/app
COPY package.json /usr/src/app
COPY index.html /usr/src/app
COPY index.js /usr/src/app
COPY config.js /usr/src/app

WORKDIR /usr/src/app

RUN npm install

EXPOSE 3000

CMD [ "npm", "start" ]
