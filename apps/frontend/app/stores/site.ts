import { defineStore } from 'pinia';
import { resolveSiteTheme } from '~/themes/registry';
import {
  defaultSite,
  defaultHomepage,
  normalizeFontSize,
  type Site,
  type Homepage,
} from '@cool/content';
export const useSiteStore = defineStore('site', () => {
  const { locale } = useCoolI18n();
  const api = useApi();
  const site = ref<Site>({ ...defaultSite });
  const homepage = ref<Homepage>({ ...defaultHomepage });
  const loaded = ref(false);
  const initialized = ref(false);
  const loading = ref(false);
  const failed = ref(false);
  let loadedLocale = '';
  let loadingLocale = '';
  let requestId = 0;
  let pending: Promise<boolean> | undefined;
  let lastResult = false;
  /** True means the latest requested configuration was applied; failures retain the last data. */
  function load(force = false): Promise<boolean> {
    const requestedLocale = locale.value;
    if (!force && loaded.value && loadedLocale === requestedLocale) {
      if (pending && loadingLocale !== requestedLocale) {
        requestId++;
        pending = undefined;
        loading.value = false;
      }
      failed.value = false;
      lastResult = true;
      return Promise.resolve(true);
    }
    if (!force && pending && loadingLocale === requestedLocale) return pending;
    if (force) loadedLocale = '';
    const id = ++requestId;
    loadingLocale = requestedLocale;
    loading.value = true;
    failed.value = false;
    const current = () => id === requestId && requestedLocale === locale.value;
    // A superseded caller follows the newer request's outcome, rather than
    // reporting success for a response that never became the visible state.
    const latestResult = () =>
      pending !== attempt ? (pending ?? lastResult) : false;
    const attempt: Promise<boolean> = Promise.resolve().then(async () => {
      try {
        const [s, c] = await Promise.all([
          api<Site>('/public/site'),
          api<{ homepage: Homepage }>('/public/config'),
        ]);
        // A slower response from a previous language must not replace the current one.
        if (!current()) return latestResult();
        site.value = {
          ...s,
          appearance: {
            ...defaultSite.appearance,
            ...s.appearance,
            themeId: resolveSiteTheme(s.appearance?.themeId).id,
            fontSize: normalizeFontSize(s.appearance?.fontSize),
          },
        };
        homepage.value = c.homepage;
        loadedLocale = requestedLocale;
        loaded.value = true;
        initialized.value = true;
        failed.value = false;
        lastResult = true;
        return true;
      } catch {
        if (!current()) return latestResult();
        failed.value = true;
        initialized.value = true;
        lastResult = false;
        return false;
      } finally {
        if (id === requestId) {
          pending = undefined;
          loading.value = false;
        }
      }
    });
    pending = attempt;
    return pending;
  }
  watch(locale, () => {
    void load();
  });
  return { site, homepage, loaded, initialized, loading, failed, load };
});
