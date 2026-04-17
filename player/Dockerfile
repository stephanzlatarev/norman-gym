FROM node:20

WORKDIR /app/brain
COPY brain/package.json ./package.json
RUN npm install --omit=dev
COPY brain/src ./src

WORKDIR /app/bank
COPY bank/package.json ./package.json
RUN npm install --omit=dev
COPY bank/src ./src

WORKDIR /app/player
COPY player/package.json ./package.json
RUN npm install --omit=dev
COPY player/src ./src

CMD [ "npm", "start" ]
