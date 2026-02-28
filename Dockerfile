FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

# Copy backend source and pre-built frontend (Web/dist must exist before docker build)
COPY . .

RUN npm run build

EXPOSE 1337

CMD ["npm", "start"]
