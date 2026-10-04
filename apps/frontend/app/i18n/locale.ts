import { ref } from 'vue';
export type CoolLocale = 'zh' | 'en';
export const LOCALE_COOKIE = 'cool_locale';
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
export function initialLocale(): CoolLocale {
  if (typeof window === 'undefined') return 'en';
  const cookie = document.cookie
    .split('; ')
    .find((item) => item.startsWith(`${LOCALE_COOKIE}=`))
    ?.split('=')[1];
  const locale = resolveLocale(
    cookie,
    navigator.languages?.length ? navigator.languages : [navigator.language],
  );
  persistLocale(locale);
  return locale;
}
export function persistLocale(locale: CoolLocale) {
  if (typeof document === 'undefined') return;
  document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
}
export const preferredLocale = ref<CoolLocale>(initialLocale());
export const contentLang = (locale: unknown) =>
  locale === 'zh' ? 'zh-CN' : 'en';
export function publicPath(path: string) {
  return `/${path.replace(/^\/+/, '')}`;
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
