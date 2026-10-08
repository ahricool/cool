import { normalizeUryAppearance, type UryAppearance } from '@cool/content';

/** Ury never consumes or changes Sakura/Admin preferences. */
export function useUryAppearance() {
  const pinia = useNuxtApp().$pinia;
  const store = pinia ? useSiteStore(pinia) : undefined;
  const settings = computed(() =>
    normalizeUryAppearance(store?.site.appearance.ury),
  );
  const cookie = useCookie<string | null>('cool_ury_palette', {
    path: '/',
    sameSite: 'lax',
    maxAge: 365 * 24 * 60 * 60,
  });
  const preference = useState<string | null>(
    'ury-reader-palette',
    () => cookie.value ?? null,
  );
  watch(preference, (value) => {
    cookie.value = value;
  });
  const palette = computed<UryAppearance['palette']>(() =>
    preference.value === 'light' ||
    preference.value === 'sepia' ||
    preference.value === 'dark'
      ? preference.value
      : settings.value.palette,
  );
  return { settings, palette, preference };
}
