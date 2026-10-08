/** Palette is a preference within a theme, independent from the site's theme ID. */
export function useCoolTheme(surface: 'blog' | 'admin' = 'blog') {
  const legacy = useCookie<string>('cool_theme');
  const cookie = useCookie<string>(
    surface === 'admin' ? 'cool_admin_theme' : 'cool_theme',
    {
      default: () => legacy.value ?? 'light',
      path: '/',
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60,
    },
  );
  const dark = useState(`cool-${surface}-dark`, () => cookie.value === 'dark');
  watch(dark, (value) => {
    cookie.value = value ? 'dark' : 'light';
  });
  return dark;
}
