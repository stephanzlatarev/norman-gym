#########################################################
FROM node:20-alpine as build

WORKDIR /app

COPY ./package.json .
RUN npm install

COPY ./public ./public
COPY ./src ./src

RUN npm run build

#########################################################
FROM nginx:1-alpine

COPY --from=build /app/build /usr/share/nginx/html/
