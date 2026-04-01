# CMS – Strapi Backend + Vue 3 Frontend

A complete CMS system consisting of:
- **Strapi 5** backend (this directory) — provides content APIs for posts, pages, tags, categories and site configuration
- **Vue 3 frontend** (`web/` directory) — a blog-style SPA that consumes the Strapi APIs

---

## 项目结构 / Project Structure

```
.
├── config/                   # Strapi configuration
│   ├── database.js           # SQLite (default)
│   ├── middlewares.js        # CORS and other middleware
│   ├── plugins.js
│   └── server.js
├── src/
│   └── api/
│       ├── post/             # Blog post collection type
│       ├── page/             # Static page collection type
│       ├── tag/              # Tag collection type
│       ├── category/         # Category collection type
│       └── site-config/      # Site configuration single type
├── web/                      # Vue 3 frontend (SPA)
│   ├── src/
│   │   ├── services/api.ts   # API client (Strapi adapter)
│   │   ├── stores/           # Pinia stores
│   │   ├── pages/            # Home, Post, Page, Tag, Category, Archive
│   │   └── components/       # Layout, Header, Footer, Sidebar
│   ├── vite.config.ts        # Dev proxy: /api → http://localhost:8080
│   └── package.json
├── .env.example
└── package.json
```

---

## 快速开始 / Quick Start

### 1. Strapi 后端 / Backend

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and fill in APP_KEYS, JWT_SECRET, etc.

# Start development server (hot-reload)
npm run develop
```

The Strapi server starts at **http://localhost:8080**.

- Admin panel: http://localhost:8080/admin
- API: http://localhost:8080/api/...

#### First-time setup (Strapi Admin)

1. Open http://localhost:8080/admin and create an admin account.
2. Go to **Settings → Users & Permissions → Roles → Public** and enable the following permissions so the frontend can read data without authentication:
   - `Post`: `find`, `findBySlug`
   - `Page`: `find`, `findBySlug`
   - `Tag`: `find`, `findBySlug`
   - `Category`: `find`, `findBySlug`
   - `Site-config`: `find`
3. (Optional) Go to **Content Manager** to create sample Posts, Tags, Categories, Pages, and Site Config.
4. (Optional) Create pages with slugs like `about` or `links` if you want them to appear in the frontend navigation.

### 2. Vue 3 前端 / Frontend

```bash
cd web
npm install
cp .env.example .env

# Start dev server (proxies /api to http://localhost:8080)
npm run dev
```

The frontend starts at **http://localhost:3000**.

---

## API 端点 / API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/posts` | List published posts (supports pagination, sorting, populate) |
| GET | `/api/posts/:slug` | Get post by slug-compatible document |
| GET | `/api/posts/slug/:slug` | Get post by slug |
| GET | `/api/pages` | List published pages |
| GET | `/api/pages/:slug` | Get page by slug-compatible document |
| GET | `/api/pages/slug/:slug` | Get page by slug |
| GET | `/api/tags` | List all tags |
| GET | `/api/tags/by-slug/:slug` | Get tag by slug |
| GET | `/api/categories` | List all categories |
| GET | `/api/categories/by-slug/:slug` | Get category by slug |
| GET | `/api/site-config` | Get global site configuration |

> Filter posts by tag: `GET /api/posts?filters[tags][slug][$eq]=vue-js&populate=tags,categories,author`
> Filter posts by category: `GET /api/posts?filters[categories][slug][$eq]=technology&populate=tags,categories,author`
> Search posts: `GET /api/posts?filters[$or][0][title][$containsi]=vue&filters[$or][1][content][$containsi]=vue`

---

## Content Types

| Type | Kind | Fields |
|------|------|--------|
| Post | Collection | title, slug, excerpt, content, cover, views, likes, author (→User), tags (↔Tag), categories (↔Category) |
| Page | Collection | title, slug, content, cover |
| Tag | Collection | name, slug, posts (↔Post) |
| Category | Collection | name, slug, posts (↔Post) |
| Site Config | Single | title, subtitle, description, logo, favicon, url |

---

## 生产部署 / Production

No nginx required. The Strapi backend serves both the API and the built Vue SPA on the same port.

```bash
# 1. Build the Vue frontend (outputs to public/app/)
npm run build:frontend

# 2. Build the Strapi admin panel
npm run build

# 3. Start the production server (serves API + frontend on http://localhost:8080)
npm run start
```

The single server at **http://localhost:8080** now handles:
- `http://localhost:8080/` → Vue SPA (frontend)
- `http://localhost:8080/api/...` → Strapi REST API
- `http://localhost:8080/admin` → Strapi admin panel

Set `FRONTEND_URL` in `.env` to your production domain for CORS.

For Docker builds, use `npm run build:all` so the frontend SPA is generated before the Strapi image is built.

## Runtime requirements

- Node.js `>=24`
- npm `>=6`
