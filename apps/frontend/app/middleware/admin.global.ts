import { restoreSession, safeAdminNext } from '~/features/admin/api';
import { installAdminUi } from '~/features/admin/install';

export default defineNuxtRouteMiddleware(async (to) => {
  if (!/^\/admin(?:\/|$)/.test(to.path)) return;
  if (to.path.endsWith('/'))
    return navigateTo(
      { path: to.path.replace(/\/+$/, ''), query: to.query, hash: to.hash },
      { replace: true },
    );
  await installAdminUi(useNuxtApp().vueApp);
  const authenticated = await restoreSession();
  if (to.path === '/admin/login') {
    if (authenticated) return navigateTo(safeAdminNext(to.query.next));
    return;
  }
  if (!authenticated)
    return navigateTo({ path: '/admin/login', query: { next: to.fullPath } });
});
