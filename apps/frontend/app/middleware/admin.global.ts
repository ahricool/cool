import { restoreSession, safeAdminNext } from '~/features/admin/api';
import { installAdminUi, leaveAdminUi } from '~/features/admin/install';

export default defineNuxtRouteMiddleware(async (to) => {
  if (!/^\/admin(?:\/|$)/.test(to.path)) {
    leaveAdminUi();
    return;
  }
  if (to.path.endsWith('/'))
    return navigateTo(
      { path: to.path.replace(/\/+$/, ''), query: to.query, hash: to.hash },
      { replace: true },
    );
  try {
    if (!(await installAdminUi(useNuxtApp().vueApp))) return;
  } catch {
    leaveAdminUi();
    throw createError({
      statusCode: 503,
      statusMessage: 'Admin UI failed to load',
      data: { adminUi: true },
      fatal: true,
    });
  }
  const authenticated = await restoreSession();
  if (to.path === '/admin/login') {
    if (authenticated) return navigateTo(safeAdminNext(to.query.next));
    return;
  }
  if (!authenticated)
    return navigateTo({ path: '/admin/login', query: { next: to.fullPath } });
});
