// Public and admin share one origin; reader language stays in its cookie.
export const site = (
  process.env.E2E_BLOG_URL ?? 'http://localhost:3001'
).replace(/\/$/, '');
export const blog = site;
export const admin = process.env.E2E_ADMIN_URL ?? site + '/admin';
export const api = process.env.E2E_API_URL ?? 'http://127.0.0.1:3000/api/v1';
