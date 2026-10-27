import { normalizeUryAppearance } from '@cool/content';

/** Ury never consumes or changes Sakura/Admin preferences. */
export function useUryAppearance() {
  const pinia = useNuxtApp().$pinia;
  const store = pinia ? useSiteStore(pinia) : undefined;
  const settings = computed(() =>
    normalizeUryAppearance(store?.site.appearance.ury),
  );
  return { settings };
}
