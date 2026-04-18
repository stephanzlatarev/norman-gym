FROM node:20

WORKDIR /app/bank
COPY bank/package.json ./package.json
RUN npm install --omit=dev
COPY bank/src ./src

WORKDIR /app/api
COPY api/package.json ./package.json
RUN npm install --omit=dev
COPY api/src ./src

CMD [ "npm", "start" ]
 