import {
  currentLocale,
  preferredLocale,
  effectiveLocale,
  formatCoolDate,
  contentLang,
  isLocale,
  LOCALE_STORAGE_KEY,
  pathForLocale,
  type CoolLocale,
} from '~/i18n/locale';
import { translate } from '~/i18n/messages';
export function useCoolI18n() {
  const route = useRoute();
  const locale = computed<CoolLocale>(() =>
    effectiveLocale(route.params.locale, preferredLocale.value),
  );
  watch(
    locale,
    (value) => {
      currentLocale.value = value;
    },
    { immediate: true },
  );
  function t(source: string, params?: Record<string, string | number>) {
    return translate(source, params, locale.value);
  }
  async function setLocale(value: string) {
    if (!isLocale(value)) return;
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, value);
    } catch {
      /* Continue without persistence. */
    }
    preferredLocale.value = value;
    if (!/^\/admin(?:\/|$)/.test(route.path)) {
      await navigateTo({
        path: pathForLocale(route.path, value),
        query: route.query,
        hash: route.hash,
      });
    }
  }
  function localePath(path = '/') {
    return pathForLocale(path, locale.value);
  }
  function formatDate(
    value: string | number | Date | null | undefined,
    options?: Intl.DateTimeFormatOptions,
  ) {
    return formatCoolDate(value, locale.value, options);
  }
  return { locale, setLocale, t, localePath, formatDate, contentLang };
}
