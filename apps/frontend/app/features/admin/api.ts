import { reactive } from 'vue';
import type { Author, Media } from '@cms/content';

type Owner = Author & { email: string };
export type AuthResult = { user: Owner; csrfToken: string };
export const ADMIN_EMAIL = 'whoreahri@gmail.com';
export const session = reactive({
  owner: null as Owner | null,
  csrfToken: '',
});

export function clearSession() {
  session.owner = null;
  session.csrfToken = '';
}
export function acceptSession(result: AuthResult) {
  // The session credential stays in its HttpOnly cookie. Only the CSRF value
  // and public owner profile are kept in memory; neither survives in storage.
  session.owner = result.user;
  session.csrfToken = result.csrfToken;
}
export function safeAdminNext(value: unknown) {
  const next = typeof value === 'string' ? value : '';
  return /^\/admin(?:\/|$)/.test(next) &&
    !next.startsWith('/admin/login') &&
    !next.includes('\\')
    ? next
    : '/admin';
}
let restoring: Promise<boolean> | undefined;
export function restoreSession(): Promise<boolean> {
  restoring ??= api<AuthResult>('/admin/auth/session')
    .then((result) => {
      acceptSession(result);
      return true;
    })
    .catch(() => {
      clearSession();
      return false;
    })
    .finally(() => {
      restoring = undefined;
    });
  return restoring;
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(method);
  for (let attempt = 0; ; attempt++) {
    const headers = new Headers(options.headers);
    if (mutation && session.csrfToken)
      headers.set('X-CSRF-Token', session.csrfToken);
    if (options.body && !(options.body instanceof FormData))
      headers.set('Content-Type', 'application/json');
    const response = await fetch(`/api/v1${path}`, {
      ...options,
      credentials: 'include',
      headers,
    });
    const data = await response.json().catch(() => ({ message: '请求失败' }));
    if (!response.ok) {
      // Another tab can replace the shared HttpOnly cookie while this tab keeps
      // its editor draft and the previous session's CSRF value. This exact guard
      // rejection happens before a mutation runs, so replay it only once with
      // the fresh session. Other forbidden responses must never be retried.
      if (
        attempt === 0 &&
        mutation &&
        path.startsWith('/admin/') &&
        response.status === 403 &&
        data.message === 'A valid X-CSRF-Token is required' &&
        !(options.body instanceof ReadableStream) &&
        !options.signal?.aborted &&
        (await restoreSession())
      )
        continue;
      if (response.status === 401 && path !== '/admin/auth/login')
        clearSession();
      throw new Error(
        Array.isArray(data.message)
          ? data.message.join('；')
          : (data.message ?? `请求失败 (${response.status})`),
      );
    }
    return data as T;
  }
}

export async function upload(file: File) {
  const body = new FormData();
  body.append('file', file);
  return api<Media>('/admin/media/upload', { method: 'POST', body });
}
export function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败，请重试';
}
