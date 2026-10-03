import { publicMessages } from './public';
import { adminSettingsMessages } from './admin-settings';
import { adminContentMessages } from './admin-content';
import { preferredLocale, type CoolLocale } from './locale';
const messages: Record<string, string> = {
  ...publicMessages,
  ...adminSettingsMessages,
  ...adminContentMessages,
};
export function translate(
  source: string,
  params: Record<string, string | number> = {},
  locale: CoolLocale = preferredLocale.value,
) {
  const text = locale === 'en' ? (messages[source] ?? source) : source;
  return text.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) =>
    String(params[key] ?? match),
  );
}
