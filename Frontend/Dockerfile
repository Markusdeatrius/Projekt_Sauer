FROM node:25

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

EXPOSE 8081

CMD ["node", "frontend-server.js"]
