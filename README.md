# Strapi Hello World

A minimal [Strapi](https://strapi.io/) Hello World project using SQLite.

## 快速开始 / Quick Start

### 安装依赖 / Install dependencies

```bash
npm install
```

### 配置环境变量 / Configure environment

```bash
cp .env.example .env
```

Edit `.env` and update the secret keys as needed.

### 启动开发服务器 / Start development server

```bash
npm run develop
```

The server will start at `http://localhost:1337`.

- Admin panel: `http://localhost:1337/admin`
- Hello World API: `http://localhost:1337/api/hello`

### Hello World API

Once the server is running, visit:

```
GET http://localhost:1337/api/hello
```

Response:

```json
{ "message": "Hello World!" }
```

## 项目结构 / Project Structure

```
.
├── config/
│   ├── database.js       # SQLite database configuration
│   ├── middlewares.js    # Middleware configuration
│   ├── plugins.js        # Plugin configuration
│   └── server.js         # Server configuration
├── src/
│   ├── api/
│   │   └── hello/
│   │       ├── controllers/hello.js  # Hello World controller
│   │       ├── routes/hello.js       # Route: GET /api/hello
│   │       └── services/hello.js     # Service layer
│   └── index.js          # App entry point
├── .env.example          # Example environment variables
└── package.json
```