/** Public and admin routes share one origin and one frontend build. */
export function publicUrl(path = '/') {
  return `/${path.replace(/^\/+/, '')}`;
}
