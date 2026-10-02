import { currentLocale, pathForLocale } from '../../i18n/locale';
/** Public and admin routes share one origin and one frontend build. */
export function publicUrl(path = '/') {
  return pathForLocale(path, currentLocale.value);
}
