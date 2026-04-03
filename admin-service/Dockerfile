FROM node:20-alpine

WORKDIR /app

COPY admin-service/package*.json ./admin-service/
WORKDIR /app/admin-service
RUN npm install

WORKDIR /app
COPY . .

WORKDIR /app/admin-service

EXPOSE 4000

CMD ["npm", "start"]
