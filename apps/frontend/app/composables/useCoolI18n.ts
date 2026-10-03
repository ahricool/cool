import {
  preferredLocale,
  persistLocale,
  formatCoolDate,
  contentLang,
  isLocale,
  publicPath,
} from '~/i18n/locale';
import { translate } from '~/i18n/messages';
export function useCoolI18n() {
  const locale = preferredLocale;
  function t(source: string, params?: Record<string, string | number>) {
    return translate(source, params, locale.value);
  }
  function setLocale(value: string) {
    if (!isLocale(value)) return;
    persistLocale(value);
    locale.value = value;
  }
  function formatDate(
    value: string | number | Date | null | undefined,
    options?: Intl.DateTimeFormatOptions,
  ) {
    return formatCoolDate(value, locale.value, options);
  }
  return {
    locale,
    setLocale,
    t,
    routePath: publicPath,
    formatDate,
    contentLang,
  };
}
