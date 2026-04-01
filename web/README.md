# web – Vue 3 Frontend

A blog-style SPA frontend built with **Vue 3 + TypeScript + Vite + Pinia + Vue Router**, designed to work with the Strapi backend in the parent directory.

## Tech Stack

- [Vue 3](https://vuejs.org/) + Composition API
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Pinia](https://pinia.vuejs.org/) (state management)
- [Vue Router 4](https://router.vuejs.org/)
- [Axios](https://axios-http.com/) (HTTP client)

## Getting Started

```bash
npm install
cp .env.example .env
npm run dev       # http://localhost:3000
```

Make sure the Strapi backend is running at `http://localhost:8080` (or configure `VITE_API_BASE` in `.env`).

## Pages / Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Home.vue | Post list with pagination |
| `/post/:id` | Post.vue | Post detail |
| `/page/:slug` | Page.vue | Static page |
| `/tag/:tag` | Tag.vue | Posts filtered by tag |
| `/category/:category` | Category.vue | Posts filtered by category |
| `/archive` | Archive.vue | All posts grouped by year |

## Build

```bash
npm run build   # output in dist/
npm run preview # preview the production build
```
