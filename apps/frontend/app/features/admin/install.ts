import { reactive, watch, type App } from 'vue';
import { preferredLocale } from '../../i18n/locale';
let installation: Promise<void> | undefined;
let feedback: typeof import('./feedback') | undefined;
let navigation = 0;
let installed = false;
let cssFailure: Error | undefined;
/** Keep Element Plus and its locale data out of the public site's initial JS path. */
export function installAdminUi(app: App) {
  const current = ++navigation;
  if (!installation) {
    // Nuxt may prevent Vite's CSS preload rejection. A successful JS import
    // must not turn that into an unstyled Admin installation.
    const onPreloadError = (event: Event) => {
      const error = (event as Event & { payload?: unknown }).payload;
      if (
        error instanceof Error &&
        error.message.startsWith('Unable to preload CSS')
      )
        cssFailure = error;
    };
    if (typeof window !== 'undefined')
      window.addEventListener('vite:preloadError', onPreloadError);
    installation = Promise.all([
      import('element-plus'),
      import('element-plus/es/locale/lang/zh-cn'),
      import('element-plus/es/locale/lang/en'),
      import('~/assets/admin/index.css'),
      import('./feedback'),
    ])
      .then(
        ([
          { default: ElementPlus },
          { default: zh },
          { default: en },
          ,
          services,
        ]) => {
          // Vite can cache a failed CSS preload; only a full reload reliably
          // clears it. The independent error root exposes that recovery action.
          if (cssFailure) throw cssFailure;
          if (!installed) {
            const config = reactive({
              locale: preferredLocale.value === 'zh' ? zh : en,
            });
            app.use(ElementPlus, config);
            installed = true;
            watch(preferredLocale, (value) => {
              config.locale = value === 'zh' ? zh : en;
            });
          }
          feedback = services;
        },
      )
      .catch((error) => {
        installation = undefined;
        throw error;
      })
      .finally(() => {
        if (typeof window !== 'undefined')
          window.removeEventListener('vite:preloadError', onPreloadError);
      });
  }
  return installation.then(
    () => {
      if (current !== navigation) return false;
      feedback!.enableAdminFeedback();
      return true;
    },
    (error) => {
      if (current !== navigation) return false;
      throw error;
    },
  );
}

export function leaveAdminUi() {
  navigation++;
  feedback?.disposeAdminFeedback();
}
