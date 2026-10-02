import { reactive } from 'vue';
import type { Author, Media } from '@cms/content';
export const session = reactive({
  token: '',
  owner: null as (Author & { email: string }) | null,
});
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (session.token) headers.set('Authorization', `Bearer ${session.token}`);
  if (options.body && !(options.body instanceof FormData))
    headers.set('Content-Type', 'application/json');
  const response = await fetch(`/api/v1${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({ message: '请求失败' }));
  if (!response.ok) {
    if (response.status === 401 && path !== '/admin/auth/login') {
      session.token = '';
      session.owner = null;
    }
    throw new Error(
      Array.isArray(data.message)
        ? data.message.join('；')
        : (data.message ?? `请求失败 (${response.status})`),
    );
  }
  return data as T;
}
export async function upload(file: File) {
  const body = new FormData();
  body.append('file', file);
  return api<Media>('/admin/media/upload', { method: 'POST', body });
}
export function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败，请重试';
}
