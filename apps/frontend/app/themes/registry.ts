import { sakuraAppearance } from './sakura/appearance';
import { uryAppearance } from './ury/appearance';
import type { ColorMode, SiteTheme } from './types';

// Literal import paths are build-time declarations. No runtime theme code or paths.
const defaultTheme = {
  id: 'default',
  appearance: sakuraAppearance,
  directory: 'sakura',
  label: 'sakura',
  description: '保留现有梦桜风格。',
  entry: () => import('./sakura/Entry.vue'),
  pages: {
    home: () => import('./sakura/pages/Home.vue'),
    post: () => import('./sakura/pages/Post.vue'),
    page: () => import('./sakura/pages/Page.vue'),
    search: () => import('./sakura/pages/Search.vue'),
    about: () => import('./sakura/pages/About.vue'),
    tags: () => import('./sakura/pages/Tags.vue'),
  },
  error: () => import('./sakura/pages/Error.vue'),
  colorModes: ['light', 'dark'],
  assets: { icon: '/favicon.svg', touchIcon: '/apple-touch-icon.png' },
} as const satisfies SiteTheme;
export const siteThemes = [
  defaultTheme,
  {
    id: 'ury',
    appearance: uryAppearance,
    directory: 'ury',
    label: 'ury',
    description: '以阅读为中心的侧栏布局、衬线文字与留白。',
    entry: () => import('./ury/Entry.vue'),
    pages: {
      home: () => import('./ury/pages/Home.vue'),
      post: () => import('./ury/pages/Post.vue'),
      page: () => import('./ury/pages/Page.vue'),
      search: () => import('./ury/pages/Search.vue'),
      about: () => import('./ury/pages/About.vue'),
      tags: () => import('./ury/pages/Tags.vue'),
    },
    error: () => import('./ury/pages/Error.vue'),
    colorModes: ['light', 'dark'],
    assets: { icon: '/themes/ury/mark.svg' },
  },
] as const satisfies readonly SiteTheme[];
export type SiteThemeId = (typeof siteThemes)[number]['id'];
export function resolveSiteTheme(value: unknown): SiteTheme {
  return (
    siteThemes.find(
      (theme) => theme.id === (value === 'sakura' ? 'default' : value),
    ) ?? defaultTheme
  );
}

export function resolveThemeColorMode(
  theme: Pick<SiteTheme, 'colorModes'>,
  preferred: ColorMode,
): ColorMode {
  return theme.colorModes.includes(preferred) ? preferred : theme.colorModes[0];
}
