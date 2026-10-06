import { defaultAppearance } from '@cool/content';
import { resolveSiteTheme, siteThemeCss } from '~/themes/registry';

/** Both Nuxt roots apply the same appearance, including full-screen errors. */
export function useSiteAppearanceHead() {
  const route = useRoute();
  const dark = useCoolTheme();
  const pinia = useNuxtApp().$pinia;
  // A plugin initialization error may reach error.vue before Pinia is available.
  const store = pinia ? useSiteStore(pinia) : undefined;
  const appearance = computed(
    () => store?.site.appearance ?? defaultAppearance,
  );
  const { locale, contentLang } = useCoolI18n();
  const isAdmin = computed(() => /^\/admin(?:\/|$)/.test(route.path));
  onMounted(() => {
    // Share the store's pending request; don't repeatedly retry a failed API
    // while switching between the app and the error root.
    if (store && !store.loaded && !store.failed) void store.load();
  });
  useHead(() => ({
    htmlAttrs: {
      class: dark.value ? 'dark' : '',
      lang: contentLang(locale.value),
      'data-surface': isAdmin.value ? 'admin' : 'blog',
      'data-font': store?.loaded ? appearance.value.font : undefined,
      'data-site-theme': resolveSiteTheme(appearance.value.themeId).id,
      style: `${siteThemeCss(appearance.value.themeId, dark.value)} --sakura-font-scale: ${appearance.value.fontSize / 100}`,
    },
    bodyAttrs: { class: isAdmin.value ? 'admin-ui' : 'sakura-ui' },
  }));
  return { appearance, dark, isAdmin };
}
