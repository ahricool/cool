import { defaultAppearance } from '@cool/content';
import { resolveSiteTheme } from '~/themes/registry';

/** Both Nuxt roots establish the active surface; CSS remains isolated after SPA navigation. */
export function useSiteAppearanceHead() {
  const route = useRoute();
  const adminDark = useCoolTheme('admin');
  const pinia = useNuxtApp().$pinia;
  const store = pinia ? useSiteStore(pinia) : undefined;
  const appearance = computed(
    () => store?.site.appearance ?? defaultAppearance,
  );
  const { locale, contentLang } = useCoolI18n();
  const isAdmin = computed(() => /^\/admin(?:\/|$)/.test(route.path));
  const theme = computed(() => resolveSiteTheme(appearance.value.themeId));
  const { dark: blogDark } = usePublicColorMode(theme);
  const dark = computed(() =>
    isAdmin.value ? adminDark.value : blogDark.value,
  );
  onMounted(() => {
    if (store && !store.loaded && !store.failed) void store.load();
  });
  useHead(() => ({
    htmlAttrs: {
      class: dark.value ? 'dark' : '',
      lang: contentLang(locale.value),
      'data-surface': isAdmin.value ? 'admin' : 'blog',
      'data-font': store?.loaded ? appearance.value.font : undefined,
      'data-site-theme': isAdmin.value ? undefined : theme.value.id,
      style: `--site-font-scale: ${appearance.value.fontSize / 100}`,
    },
    bodyAttrs: {
      class: isAdmin.value ? 'admin-ui' : `${theme.value.directory}-ui`,
    },
    link: [
      {
        key: 'site-icon',
        rel: 'icon',
        type: 'image/svg+xml',
        href: isAdmin.value ? '/favicon.svg' : theme.value.assets.icon,
      },
      ...(isAdmin.value || theme.value.assets.touchIcon
        ? [
            {
              key: 'touch-icon',
              rel: 'apple-touch-icon' as const,
              sizes: '180x180',
              href: isAdmin.value
                ? '/apple-touch-icon.png'
                : (theme.value.assets.touchIcon ?? '/apple-touch-icon.png'),
            },
          ]
        : []),
    ],
  }));
  const ready = computed(() => !store || store.initialized);
  return { appearance, dark, isAdmin, ready };
}
