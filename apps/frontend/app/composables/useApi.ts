export function useApi() {
  const config = useRuntimeConfig();
  const { locale } = useCoolI18n();
  return $fetch.create({
    baseURL: config.public.apiBase,
    onRequest({ options }) {
      options.headers.set('Accept-Language', locale.value);
    },
  });
}
