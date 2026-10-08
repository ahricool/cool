/** Shared nonvisual reader preference; each theme declares its cookie namespace. */
export function useReaderPalette(cookieName: string, initial?: string) {
  const cookie = useCookie<string | null>(cookieName, {
    default: () => initial ?? null,
    path: '/',
    sameSite: 'lax',
    maxAge: 365 * 24 * 60 * 60,
  });
  const preference = useState<string | null>(
    `reader-palette:${cookieName}`,
    () => cookie.value ?? initial ?? null,
  );
  watch(preference, (value) => {
    cookie.value = value;
  });
  return preference;
}
