import { defineStore } from 'pinia';
import {
  defaultSite,
  defaultHomepage,
  type Site,
  type Homepage,
} from '@cool/content';
export const useSiteStore = defineStore('site', () => {
  const { locale } = useCoolI18n();
  const api = useApi();
  const site = ref<Site>({ ...defaultSite });
  const homepage = ref<Homepage>({ ...defaultHomepage });
  const loaded = ref(false);
  const failed = ref(false);
  let loadedLocale = '';
  let loadingLocale = '';
  let requestId = 0;
  let pending: Promise<void> | undefined;
  function load(): Promise<void> {
    const requestedLocale = locale.value;
    if (loaded.value && loadedLocale === requestedLocale)
      return Promise.resolve();
    if (pending && loadingLocale === requestedLocale) return pending;
    const id = ++requestId;
    loadingLocale = requestedLocale;
    failed.value = false;
    pending = (async () => {
      try {
        const [s, c] = await Promise.all([
          api<Site>('/public/site'),
          api<{ homepage: Homepage }>('/public/config'),
        ]);
        // A slower response from a previous language must not replace the current one.
        if (id !== requestId || requestedLocale !== locale.value) return;
        site.value = s;
        homepage.value = c.homepage;
        loadedLocale = requestedLocale;
        loaded.value = true;
        failed.value = false;
      } catch {
        if (id === requestId && requestedLocale === locale.value)
          failed.value = true;
      } finally {
        if (id === requestId) pending = undefined;
      }
    })();
    return pending;
  }
  watch(locale, () => {
    loaded.value = false;
    void load();
  });
  return { site, homepage, loaded, failed, load };
});
