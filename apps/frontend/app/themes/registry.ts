/** Themes may override visual tokens only. Reader and authored settings stay separate. */
type ThemeToken =
  | '--sakura-accent'
  | '--sakura-accent-strong'
  | '--sakura-accent-light-3'
  | '--sakura-accent-light-5'
  | '--sakura-accent-light-7'
  | '--sakura-accent-light-8'
  | '--sakura-button-primary'
  | '--sakura-button-hover'
  | '--sakura-button-active'
  | '--sakura-button-disabled'
  | '--sakura-button-foreground'
  | '--sakura-danger'
  | '--sakura-danger-solid'
  | '--sakura-text'
  | '--sakura-text-regular'
  | '--sakura-muted'
  | '--sakura-heading'
  | '--sakura-surface'
  | '--sakura-soft'
  | '--sakura-border'
  | '--sakura-control-border'
  | '--sakura-border-light'
  | '--sakura-fill-light'
  | '--sakura-page'
  | '--sakura-header-background'
  | '--sakura-shadow'
  | '--sakura-button-shadow'
  | '--sakura-button-hover-shadow'
  | '--sakura-tag-shadow'
  | '--sakura-toast-shadow';

type ThemePalette = Readonly<Partial<Record<ThemeToken, string>>>;
interface SiteTheme {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly preview: boolean;
  readonly light: ThemePalette;
  readonly dark: ThemePalette;
}

// Empty palettes deliberately preserve every current tokens.css value and rule.
const defaultTheme: SiteTheme = {
  id: 'default',
  label: '默认主题',
  description: '保留现有梦桜风格。',
  preview: false,
  light: {},
  dark: {},
};

export const siteThemes: readonly SiteTheme[] = [
  defaultTheme,
  {
    id: 'soft-preview',
    label: '柔灰（预览）',
    description: '柔灰表面，保留樱粉点缀。',
    preview: true,
    light: {
      '--sakura-page': '#f5f5f6',
      '--sakura-soft': '#f1f1f3',
      '--sakura-fill-light': '#f5f5f6',
      '--sakura-header-background': '#f5f5f6ef',
      '--sakura-shadow': '0 8px 32px #3032360c',
    },
    dark: {
      '--sakura-page': '#1b1c1f',
      '--sakura-surface': '#26272b',
      '--sakura-soft': '#2d2e33',
      '--sakura-fill-light': '#2d2e33',
      '--sakura-header-background': '#26272bf2',
      '--sakura-shadow': '0 5px 24px #00000026',
    },
  },
];

export function resolveSiteTheme(value: unknown): SiteTheme {
  return siteThemes.find((theme) => theme.id === value) ?? defaultTheme;
}

/** Always replace the full override string so switching back leaves no stale tokens. */
export function siteThemeCss(value: unknown, dark: boolean): string {
  const theme = resolveSiteTheme(value);
  return Object.entries(dark ? theme.dark : theme.light)
    .map(([token, color]) => `${token}: ${color};`)
    .join(' ');
}
