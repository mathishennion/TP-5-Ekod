FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

COPY server.js ./

EXPOSE 3000
USER node
CMD ["node", "server.js"]