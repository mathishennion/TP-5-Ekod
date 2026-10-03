FROM node:22-alpine
WORKDIR /app

# L'API est à la racine : on installe ses dépendances (express, cors, pg, joi)
COPY package*.json ./
RUN npm ci --omit=dev

COPY server.js ./

EXPOSE 3000
USER node
CMD ["node", "server.js"]
