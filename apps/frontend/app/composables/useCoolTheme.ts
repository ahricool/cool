/** One explicit theme preference across the reading and editorial surfaces. */
export function useCoolTheme() {
  const cookie = useCookie<string>('cool_theme', {
    default: () => 'light',
    path: '/',
    sameSite: 'lax',
    maxAge: 365 * 24 * 60 * 60,
  });
  const dark = useState('cool-dark', () => cookie.value === 'dark');
  watch(dark, (value) => (cookie.value = value ? 'dark' : 'light'));
  return dark;
}
