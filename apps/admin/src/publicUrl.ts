/** Blog and Admin share an origin in production; Vite uses a separate dev port. */
export function publicUrl(path = '/') {
  const origin =
    import.meta.env.VITE_BLOG_URL ||
    (import.meta.env.DEV ? 'http://localhost:3001' : '');
  return `${origin.replace(/\/$/, '')}/${path.replace(/^\/+/, '')}`;
}
