import { normalizeUryAppearance } from '@cool/content';
import { uryAppearance } from '../appearance';
import { defaultAppearance } from '@cool/content';

/** Ury never consumes or changes Sakura/Admin preferences. */
export function useUryAppearance() {
  const pinia = useNuxtApp().$pinia;
  const store = pinia ? useSiteStore(pinia) : undefined;
  const settings = computed(() =>
    normalizeUryAppearance(store?.site.appearance.ury),
  );
  const preference = useReaderPalette(uryAppearance.readerCookie);
  const palette = computed(
    () =>
      uryAppearance.resolve(
        store?.site.appearance ?? defaultAppearance,
        preference.value,
      ).palette,
  );
  return { settings, palette, preference };
}
