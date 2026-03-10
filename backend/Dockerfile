ARG NODE_VERSION=22.8.0
FROM node:${NODE_VERSION}-alpine
ENV NODE_ENV=production
WORKDIR /usr/src/app
RUN apk add --update --no-cache python3 build-base gcc && ln -sf /usr/bin/python3 /usr/bin/python
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=false
COPY . .
RUN yarn build
EXPOSE 3100
CMD yarn start