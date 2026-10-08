/** Palette is a preference within a theme, independent from the site's theme ID. */
export function useCoolTheme(surface: 'blog' | 'admin' = 'blog') {
  const legacy = useCookie<string>('cool_theme');
  const preference = useReaderPalette(
    surface === 'admin' ? 'cool_admin_theme' : 'cool_theme',
    legacy.value ?? 'light',
  );
  const dark = computed({
    get: () => preference.value === 'dark',
    set: (value: boolean) => {
      preference.value = value ? 'dark' : 'light';
    },
  });
  return dark;
}
import type { ComputedRef } from 'vue';
import type { SiteTheme } from '../themes/types';
import { resolveSiteTheme, resolveThemeColorMode } from '../themes/registry';

/** Preserve the reader's preference while exposing only the active theme's supported mode. */
export function usePublicColorMode(
  theme: ComputedRef<Pick<SiteTheme, 'colorModes'>> = computed(() =>
    resolveSiteTheme(useSiteStore().site.appearance.themeId),
  ),
) {
  const preferred = useCoolTheme();
  const canToggle = computed(() => theme.value.colorModes.length > 1);
  const dark = computed({
    get: () =>
      resolveThemeColorMode(theme.value, preferred.value ? 'dark' : 'light') ===
      'dark',
    set: (value: boolean) => {
      if (canToggle.value) preferred.value = value;
    },
  });
  return { dark, canToggle };
}
