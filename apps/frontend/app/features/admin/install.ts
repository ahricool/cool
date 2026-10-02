import type { App } from 'vue';
let installation: Promise<void> | undefined;
/** Keep Element Plus registration out of the public site's initial JS path. */
export function installAdminUi(app: App) {
  installation ??= Promise.all([
    import('element-plus'),
    import('element-plus/es/locale/lang/zh-cn'),
  ]).then(([{ default: ElementPlus }, { default: locale }]) => {
    app.use(ElementPlus, { locale });
  });
  return installation;
}
