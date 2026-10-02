export function useApi() {
  const config = useRuntimeConfig();
  return $fetch.create({
    baseURL: import.meta.server ? config.apiBase : config.public.apiBase,
  });
}
