import { ref } from 'vue';
export type CoolLocale = 'zh' | 'en';
export const LOCALE_STORAGE_KEY = 'cool.locale';
export function isLocale(value: unknown): value is CoolLocale {
  return value === 'zh' || value === 'en';
}
export function detectLocale(languages: readonly string[]): CoolLocale {
  for (const language of languages) {
    const code = language.toLowerCase();
    if (code === 'zh' || /^zh-(cn|sg|hans)(-|$)/.test(code)) return 'zh';
    if (/^en(-|$)/.test(code)) return 'en';
  }
  return 'en';
}
export function resolveLocale(
  saved: unknown,
  languages: readonly string[],
): CoolLocale {
  return isLocale(saved) ? saved : detectLocale(languages);
}
export function effectiveLocale(
  routeLocale: unknown,
  preference: CoolLocale,
): CoolLocale {
  return isLocale(routeLocale) ? routeLocale : preference;
}
export function initialLocale(): CoolLocale {
  if (typeof window === 'undefined') return 'en';
  let saved: unknown;
  try {
    saved = localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    /* Private browsers can deny storage; switching remains available. */
  }
  return resolveLocale(
    saved,
    navigator.languages?.length ? navigator.languages : [navigator.language],
  );
}
export const preferredLocale = ref<CoolLocale>(initialLocale());
// Explicit public URLs affect the current surface, not the saved preference.
export const currentLocale = ref<CoolLocale>(preferredLocale.value);
export const contentLang = (locale: unknown) =>
  locale === 'zh' ? 'zh-CN' : 'en';
export function pathForLocale(path: string, locale: CoolLocale) {
  const clean = `/${path.replace(/^\/+/, '')}`.replace(
    /^\/(zh|en)(?=\/|$)/,
    '',
  );
  return `/${locale}${clean === '/' ? '' : clean}`;
}
/** Idempotent so retries keep the locale captured by the original request. */
export function localizePublicRequest(path: string, locale: CoolLocale) {
  return path.replace(
    /^\/public(?!\/(?:zh|en)(?:\/|$))(?=\/|$)/,
    `/public/${locale}`,
  );
}

export const SITE_TIME_ZONE = 'Asia/Shanghai';
export function formatCoolDate(
  value: string | number | Date | null | undefined,
  locale: CoolLocale,
  options?: Intl.DateTimeFormatOptions,
) {
  if (value === null || value === undefined || value === '') return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(contentLang(locale), {
    ...(options ?? { year: 'numeric', month: '2-digit', day: '2-digit' }),
    timeZone: SITE_TIME_ZONE,
  }).format(date);
}
