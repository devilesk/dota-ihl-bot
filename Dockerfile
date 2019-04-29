FROM node:10

WORKDIR /usr/app

COPY package.json .

RUN apt-get update && apt-get install -y postgresql-client subversion && npm install -g npm@6.9.0 && npm config set unsafe-perm true && npm install

COPY . .

ENTRYPOINT ["./scripts/docker-entrypoint.sh"]

CMD [ "npm", "start" ]