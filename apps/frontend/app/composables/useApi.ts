import { localizePublicRequest } from '~/i18n/locale';
export function useApi() {
  const config = useRuntimeConfig();
  const { locale } = useCoolI18n();
  return $fetch.create({
    baseURL: config.public.apiBase,
    onRequest(context) {
      if (typeof context.request === 'string')
        context.request = localizePublicRequest(context.request, locale.value);
    },
  });
}
