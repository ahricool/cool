FROM node:24-alpine

WORKDIR /app

# Install build tools and image processing deps so sharp can compile if it
# cannot download a prebuilt libvips binary inside the container.
RUN apk add --no-cache \
    libc6-compat \
    vips-dev \
    build-base \
    python3

COPY package.json package-lock.json* ./
RUN npm install

# Copy backend and frontend source, then build the frontend into public/app
COPY . .

RUN mkdir -p public/uploads .tmp

RUN npm run build:all

ENV NODE_ENV=production
ENV STRAPI_TELEMETRY_DISABLED=true

EXPOSE 8080

CMD ["npm", "start"]
