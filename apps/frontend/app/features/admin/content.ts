import { currentLocale, type CmsLocale } from '../../i18n/locale';
export function displayTranslation<T extends { locale: CmsLocale }>(
  item: { translations: T[] },
  locale = currentLocale.value,
) {
  return (
    item.translations.find((translation) => translation.locale === locale) ??
    item.translations[0]
  );
}
