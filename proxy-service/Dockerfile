FROM node:20-alpine

WORKDIR /app

COPY proxy-service/package*.json ./proxy-service/
WORKDIR /app/proxy-service
RUN npm install

WORKDIR /app
COPY . .

WORKDIR /app/proxy-service

EXPOSE 3000

CMD ["npm", "start"]
