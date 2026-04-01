FROM node:20-alpine

WORKDIR /app

# Install backend dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Install and build frontend (outputs to public/app via vite.config.ts)
COPY Web/package.json Web/package-lock.json* ./Web/
RUN cd Web && npm install
COPY Web ./Web
RUN mkdir -p /app/public/uploads
RUN cd Web && npm run build

# Copy backend source
COPY . .

ENV NODE_ENV=production
ENV STRAPI_TELEMETRY_DISABLED=true
RUN npm run build

EXPOSE 1337

CMD ["npm", "start"]
