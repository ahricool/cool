import { preferredLocale, type CoolLocale } from '../../i18n/locale';
export function displayTranslation<T extends { locale: CoolLocale }>(
  item: { translations: T[] },
  locale = preferredLocale.value,
) {
  return (
    item.translations.find((translation) => translation.locale === locale) ??
    item.translations[0]
  );
}
