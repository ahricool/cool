import { reactive, watch, type App } from 'vue';
import { preferredLocale } from '../../i18n/locale';
let installation: Promise<void> | undefined;
let feedback: typeof import('./feedback') | undefined;
let navigation = 0;
/** Keep Element Plus and its locale data out of the public site's initial JS path. */
export function installAdminUi(app: App) {
  const current = ++navigation;
  installation ??= Promise.all([
    import('element-plus'),
    import('element-plus/es/locale/lang/zh-cn'),
    import('element-plus/es/locale/lang/en'),
    import('~/assets/admin/index.css'),
    import('./feedback'),
  ]).then(
    ([
      { default: ElementPlus },
      { default: zh },
      { default: en },
      ,
      services,
    ]) => {
      feedback = services;
      const config = reactive({
        locale: preferredLocale.value === 'zh' ? zh : en,
      });
      app.use(ElementPlus, config);
      watch(preferredLocale, (value) => {
        config.locale = value === 'zh' ? zh : en;
      });
    },
  );
  return installation.then(() => {
    if (current === navigation) feedback!.enableAdminFeedback();
  });
}

export function leaveAdminUi() {
  navigation++;
  feedback?.disposeAdminFeedback();
}
