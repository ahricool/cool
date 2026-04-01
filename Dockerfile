FROM node:20-alpine

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

# Copy backend source and pre-built frontend (web/dist must exist before docker build)
COPY . .

RUN npm run build

EXPOSE 1337

CMD ["npm", "start"]
