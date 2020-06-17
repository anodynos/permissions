FROM node:12.16 AS dev

WORKDIR /srv

ADD package.json ./
ADD package-lock.json ./
RUN npm install

ADD . .

FROM dev AS build
RUN npm run build

### PRODUCTION ###

FROM nginx:1.15 AS prod
COPY --from=build /srv/dist/docs /usr/share/nginx/html
ADD docker/ /
CMD ["/command.sh"]

EXPOSE 80
