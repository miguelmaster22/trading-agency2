
FROM node:22.16-slim 

WORKDIR /app

COPY . .

RUN npm run install:all && npm run build

CMD ["npm", "start"]
    