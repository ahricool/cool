import { reactive } from 'vue';
import { DEFAULT_OWNER_EMAIL, type Author, type Media } from '@cool/content';

type Owner = Author & { email: string };
export type AuthResult = { user: Owner; csrfToken: string };
export const ADMIN_EMAIL = DEFAULT_OWNER_EMAIL;
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
    // Nest sends an empty successful body when nullable About has no page yet.
    const data = await response
      .json()
      .catch(() => (response.ok ? null : { message: '请求失败' }));
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
        data?.message === 'A valid X-CSRF-Token is required' &&
        !(options.body instanceof ReadableStream) &&
        !options.signal?.aborted &&
        (await restoreSession())
      )
        continue;
      if (response.status === 401 && path !== '/admin/auth/login')
        clearSession();
      throw new Error(
        Array.isArray(data?.message)
          ? '请检查填写内容'
          : (data?.message ?? '请求失败'),
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
  if (!(error instanceof Error)) return '操作失败，请重试';
  const known: Record<string, string> = {
    'Invalid email or password': '邮箱或密码不正确',
    'Current password is incorrect': '当前密码不正确',
    Unauthorized: '请重新登录',
    'Administrator is already initialized': '管理员账户已初始化',
    'A valid X-CSRF-Token is required': '请求验证失败，请刷新后重试',
    'Untrusted request origin': '请求验证失败，请刷新后重试',
    'Cross-site request rejected': '请求验证失败，请刷新后重试',
    'Failed to fetch': '无法连接服务器，请稍后重试',
    'Post not found': '内容不存在',
    'A new translation requires a title': '请填写标题',
    'A new translation requires content': '请填写正文',
    'Not Found': '内容不存在',
    'Comments are closed': '评论已关闭',
    'Database unavailable': '服务暂时不可用',
    'Resource not found': '内容不存在',
    'Unique value already exists': '链接名称已存在，请使用其他标识',
    'Invalid related resource': '关联内容不存在，请刷新后重试',
    'Database operation failed': '操作失败，请重试',
    'An image file is required': '请选择图片文件',
    'File too large': '图片超过 8MB 大小限制',
    'Upload a valid JPEG, PNG, WebP or GIF image (up to 40 megapixels)':
      '这张图片无法使用，请换一张。',
    'This image is still referenced by content or settings':
      '图片仍被内容或设置引用，无法删除',
    'Unsupported content locale': '不支持的内容语言',
    'Too Many Requests': '请求过于频繁，请稍后重试',
    'Internal server error': '服务暂时不可用',
  };
  return known[error.message] ?? error.message;
}
